/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from "@nestjs/common";
import {
  CreateMaintenanceRecordDto,
  ExportMaintenanceIds,
  MaintenanceListDto,
  UpdateMaintenanceRecordDto,
} from "./dto/create-maintenance-record.dto";
import { CustomError, TypeExceptions } from "src/common/helpers/exceptions";
import mongoose, { FilterQuery, Model } from "mongoose";
import {
  MaintenanceDocument,
  MaintenanceRecordsLogs,
} from "src/common/schema/maintenanceLogs.schema";
import { InjectModel } from "@nestjs/mongoose";
import { ImageUploadService } from "../image-upload/image-upload.service";
import { TABLE_NAMES } from "src/common/constants/table-name.constant";
import { Workbook } from "exceljs";
import * as fs from "fs";
import * as dayjs from "dayjs";
import { RESPONSE_ERROR, USER } from "src/common/constants/response.constant";
import { User } from "src/common/schema/user.schema";
import { LogRecordHelper } from "src/common/helpers/logs/log.helper";
import {
  AppEnvironment,
  Role,
  UploadFolderEnum,
} from "src/common/constants/enum.constant";
import { Company } from "src/common/schema/company.schema";
import { generateTimelineDescription } from "src/common/helpers/timelineDescriptions/description.generator";
import { Timeline } from "src/common/schema/timeline.schema";
import { Chiller } from "src/common/schema/chiller.schema";

@Injectable()
export class MaintenanceRecordsService {
  constructor(
    @InjectModel(MaintenanceRecordsLogs.name)
    private readonly maintenanceModel: Model<MaintenanceRecordsLogs>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
    @InjectModel(Timeline.name) private readonly timelineModel: Model<Timeline>,
    @InjectModel(Chiller.name) private readonly chillerModel: Model<Chiller>,
    private imageService: ImageUploadService,
  ) {}

