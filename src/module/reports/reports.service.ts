import { Injectable } from "@nestjs/common";
import {
  CreateReportDto,
  GraphDto,
  ReportsListDto,
  ReportUserList,
  UpdateReportDto,
} from "./dto/create-report.dto";
import { InjectModel } from "@nestjs/mongoose";
import mongoose, { FilterQuery, Model } from "mongoose";
import { Chiller } from "src/common/schema/chiller.schema";
import { Company } from "src/common/schema/company.schema";
import { User, UserDocument } from "src/common/schema/user.schema";
import { Facility } from "src/common/schema/facility.schema";
import { Logs } from "src/common/schema/logs.schema";
import {
  REPORTS,
  RESPONSE_ERROR,
  USER,
} from "src/common/constants/response.constant";
import { TypeExceptions, CustomError } from "src/common/helpers/exceptions";
import {
  AppEnvironment,
  NotificationRedirectionType,
  Role,
  userRoleName,
} from "src/common/constants/enum.constant";
import { Report, ReportDocument } from "src/common/schema/reports.schema";
import { reportNotificationTemplate } from "src/common/helpers/email/emailTemplates/reportNotificationTemplate";
import { EmailService } from "src/common/helpers/email/email.service";
import { TABLE_NAMES } from "src/common/constants/table-name.constant";
import { NotificationService } from "src/common/services/notification.service";
import { ParameterType } from "src/common/dto/common.dto";
import { Workbook } from "exceljs";
import * as fs from "fs";
import { ImageUploadService } from "../image-upload/image-upload.service";

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
    @InjectModel(Chiller.name) private readonly chillerModel: Model<Chiller>,
    @InjectModel(Facility.name) private readonly facilityModel: Model<Facility>,
    @InjectModel(Logs.name) private readonly logsModel: Model<Logs>,
    @InjectModel(Report.name) private readonly reportModel: Model<Report>,
    private emailService: EmailService,
    private readonly notificationService: NotificationService,
    private imageService: ImageUploadService,
  ) {}

  async create(createReportDto: CreateReportDto, loggedInUserId: string) {
    try {
      const loggedInUser = await this.userModel.findById({
        _id: new mongoose.Types.ObjectId(loggedInUserId),
      });

      if (!loggedInUser) {
        throw TypeExceptions.NotFoundCommonFunction(
          RESPONSE_ERROR.USER_NOT_FOUND,
        );
      }

      const {
        name,
        startDate,
        endDate,
        notification,
        parameter,
        chartType,
        companyId,
        facilityIds,
        description,
        header,
        footer,
        dateType,
        sharedTo,
      } = createReportDto;

      const userRole = loggedInUser.role;
      const userCompanyId = loggedInUser.companyId?.toString();
      const userFacilityIds = (loggedInUser.facilityIds || []).map((id) =>
        id.toString(),
      );
      const userChillerIds = (loggedInUser.chillerIds || []).map((id) =>
        id.toString(),
      );

      // 🔒 Role-based access control
      if (userRole === Role.CORPORATE_MANAGER) {
        if (companyId !== userCompanyId) {
          throw TypeExceptions.BadRequestCommonFunction(
            "You are not allowed to create reports for this company",
          );
        }
      }

      if (userRole === Role.FACILITY_MANAGER) {
        const unauthorizedFacilities = facilityIds.filter(
          (id) => !userFacilityIds.includes(id),
        );
        if (unauthorizedFacilities.length > 0) {
          throw TypeExceptions.BadRequestCommonFunction(
            "You are not allowed to create reports for some of the selected facilities",
          );
        }
      }

      if (userRole === Role.OPERATOR) {
        // Fetch all chillers under requested facilities
        const chillersInFacilities = await this.chillerModel
          .find({ facilityId: { $in: facilityIds } }, { _id: 1 })
          .lean();

        const allChillerIdsInFacilities = chillersInFacilities.map((c) =>
          c._id.toString(),
        );

        const unauthorizedChillers = allChillerIdsInFacilities.filter(
          (chillerId) => !userChillerIds.includes(chillerId),
        );

        if (unauthorizedChillers.length > 0) {
          throw TypeExceptions.BadRequestCommonFunction(
            "You are not allowed to create reports for chillers outside your access",
          );
        }
      }

      // ✅ Save report
      const report = await this.reportModel.create({
        name,
        startDate,
        endDate,
        notification,
        parameter,
        chartType,
        dateType,
        companyId: new mongoose.Types.ObjectId(companyId),
        facilityIds: facilityIds.map((id) => new mongoose.Types.ObjectId(id)),
        description,
        header,
        footer,
        sharedTo: sharedTo?.map((id) => new mongoose.Types.ObjectId(id)),
        createdBy: new mongoose.Types.ObjectId(loggedInUser._id),
        updatedBy: new mongoose.Types.ObjectId(loggedInUser._id),
      });

      if (sharedTo.length != 0) {
        sharedTo.map(async (id) => {
          const user = await this.userModel.findById({
            _id: new mongoose.Types.ObjectId(id),
          });

          const userFullName = `${user.firstName} ${user.lastName}`;

          const html = reportNotificationTemplate(
            userFullName,
            report.name,
            loggedInUser.role,
            `${loggedInUser.firstName} ${loggedInUser.lastName}`,
            `${process.env.ADMIN_URL}/report/view/${report._id}`,
          );

          await this.emailService.emailSender({
            to: user.email,
            subject: `Report Shared`,
            html: html,
          });
          const roleText = userRoleName(loggedInUser.role);
          const message = `A report - ${report.name} created by ${roleText} - '${loggedInUser.firstName} ${loggedInUser.lastName}' has been shared with you. Click to view the report details.`;
          const payload = {
            senderId: null,
            receiverId: user._id,
            title: "Report Shared",
            message: message,
            type: NotificationRedirectionType.REPORT_SHARED,
            redirection: {
              reportId: report._id,
              type: NotificationRedirectionType.REPORT_SHARED,
            },
          };

          await this.notificationService.sendNotification(
            payload.receiverId,
            payload,
          );
        });
      }

      return report;
    } catch (error) {
      console.log("error: ", error);
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  async findAll(loggedInUserId: string, body: ReportsListDto) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        sort_by,
        sort_order = "DESC",
        parameter,
        facilityId,
      } = body;
      let companyId = body.companyId;
      const user = await this.userModel.findById({
        _id: new mongoose.Types.ObjectId(loggedInUserId),
      });

      if (!user) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.USER_ALREADY_EXIST,
        );
      }

      const skip = (page - 1) * limit;
      const sortOrder = sort_order === "ASC" ? 1 : -1;
      const userObjectId = new mongoose.Types.ObjectId(loggedInUserId);

      const matchObj: FilterQuery<ReportDocument> = {
        isDeleted: false,
        $or: [
          { createdBy: userObjectId },
          { sharedTo: userObjectId }, // Mongoose treats this as $in when field is an array
        ],
      };

      // Apply filters conditionally
      if (parameter) {
        matchObj.parameter = parameter;
      }
      let facilityIds = [];
      if (user.role == Role.FACILITY_MANAGER) {
        if (user.companyId) {
          companyId = user.companyId.toString();
        }

        if (user?.facilityIds?.length > 0) {
          if (user.facilityIds && user.facilityIds.length) {
            facilityIds = user.facilityIds.map(
              (id) => new mongoose.Types.ObjectId(id),
            );
          }
        }
        matchObj.facilityIds = { $in: facilityIds };
      }
      if (user.role == Role.OPERATOR) {
        if (user.companyId) {
          companyId = user.companyId.toString();
        }

        if (user.facilityIds) {
          if (user.facilityIds && user.facilityIds.length) {
            facilityIds = user.facilityIds.map(
              (id) => new mongoose.Types.ObjectId(id),
            );
          }
        }
        matchObj.facilityIds = { $in: facilityIds };
      }

      if (companyId) {
        matchObj.companyId = new mongoose.Types.ObjectId(companyId);
      }

      if (facilityId) {
        matchObj.facilityIds = {
          $in: [new mongoose.Types.ObjectId(facilityId)],
        };
      }

      const pipeline = [];

      // 🟡 Match Stage
      pipeline.push({ $match: matchObj });

      // 🔄 Lookup: Facility
      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.FACILITY,
          localField: "facilityIds",
          foreignField: "_id",
          as: "facility",
        },
      });

      // pipeline.push({
      //   $unwind: { path: '$facility', preserveNullAndEmptyArrays: true },
      // });

      // 🔄 Lookup: Updated By User
      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.USERS,
          localField: "updatedBy",
          foreignField: "_id",
          as: "updatedByUser",
        },
      });

      pipeline.push({
        $unwind: { path: "$updatedByUser", preserveNullAndEmptyArrays: true },
      });
      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.USERS,
          localField: "sharedTo",
          foreignField: "_id",
          as: "sharedUser",
        },
      });

      // 🧮 Add Fields
      pipeline.push({
        $addFields: {
          // facilityName: '$facility.name',
          facilityNames: {
            $map: {
              input: "$facility",
              as: "fac",
              in: "$$fac.name",
            },
          },
          updatedByName: {
            $concat: [
              { $ifNull: ["$updatedByUser.firstName", ""] },
              " ",
              { $ifNull: ["$updatedByUser.lastName", ""] },
            ],
          },
        },
      });
      pipeline.push({
        $addFields: {
          notifyTypeDisplay: {
            $switch: {
              branches: [
                {
                  case: { $eq: ["$notification", "both"] },
                  then: "Web & Email",
                },
                {
                  case: { $eq: ["$notification", "email"] },
                  then: "Email",
                },
                {
                  case: { $eq: ["$notification", "web"] },
                  then: "Web",
                },
              ],
              default: "Unknown",
            },
          },
        },
      });
      pipeline.push({
        $addFields: {
          parameterLower: { $toLower: "$parameter" },
        },
      });

      // 🔍 Search
      if (search) {
        const searchRegex = new RegExp(search.trim(), "i");
        pipeline.push({
          $match: {
            $or: [
              { name: { $regex: searchRegex } },
              { reportType: { $regex: searchRegex } },
              { facilityName: { $regex: searchRegex } },
              { updatedByName: { $regex: searchRegex } },
            ],
          },
        });
      }

      // ⬇️ Sorting
      const sortFieldMap = {
        name: "name",
        parameter: "parameterLower",
        dateType: "dateType",
        reportType: "reportType",
        updatedAt: "updatedAt",
        notification: "notifyTypeDisplay",
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
      const result = await this.reportModel.aggregate(pipeline);

      return {
        reports: result[0]?.records || [],
        totalRecords: result[0]?.totalRecords?.[0]?.count || 0,
      };
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  async findOne(id: string, loggedInUserId: string) {
    try {
      const loggedInUser = await this.userModel.findById({
        _id: new mongoose.Types.ObjectId(loggedInUserId),
      });

      if (!loggedInUser) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.UNAUTHORIZED_USER,
        );
      }
      const report = await this.reportModel.findOne({
        _id: new mongoose.Types.ObjectId(id),
      });
      // Check access: user must be the creator or in shared users
      const userIdStr = String(loggedInUser._id);
      const isCreator = String(report.createdBy) === userIdStr;
      const isShared = report.sharedTo?.some(
        (sharedId) => String(sharedId) === userIdStr,
      );

      if (!isCreator && !isShared) {
        throw TypeExceptions.BadRequestCommonFunction(
          REPORTS.USER_NOT_ACCESS_REPORT,
        );
      }
      const matchObj: FilterQuery<ReportDocument> = {
        _id: new mongoose.Types.ObjectId(id),
        isDeleted: false,
        // sharedTo: { $in: [new mongoose.Types.ObjectId(loggedInUserId)] },
      };

      const pipeline = [];

      pipeline.push({ $match: matchObj });

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
          from: TABLE_NAMES.FACILITY,
          localField: "facilityIds",
          foreignField: "_id",
          as: "facility",
        },
      });

      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.USERS,
          localField: "sharedTo",
          foreignField: "_id",
          as: "sharedUser",
          pipeline: [
            {
              $match: {
                _id: { $ne: new mongoose.Types.ObjectId(loggedInUserId) },
                // companyId: { $ne: null }, // has a company
                // facilityIds: { $exists: true, $ne: [] }, // has facilities,
              },
            },
            {
              $lookup: {
                from: TABLE_NAMES.COMPANY,
                let: { companyId: "$companyId" },
                pipeline: [
                  { $match: { $expr: { $eq: ["$_id", "$$companyId"] } } },
                ],
                as: "company",
              },
            },
            {
              $unwind: { path: "$company", preserveNullAndEmptyArrays: true },
            },
            {
              $lookup: {
                from: TABLE_NAMES.FACILITY,
                let: { facilityIds: "$facilityIds" },
                pipeline: [
                  { $match: { $expr: { $in: ["$_id", "$$facilityIds"] } } },
                ],
                as: "facilities",
              },
            },
          ],
        },
      });

      // pipeline.push({
      //   $unwind: { path: '$facility', preserveNullAndEmptyArrays: true },
      // });

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
      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.USERS,
          localField: "updatedBy",
          foreignField: "_id",
          as: "updatedByUser",
        },
      });

      pipeline.push({
        $unwind: { path: "$updatedByUser", preserveNullAndEmptyArrays: true },
      });

      // 🧮 Add Fields
      pipeline.push({
        $addFields: {
          facilityNames: {
            $map: {
              input: "$facility",
              as: "fac",
              in: "$$fac.name",
            },
          },
          companyName: "$company.name",
          updatedByName: {
            $concat: [
              { $ifNull: ["$updatedByUser.firstName", ""] },
              " ",
              { $ifNull: ["$updatedByUser.lastName", ""] },
            ],
          },
        },
      });

      const result = await this.reportModel.aggregate(pipeline);

      if (!result || result.length === 0) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.REPORT_NOT_FOUND,
        );
      } else {
        const newShareUser = result[0].sharedUser;
        // const ids = newShareUser?.map?.((data) => data._id);
        const newSharedUserFinal = [];
        for (const element of newShareUser) {
          if (element.role == Role.CORPORATE_MANAGER) {
            if (element.companyId) {
              newSharedUserFinal.push(element);
            }
          }
          if (
            element.role == Role.FACILITY_MANAGER ||
            element.role == Role.OPERATOR
          ) {
            if (element.companyId && element.facilityIds?.length) {
              newSharedUserFinal.push(element);
            }
          }
        }
        const ids = newSharedUserFinal?.map?.((data) => data._id);
        return { ...result[0], sharedTo: ids, sharedUser: newSharedUserFinal };
      }
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }
  async getGroupFormat(startDate: Date, endDate: Date) {
    const diffDays =
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

    console.log("diffDays: ", diffDays);
    if (diffDays < 31) return "%Y-%m-%d"; // daily
    if (diffDays < 730) return "%Y-%m"; // monthly
    return "%Y"; // yearly
  }

  getDateRange(start, end, format) {
    const dates = [];
    const current = new Date(start);
    while (current <= end) {
      if (format === "%Y-%m-%d") {
        dates.push(current.toISOString().split("T")[0]);
        current.setDate(current.getDate() + 1);
      } else if (format === "%Y-%m") {
        dates.push(
          `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`,
        );
        current.setMonth(current.getMonth() + 1);
      } else {
        dates.push(String(current.getFullYear()));
        current.setFullYear(current.getFullYear() + 1);
      }
    }
    return dates;
  }

  async findOneChart(req: Request, body: GraphDto) {
    try {
      const loggedInUserId = req["user"]["_id"];

      const loggedInUser = await this.userModel.findById({
        _id: new mongoose.Types.ObjectId(loggedInUserId),
      });

      if (!loggedInUser) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.UNAUTHORIZED_USER,
        );
      }
      const report = await this.reportModel.findOne({
        _id: new mongoose.Types.ObjectId(body.id),
      });
      const dateFormat = await this.getGroupFormat(
        new Date(report.startDate),
        new Date(report.endDate),
      );
      let value = "";
      if (ParameterType["Loss Cost"] == report.parameter) {
        value = "lossCost";
      } else if (ParameterType["kWh Loss"] == report.parameter) {
        value = "KWHLoss";
      } else if (ParameterType["Avg. Other Losses"] == report.parameter) {
        value = "otherLoss";
      } else if (
        ParameterType["Avg. Excess Evap. Approach"] == report.parameter
      ) {
        value = "evapApproach";
      } else if (
        ParameterType["Avg. Excess Cond. Approach"] == report.parameter
      ) {
        value = "condApproach";
      } else {
        value = "condApproach";
      }
      console.log("value: ", value);

      const allDates = this.getDateRange(
        new Date(report.startDate),
        new Date(report.endDate),
        dateFormat,
      );
      const isFacility = body.isFacility;
      const pipelineCond = [];
      if (isFacility) {
        pipelineCond.push(
          {
            $group: {
              _id: {
                date: {
                  $dateToString: {
                    format: dateFormat,
                    date: "$readingDateUTCObj",
                  },
                },
                facilityId: "$facilityId",
              },
              finalValue: { $avg: `$${value}` },
            },
          },
          {
            $lookup: {
              from: TABLE_NAMES.FACILITY,
              localField: "_id.facilityId",
              foreignField: "_id",
              as: "facility",
            },
          },
          { $unwind: "$facility" },
          {
            $group: {
              _id: "$facility.name",
              values: {
                $push: {
                  date: "$_id.date",
                  value: "$finalValue",
                },
              },
            },
          },
        );
      } else {
        pipelineCond.push(
          {
            $group: {
              _id: {
                date: {
                  $dateToString: {
                    format: dateFormat,
                    date: "$readingDateUTCObj",
                  },
                },
                chillerId: "$chillerId",
              },
              finalValue: { $avg: `$${value}` },
            },
          },
          {
            $lookup: {
              from: TABLE_NAMES.CHILLER,
              localField: "_id.chillerId",
              foreignField: "_id",
              as: "chiller",
            },
          },
          { $unwind: "$chiller" },
          {
            $group: {
              _id: "$chiller.ChillerNo",
              values: {
                $push: {
                  date: "$_id.date",
                  value: "$finalValue",
                  serialNumber: "$chiller.serialNumber",
                },
              },
            },
          },
        );
      }
      const pipeline = [
        {
          $addFields: {
            startDateObj: {
              $dateFromString: { dateString: report.startDate, onError: null },
            },
            endDateObj: {
              $dateFromString: { dateString: report.endDate, onError: null },
            },
            readingDateUTCObj: {
              $dateFromString: { dateString: "$readingDateUTC", onError: null },
            },
          },
        },
        {
          $match: {
            companyId: new mongoose.Types.ObjectId(report.companyId),
            facilityId: {
              $in: (report.facilityIds || []).map(
                (id) => new mongoose.Types.ObjectId(id),
              ),
            },
            isDeleted: false,
            $expr: {
              $and: [
                { $gte: ["$readingDateUTCObj", "$startDateObj"] },
                { $lte: ["$readingDateUTCObj", "$endDateObj"] },
              ],
            },
          },
        },
        ...pipelineCond,
        {
          $group: {
            _id: null,
            datasets: {
              $push: {
                label: "$_id",
                data: "$values.value",
                dates: "$values.date",
                chillerNo: "$values.chillerNo",
              },
            },
          },
        },
      ];

      const rawResult = await this.logsModel.aggregate(pipeline);
      console.log(allDates, "rawResult: ", rawResult);

      // 🛠 Transform to { labels, datasets }
      let labels = [];
      let datasets = [];
      if (rawResult.length > 0) {
        // Step 1: Use masterDates directly instead of only raw data dates
        labels = [...allDates]; // All dates from the month/week

        // Step 2: Prepare datasets with missing days filled as 0
        datasets = rawResult[0].datasets.map((ds) => {
          const dataMap = {};
          ds.dates.forEach((date, idx) => {
            dataMap[date] = ds.data[idx];
          });

          return {
            label: ds.label,
            chillerNo: ds?.chillerNo[0] || "",
            data: labels.map((lbl) => dataMap[lbl] ?? 0), // Fill missing dates with 0
          };
        });
      }

      const finalResponse = { labels, datasets, parameter: report.parameter };
      return finalResponse;
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }
  async exportExcel(body: GraphDto) {
    try {
      const report = await this.reportModel.findOne({
        _id: new mongoose.Types.ObjectId(body.id),
      });
      const dateFormat = await this.getGroupFormat(
        new Date(report.startDate),
        new Date(report.endDate),
      );
      let value = "";
      if (ParameterType["Loss Cost"] == report.parameter) {
        value = "lossCost";
      } else if (ParameterType["kWh Loss"] == report.parameter) {
        value = "KWHLoss";
      } else if (ParameterType["Avg. Other Losses"] == report.parameter) {
        value = "otherLoss";
      } else if (
        ParameterType["Avg. Excess Evap. Approach"] == report.parameter
      ) {
        value = "evapApproach";
      } else if (
        ParameterType["Avg. Excess Cond. Approach"] == report.parameter
      ) {
        value = "condApproach";
      } else {
        value = "condApproach";
      }
      console.log("value: ", value);

      const allDates = this.getDateRange(
        new Date(report.startDate),
        new Date(report.endDate),
        dateFormat,
      );
      const isFacility = body.isFacility;
      const pipelineCond = [];
      if (isFacility) {
        pipelineCond.push(
          {
            $group: {
              _id: {
                date: {
                  $dateToString: {
                    format: dateFormat,
                    date: "$readingDateUTCObj",
                  },
                },
                facilityId: "$facilityId",
              },
              finalValue: { $avg: `$${value}` },
            },
          },
          {
            $lookup: {
              from: TABLE_NAMES.FACILITY,
              localField: "_id.facilityId",
              foreignField: "_id",
              as: "facility",
            },
          },
          { $unwind: "$facility" },
          {
            $group: {
              _id: "$facility.name",
              values: {
                $push: {
                  date: "$_id.date",
                  value: "$finalValue",
                },
              },
            },
          },
        );
      } else {
        pipelineCond.push(
          {
            $group: {
              _id: {
                date: {
                  $dateToString: {
                    format: dateFormat,
                    date: "$readingDateUTCObj",
                  },
                },
                chillerId: "$chillerId",
              },
              finalValue: { $avg: `$${value}` },
            },
          },
          {
            $lookup: {
              from: TABLE_NAMES.CHILLER,
              localField: "_id.chillerId",
              foreignField: "_id",
              as: "chiller",
            },
          },
          { $unwind: "$chiller" },
          {
            $group: {
              _id: "$chiller.ChillerNo",
              values: {
                $push: {
                  date: "$_id.date",
                  value: "$finalValue",
                  serialNumber: "$chiller.serialNumber",
                },
              },
            },
          },
        );
      }
      const pipeline = [
        {
          $addFields: {
            startDateObj: {
              $dateFromString: { dateString: report.startDate, onError: null },
            },
            endDateObj: {
              $dateFromString: { dateString: report.endDate, onError: null },
            },
            readingDateUTCObj: {
              $dateFromString: { dateString: "$readingDateUTC", onError: null },
            },
          },
        },
        {
          $match: {
            companyId: new mongoose.Types.ObjectId(report.companyId),
            facilityId: {
              $in: (report.facilityIds || []).map(
                (id) => new mongoose.Types.ObjectId(id),
              ),
            },
            isDeleted: false,
            $expr: {
              $and: [
                { $gte: ["$readingDateUTCObj", "$startDateObj"] },
                { $lte: ["$readingDateUTCObj", "$endDateObj"] },
              ],
            },
          },
        },
        ...pipelineCond,
        {
          $group: {
            _id: null,
            datasets: {
              $push: {
                label: "$_id",
                data: "$values.value",
                dates: "$values.date",
                chillerNo: "$values.chillerNo",
              },
            },
          },
        },
      ];

      const rawResult = await this.logsModel.aggregate(pipeline);
      console.log(allDates, "rawResult: ", rawResult);

      // 🛠 Transform to { labels, datasets }
      let labels = [];
      let datasets = [];
      if (rawResult.length > 0) {
        // Step 1: Use masterDates directly instead of only raw data dates
        labels = [...allDates]; // All dates from the month/week

        // Step 2: Prepare datasets with missing days filled as 0
        datasets = rawResult[0].datasets.map((ds) => {
          const dataMap = {};
          ds.dates.forEach((date, idx) => {
            dataMap[date] = ds.data[idx];
          });

          return {
            label: ds.label,
            chillerNo: ds?.chillerNo[0] || "",
            data: labels.map((lbl) => dataMap[lbl] ?? 0), // Fill missing dates with 0
          };
        });

        const workbook = new Workbook();
        // const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Report");

        // Option 2: Dates as Rows
        const headerRow = [
          "Date",
          ...datasets.map((ds) => `${ds.chillerNo} (${ds.label})`),
        ];
        sheet.addRow(headerRow);

        labels.forEach((date, idx) => {
          const row = [date, ...datasets.map((ds) => ds.data[idx])];
          sheet.addRow(row);
        });

        // Save to file
        // workbook.xlsx.writeFile("report.xlsx").then(() => {
        //   console.log("Excel file created!");
        // });

        const buffer = await workbook.xlsx.writeBuffer();

        const uploadFolderPathNew = "tmp-chiller-check/report";

        const fileName = `exportReportRecordsExcel_${Date.now()}.xlsx`;
        const filePath = `${uploadFolderPathNew}/${fileName}`;
        if (!fs.existsSync(uploadFolderPathNew)) {
          fs.mkdirSync(uploadFolderPathNew, { recursive: true });
        }
        await fs.promises.writeFile(filePath, Buffer.from(buffer));
        const moduleName = "report";
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
      }
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }
  async update(
    id: string,
    updateReportDto: UpdateReportDto,
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const report: any = await this.reportModel.findById({
        _id: new mongoose.Types.ObjectId(id),
      });

      if (!report || report.isDeleted) {
        throw TypeExceptions.NotFoundCommonFunction(
          RESPONSE_ERROR.REPORT_NOT_FOUND,
        );
      }

      if (loggedInUser._id.toString() != report?.createdBy.toString()) {
        throw TypeExceptions.NotFoundCommonFunction(RESPONSE_ERROR.NO_OWNER);
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { updatedBy, ...updatableFields } = updateReportDto;

      Object.assign(report, updatableFields);
      (report.companyId = new mongoose.Types.ObjectId(
        updatableFields.companyId,
      )),
        (report.facilityIds = updatableFields?.facilityIds.map(
          (id) => new mongoose.Types.ObjectId(id),
        )),
        (report.sharedTo = updatableFields?.sharedTo?.map(
          (id) => new mongoose.Types.ObjectId(id),
        )),
        (report.updatedBy = new mongoose.Types.ObjectId(loggedInUser._id)),
        await report.save();

      return report;
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }
  async findAllUser(req: Request, body: ReportUserList) {
    console.log("req: ", req);
    try {
      const {
        page = 1,
        limit = 10,
        search,
        sort_by,
        sort_order = "desc",
        facilityIds,
        role,
      } = body;
      const companyId = body.companyId;
      const findUser = await this.userModel.findOne({
        _id: req["user"]["_id"],
      });
      console.log("findUser: ", findUser);
      if (!findUser) {
        throw TypeExceptions.BadRequestCommonFunction(USER.USER_NOT_FOUND);
      }

      if (!page || !limit || page <= 0 || limit <= 0) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.INVALID_PAGE_AND_LIMIT_VALUE,
        );
      }

      const skip = (page - 1) * limit;

      const matchObj: FilterQuery<UserDocument> = {
        isDeleted: false,
        _id: { $ne: findUser._id },
      };

      // if (companyId)
      //   matchObj.companyId = new mongoose.Types.ObjectId(companyId);
      // if (facilityIds?.length) {
      //   matchObj.facilityIds = {
      //     $in: facilityIds.map((id) => new mongoose.Types.ObjectId(id)),
      //   };
      // }
      if (companyId && facilityIds?.length) {
        matchObj.$or = [
          { companyId: new mongoose.Types.ObjectId(companyId) },
          {
            facilityIds: {
              $in: facilityIds.map((id) => new mongoose.Types.ObjectId(id)),
            },
          },
        ];
      } else if (companyId) {
        matchObj.companyId = new mongoose.Types.ObjectId(companyId);
      } else if (facilityIds?.length) {
        matchObj.facilityIds = {
          $in: facilityIds.map((id) => new mongoose.Types.ObjectId(id)),
        };
      }

      if (role) matchObj.role = role;

      const pipeline = [];

      pipeline.push({ $match: matchObj });

      if (search) {
        const searchRegex = new RegExp(search.trim(), "i");

        pipeline.push({
          $match: {
            $or: [
              { firstName: { $regex: searchRegex } },
              { lastName: { $regex: searchRegex } },
              { email: { $regex: searchRegex } },
              { phoneNumber: { $regex: searchRegex } },
            ],
          },
        });
      }
      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.COMPANY,
          localField: "companyId",
          foreignField: "_id",
          as: "company",
        },
      });
      pipeline.push({
        $unwind: {
          path: "$company",
          preserveNullAndEmptyArrays: true,
        },
      });
      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.FACILITY,
          localField: "facilityIds",
          foreignField: "_id",
          as: "facilities",
        },
      });
      const sortField =
        !sort_by || sort_by.trim() === ""
          ? "createdAt"
          : sort_by === "name"
            ? "nameLower"
            : sort_by;

      if (sortField === "nameLower") {
        pipeline.push({
          $addFields: {
            name: { $concat: ["$firstName", " ", "$lastName"] },
          },
        });
        pipeline.push({
          $addFields: {
            nameLower: { $toLower: "$name" },
          },
        });
      }
      pipeline.push({
        $project: {
          _id: 1,
          name: {
            $concat: ["$firstName", " ", "$lastName"],
          },
          email: 1,
          phoneNumber: 1,
          "company.name": 1,
          "facilities.name": 1,
          profileImage: 1,
          role: 1,
          companyId: 1,
          facilityIds: 1,
          facilityId: 1,
          isActive: 1,
          createdAt: 1,
        },
      });

      // pipeline.push({
      //   $sort: {
      //     [sort_by === 'name' ? 'nameLower' : sort_by || 'createdAt']:
      //       sort_order === 'ASC' ? 1 : -1,
      //   },
      // });
      pipeline.push({
        $sort: {
          [sortField]: sort_order === "ASC" ? 1 : -1,
        },
      });

      pipeline.push({
        $facet: {
          userList: [{ $skip: skip }, { $limit: limit }],
          totalRecords: [{ $count: "count" }],
        },
      });

      const result = await this.userModel.aggregate(pipeline);

      result[0].totalRecords =
        result[0].totalRecords.length > 0 ? result[0].totalRecords[0].count : 0;

      return result[0];
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  async remove(id: string) {
    try {
      const report = await this.reportModel.findById({
        _id: new mongoose.Types.ObjectId(id),
      });

      if (!report) {
        throw TypeExceptions.NotFoundCommonFunction(
          RESPONSE_ERROR.REPORT_NOT_FOUND,
        );
      }

      report.isDeleted = true;

      await report.save();
      return report;
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }
}