  async create(
    createMaintenanceRecordDto: CreateMaintenanceRecordDto,
    loggedInUserId: string,
  ) {
    try {
      const loggedInUser = await this.userModel.findById({
        _id: new mongoose.Types.ObjectId(loggedInUserId),
      });

      if (!loggedInUser) {
        throw TypeExceptions.NotFoundCommonFunction(
          RESPONSE_ERROR.USER_NOT_FOUND,
        );
      }

      const chiller = await this.chillerModel.findById({
        _id: new mongoose.Types.ObjectId(createMaintenanceRecordDto.chillerId),
      });

      if (!chiller) {
        throw TypeExceptions.NotFoundCommonFunction(
          RESPONSE_ERROR.CHILLER_NOT_FOUND,
        );
      }

      const formattedReadingDate = LogRecordHelper.convertToUTCString(
        createMaintenanceRecordDto.maintenanceDate,
        createMaintenanceRecordDto.maintenanceTime,
        createMaintenanceRecordDto.maintenanceTimeZone,
      );

      const logPayload = {
        ...createMaintenanceRecordDto,
        maintenanceDate: formattedReadingDate,
        createdBy: loggedInUser._id,
        updatedBy: loggedInUser._id,
        chillerId: new mongoose.Types.ObjectId(
          createMaintenanceRecordDto.chillerId,
        ),
        companyId: new mongoose.Types.ObjectId(
          createMaintenanceRecordDto.companyId,
        ),
        facilityId: new mongoose.Types.ObjectId(
          createMaintenanceRecordDto.facilityId,
        ),
      };
      console.log("✌️logPayload --->", logPayload);

      if (logPayload.fileName) {
        const newFileKey =
          UploadFolderEnum.MAINTENANCE_FILES + "/" + logPayload.fileName;
        await this.imageService.moveTempToRealFolder(newFileKey);
      }

      const log: any = await this.maintenanceModel.create(logPayload);
      console.log("✌️log --->", log.createdAt);

      const title = "New Maintenance Entry";

      const params = {
        updatedBy: `${loggedInUser?.firstName} ${loggedInUser.lastName}`,
        maintenanceLogId: log._id,
        logCreatedAt: log.createdAt,
        entryNotes: log.comments,
      };

      const description = generateTimelineDescription(title, params);

      await this.timelineModel.create({
        chillerId: chiller._id,
        title,
        description,
        updatedBy: new mongoose.Types.ObjectId(loggedInUser._id),
      });

      return log;
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  async findAll(req: Request, body: MaintenanceListDto) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        sort_by,
        sort_order = "DESC",
        companyId,
        facilityId,
        chillerId,
      } = body;

      const user = await this.userModel.findById(req["user"]["_id"]);

      if (!user) {
        throw TypeExceptions.BadRequestCommonFunction(USER.USER_NOT_FOUND);
      }

      const skip = (page - 1) * limit;
      const sortOrder = sort_order === "ASC" ? 1 : -1;

      const matchObj: FilterQuery<MaintenanceDocument> = { isDeleted: false };

      // 🧠 Role-based access control
      if ([Role.ADMIN, Role.SUB_ADMIN].includes(req["user"]["role"])) {
        // No restrictions
      } else if (req["user"]["role"] === Role.CORPORATE_MANAGER) {
        if (user.companyId) {
          matchObj.companyId = user.companyId;
        } else {
          matchObj._id = { $in: [] };
        }
      } else if (req["user"]["role"] === Role.FACILITY_MANAGER) {
        if (user.facilityIds?.length) {
          matchObj.facilityId = {
            $in: user.facilityIds.map((id) => new mongoose.Types.ObjectId(id)),
          };
        } else {
          matchObj._id = { $in: [] };
        }
      } else if (req["user"]["role"] === Role.OPERATOR) {
        if (user.chillerIds?.length) {
          matchObj.chillerId = {
            $in: user.chillerIds.map((id) => new mongoose.Types.ObjectId(id)),
          };
        } else {
          matchObj._id = { $in: [] };
        }
      } else {
        matchObj._id = { $in: [] }; // Deny if role is unexpected
      }

      // 📍 Apply filters from DTO
      if (companyId)
        matchObj.companyId = new mongoose.Types.ObjectId(companyId);
      if (facilityId)
        matchObj.facilityId = new mongoose.Types.ObjectId(facilityId);
      if (chillerId)
        matchObj.chillerId = new mongoose.Types.ObjectId(chillerId);

      // 🔧 Build pipeline
      const pipeline = [];

      pipeline.push({ $match: matchObj });

      // 🔄 Lookups
      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.CHILLER,
          localField: "chillerId",
          foreignField: "_id",
          as: "chiller",
        },
      });

      pipeline.push({
        $unwind: { path: "$chiller", preserveNullAndEmptyArrays: true },
      });

      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.FACILITY,
          localField: "facilityId",
          foreignField: "_id",
          as: "facility",
        },
      });

      pipeline.push({
        $unwind: { path: "$facility", preserveNullAndEmptyArrays: true },
      });

      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.COMPANY,
          localField: "companyId",
          foreignField: "_id",
          as: "company",
        },
      });

      pipeline.push({
        $unwind: { path: "$company", preserveNullAndEmptyArrays: true },
      });

      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.USERS,
          localField: "createdBy",
          foreignField: "_id",
          as: "createdByUser",
        },
      });
      pipeline.push({
        $unwind: { path: "$createdByUser", preserveNullAndEmptyArrays: true },
      });

      // 🧮 Add formatted fields
      pipeline.push({
        $addFields: {
          chillerLabel: {
            $concat: [
              { $ifNull: ["$chiller.ChillerNo", ""] },
              " - ",
              { $ifNull: ["$chiller.serialNumber", ""] },
            ],
          },
          chillerName: {
            $concat: [
              { $ifNull: ["$chiller.make", ""] },
              " ",
              { $ifNull: ["$chiller.model", ""] },
            ],
          },
          createdByName: {
            $concat: [
              { $ifNull: ["$createdByUser.firstName", ""] },
              " ",
              { $ifNull: ["$createdByUser.lastName", ""] },
            ],
          },
        },
      });

      // 🔍 Search
      if (search) {
        const searchRegex = new RegExp(search.trim(), "i");
        pipeline.push({
          $match: {
            $or: [
              { maintenanceType: { $regex: searchRegex } },
              { maintenanceCategory: { $regex: searchRegex } },
              { maintDescription: { $regex: searchRegex } },
              { comments: { $regex: searchRegex } },
              { chillerLabel: { $regex: searchRegex } },
              { chillerName: { $regex: searchRegex } },
              { createdByName: { $regex: searchRegex } },
            ],
          },
        });
      }

      // 🧾 Sorting
      const sortFieldMap = {
        chillerLabel: "chillerLabel",
        chillerName: "chillerName",
        maintenanceType: "maintenanceType",
        maintenanceCategory: "maintenanceCategory",
        comments: "comments",
        updatedAt: "updatedAt",
        chillerNo: "chillerNo",
      };
      const sortField = sortFieldMap[sort_by] || "updatedAt";

      pipeline.push({
        $sort: {
          [sortField]: sortOrder,
        },
      });

      // 📃 Pagination
      pipeline.push({
        $facet: {
          records: [{ $skip: skip }, { $limit: limit }],
          totalRecords: [{ $count: "count" }],
        },
      });

      // 🧪 Execute
      const result = await this.maintenanceModel.aggregate(pipeline);

      return {
        maintenanceList: result[0]?.records || [],
        totalRecords: result[0]?.totalRecords?.[0]?.count || 0,
      };
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  async findOne(id: string, loggedInUserId: string) {
    try {
      const loggedInUser = await this.userModel.findById(
        new mongoose.Types.ObjectId(loggedInUserId),
      );

      if (!loggedInUser) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.UNAUTHORIZED_USER,
        );
      }

      const matchObj: FilterQuery<MaintenanceDocument> = {
        _id: new mongoose.Types.ObjectId(id),
        isDeleted: false,
      };

      if ([Role.ADMIN, Role.SUB_ADMIN].includes(loggedInUser?.role)) {
        // No restrictions
      } else if (loggedInUser?.role === Role.CORPORATE_MANAGER) {
        if (loggedInUser.companyId) {
          matchObj.companyId = loggedInUser.companyId;
        } else {
          matchObj._id = { $in: [] };
        }
      } else if (loggedInUser?.role === Role.FACILITY_MANAGER) {
        if (loggedInUser.facilityIds?.length) {
          matchObj.facilityId = {
            $in: loggedInUser.facilityIds.map(
              (id) => new mongoose.Types.ObjectId(id),
            ),
          };
        } else {
          matchObj._id = { $in: [] };
        }
      } else if (loggedInUser?.role === Role.OPERATOR) {
        if (loggedInUser.chillerIds?.length) {
          matchObj.chillerId = {
            $in: loggedInUser.chillerIds.map(
              (id) => new mongoose.Types.ObjectId(id),
            ),
          };
        } else {
          matchObj._id = { $in: [] };
        }
      } else {
        matchObj._id = { $in: [] }; // Deny if role is unexpected
      }

      const pipeline = [];

      pipeline.push({ $match: matchObj });

      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.CHILLER,
          localField: "chillerId",
          foreignField: "_id",
          as: "chiller",
        },
      });

      pipeline.push({
        $unwind: { path: "$chiller", preserveNullAndEmptyArrays: true },
      });

      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.FACILITY,
          localField: "facilityId",
          foreignField: "_id",
          as: "facility",
        },
      });

      pipeline.push({
        $unwind: { path: "$facility", preserveNullAndEmptyArrays: true },
      });

      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.COMPANY,
          localField: "companyId",
          foreignField: "_id",
          as: "company",
        },
      });

      pipeline.push({
        $unwind: { path: "$company", preserveNullAndEmptyArrays: true },
      });

      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.USERS,
          localField: "createdBy",
          foreignField: "_id",
          as: "createdByUser",
        },
      });
      pipeline.push({
        $unwind: { path: "$createdByUser", preserveNullAndEmptyArrays: true },
      });

      // 🧮 Add formatted fields
      pipeline.push({
        $addFields: {
          ChillerNo: "$chiller.ChillerNo",
          chillerLabel: {
            $concat: [
              { $ifNull: ["$chiller.ChillerNo", ""] },
              " - ",
              { $ifNull: ["$chiller.serialNumber", ""] },
            ],
          },
          chillerName: {
            $concat: [
              { $ifNull: ["$chiller.make", ""] },
              " ",
              { $ifNull: ["$chiller.model", ""] },
            ],
          },
          createdByName: {
            $concat: [
              { $ifNull: ["$createdByUser.firstName", ""] },
              " ",
              { $ifNull: ["$createdByUser.lastName", ""] },
            ],
          },
        },
      });

      const result = await this.maintenanceModel.aggregate(pipeline);
      console.log("✌️result --->", result);

      if (!result || result.length === 0) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.MAINTENANCE_LOG_NOT_FOUND,
        );
      } else {
        return result[0];
      }
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  async update(
    id: string,
    updateMaintenanceRecordDto: UpdateMaintenanceRecordDto,
    loggedInUserId: string,
  ) {
    try {
      const loggedInUser = await this.userModel.findById({
        _id: new mongoose.Types.ObjectId(loggedInUserId),
      });

      if (!loggedInUser) {
        throw TypeExceptions.NotFoundCommonFunction(
          RESPONSE_ERROR.USER_NOT_FOUND,
        );
      }

      const chiller = await this.chillerModel.findById({
        _id: new mongoose.Types.ObjectId(updateMaintenanceRecordDto.chillerId),
      });

      if (!chiller) {
        throw TypeExceptions.NotFoundCommonFunction(
          RESPONSE_ERROR.CHILLER_NOT_FOUND,
        );
      }

      const maintenanceRecord = await this.maintenanceModel.findById(
        new mongoose.Types.ObjectId(id),
      );

      if (!maintenanceRecord || maintenanceRecord.isDeleted) {
        throw TypeExceptions.NotFoundCommonFunction(
          RESPONSE_ERROR.MAINTENANCE_LOG_NOT_FOUND,
        );
      }

      const { chillerId, companyId, facilityId, fileName, ...updatableFields } =
        updateMaintenanceRecordDto;

      Object.assign(maintenanceRecord, updatableFields);
      const formattedReadingDate = LogRecordHelper.convertToUTCString(
        updateMaintenanceRecordDto.maintenanceDate,
        updateMaintenanceRecordDto.maintenanceTime,
        updateMaintenanceRecordDto.maintenanceTimeZone,
      );

      if (fileName !== undefined) {
        if (fileName === "") {
          if (maintenanceRecord.fileName) {
            const oldFileKey = `${UploadFolderEnum.MAINTENANCE_FILES}/${maintenanceRecord.fileName}`;
            await this.imageService.deleteImage(oldFileKey);
          }
          maintenanceRecord.fileName = "";
        } else if (fileName !== maintenanceRecord.fileName) {
          const newFileKey = `${UploadFolderEnum.MAINTENANCE_FILES}/${fileName}`;
          await this.imageService.moveTempToRealFolder(newFileKey);
          if (maintenanceRecord.fileName) {
            const oldFileKey = `${UploadFolderEnum.MAINTENANCE_FILES}/${maintenanceRecord.fileName}`;
            await this.imageService.deleteImage(oldFileKey);
          }
          maintenanceRecord.fileName = fileName;
        }
      }

      maintenanceRecord.updatedBy = loggedInUser._id;
      maintenanceRecord.maintenanceDate = formattedReadingDate;
      await maintenanceRecord.save();

      const title = "Maintenance Entry Edited";

      const params = {
        updatedBy: `${loggedInUser?.firstName} ${loggedInUser.lastName}`,
        entryNotes: maintenanceRecord.comments,
      };

      const description = generateTimelineDescription(title, params);

      await this.timelineModel.create({
        chillerId: chiller._id,
        title,
        description,
        updatedBy: new mongoose.Types.ObjectId(loggedInUser._id),
      });
      return maintenanceRecord;
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }
  async exportMaintenanceExcel(body: ExportMaintenanceIds) {
    try {
      const pipeline = [];
      const matchObj: FilterQuery<MaintenanceDocument> = { isDeleted: false };

      const maintenanceIds = body?.maintenanceIds?.map(
        (id) => new mongoose.Types.ObjectId(id),
      );
      matchObj._id = { $in: maintenanceIds };

      pipeline.push({ $match: matchObj });
      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.FACILITY,
          localField: "facilityId",
          foreignField: "_id",
          as: "facility",
        },
      });

      pipeline.push({
        $unwind: { path: "$facility", preserveNullAndEmptyArrays: true },
      });

      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.CHILLER,
          localField: "chillerId",
          foreignField: "_id",
          as: "chiller",
        },
      });
      pipeline.push({
        $unwind: { path: "$chiller", preserveNullAndEmptyArrays: false },
      });
      // Lookup user
      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.USERS,
          localField: "createdBy",
          foreignField: "_id",
          as: "user",
        },
      });
      pipeline.push({
        $unwind: { path: "$user", preserveNullAndEmptyArrays: true },
      });

      const result = await this.maintenanceModel.aggregate(pipeline);
      console.log("result: ", result);
      if (result.length) {
        const rows = [];
        const column = [];

        for (const e of result) {
          const formattedCreatedDate = dayjs(e.createdAt).format(
            "MM/DD/YY HH:mm",
          );
          const formattedDate = dayjs(e.updatedAt).format("MM/DD/YY HH:mm");

          const deductionExcelRes = {
            Creator: e?.user?.firstName + " " + e?.user?.lastName,
            "Created At": formattedCreatedDate,
            "Facility Name": e?.facility?.name || "",
            "Chiller Name - Make & Model":
              (e?.chiller.ChillerNo || "") +
              " - " +
              (e?.chiller.make || "") +
              " " +
              (e?.chiller.model || ""),
            "Make & Model":
              (e?.chiller.make || "") + " " + (e?.chiller.model || ""),
            Category: e?.maintenanceCategory,
            Type: e?.maintenanceType,
            "Operator Notes": e?.comments,
            "Updated At": formattedDate,
          };
          rows.push(Object.values(deductionExcelRes));
          column.push(deductionExcelRes);
        }
        const book = new Workbook();
        const sheet = book.addWorksheet(`sheet1`);
        rows.unshift(Object.keys(column[0]));
        sheet.addRows(rows);

        const headerRow = sheet.getRow(1);
        headerRow.eachCell((cell) => {
          cell.font = { bold: true };
        });
        headerRow.commit();

        const buffer = await book.xlsx.writeBuffer();
        const uploadFolderPathNew = "tmp-chiller-check/logs";
        const fileName = `exportMaintenanceRecordsExcel_${Date.now()}.xlsx`;
        const filePath = `${uploadFolderPathNew}/${fileName}`;
        if (!fs.existsSync(uploadFolderPathNew)) {
          fs.mkdirSync(uploadFolderPathNew, { recursive: true });
        }

        await fs.promises.writeFile(filePath, Buffer.from(buffer));
        const moduleName = "logs";
        const mimetype =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

        // Send onboarding email with credentials
        if (
          process.env.APP_ENV === AppEnvironment.DEVELOPMENT ||
          process.env.APP_ENV === AppEnvironment.PRODUCTION ||
          process.env.APP_ENV === AppEnvironment.STAGING
        ) {
          const resultFile = await this.imageService.uploadS3(
            buffer,
            fileName,
            moduleName,
            mimetype,
          );
          return resultFile;
        } else {
          return {
            name: fileName,
          };
        }
      } else {
        return { message: "No Records found." };
      }
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  async remove(id: string) {
    try {
      const log = await this.maintenanceModel.findById({
        _id: new mongoose.Types.ObjectId(id),
      });

      if (!log) {
        throw TypeExceptions.NotFoundCommonFunction(
          RESPONSE_ERROR.MAINTENANCE_LOG_NOT_FOUND,
        );
      }

      log.isDeleted = true;

      await log.save();
      return log;
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }
}
