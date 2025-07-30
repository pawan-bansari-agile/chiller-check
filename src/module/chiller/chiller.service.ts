import { Injectable } from "@nestjs/common";
import {
  BulkUpdateChillerCostDto,
  ChillerByFacilityDto,
  ChillerListDto,
  CreateChillerDTO,
  UpdateChillerDto,
} from "./dto/chiller.dto";
import mongoose, { FilterQuery, Model } from "mongoose";
import {
  AMPERAGE_CHOICE,
  CHILLER_STATUS,
  CompanyStatus,
  MEASUREMENT_UNITS,
  REFRIGERANT_TYPE,
  Role,
} from "src/common/constants/enum.constant";
import { CustomError, TypeExceptions } from "src/common/helpers/exceptions";
import { InjectModel } from "@nestjs/mongoose";
import { Chiller, ChillerDocument } from "src/common/schema/chiller.schema";
import { Facility } from "src/common/schema/facility.schema";
import { Company } from "src/common/schema/company.schema";
import {
  CHILLER,
  RESPONSE_ERROR,
  USER,
} from "src/common/constants/response.constant";
import { TABLE_NAMES } from "src/common/constants/table-name.constant";
import { User } from "src/common/schema/user.schema";
import { EmailService } from "src/common/helpers/email/email.service";
import { generateTimelineDescription } from "src/common/helpers/timelineDescriptions/description.generator";
import { Timeline } from "src/common/schema/timeline.schema";
import { SchedulerService } from "src/common/scheduler/scheduler.service";

@Injectable()
export class ChillerService {
  constructor(
    @InjectModel(Chiller.name) private readonly chillerModel: Model<Chiller>,
    @InjectModel(Facility.name) private readonly facilityModel: Model<Facility>,
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Timeline.name) private readonly timelineModel: Model<Timeline>,
    private emailService: EmailService,
    private schedulerService: SchedulerService,
  ) {}

  private async scheduleTrialExpiryEmail(companyId: string, endDate: Date) {
    const emailDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // 24h before

    await this.schedulerService.scheduleJob(
      `trial-expiry-email-${companyId}`,
      "TRIAL_EMAIL",
      companyId,
      emailDate,
    );
  }

  private async scheduleCompanyDeactivation(companyId: string, endDate: Date) {
    const deactivationDate = new Date(
      endDate.getTime() + 0 * 24 * 60 * 60 * 1000,
    ); // Day 31

    await this.schedulerService.scheduleJob(
      `trial-deactivate-${companyId}`,
      "TRIAL_DEACTIVATE",
      companyId,
      deactivationDate,
    );
  }

  async create(dto: CreateChillerDTO) {
    try {
      const chillerData = {
        ...dto,
        companyId: dto.companyId
          ? new mongoose.Types.ObjectId(dto.companyId)
          : undefined,
        facilityId: dto.facilityId
          ? new mongoose.Types.ObjectId(dto.facilityId)
          : undefined,
      };

      // Convert companyId and facilityId to ObjectId
      // if (dto.companyId) {
      //   chillerData.companyId = new mongoose.Types.ObjectId(dto.companyId);
      // }
      // if (dto.facilityId) {
      //   chillerData.facilityId = new mongoose.Types.ObjectId(dto.facilityId);
      // }

      // Convert KWR to Tons if SI Metric
      // if (dto.unit === MEASUREMENT_UNITS.SIMetric && dto.kwr) {
      //   chillerData.tons = parseFloat((dto.kwr / 3.51685).toFixed(2));
      // }

      // Set oil pressure units based on unit type
      if (dto.unit === MEASUREMENT_UNITS.SIMetric) {
        chillerData.oilPresHighUnit = "Bar";
        chillerData.oilPresLowUnit = "Bar";
        chillerData.oilPresDifUnit = "Bar";
      } else {
        chillerData.oilPresHighUnit = "PSIG";
        chillerData.oilPresLowUnit = "InHg";
        chillerData.oilPresDifUnit = "PSIG";
      }

      // Handle useLoad and ampChoice
      console.log("✌️dto.ampChoice --->", dto.ampChoice);
      if (dto.ampChoice === AMPERAGE_CHOICE["Enter % Load"]) {
        console.log("inside the apmChoice check");
        chillerData.ampChoice = AMPERAGE_CHOICE["1-Phase"];
        console.log("✌️chillerData.ampChoice --->", chillerData.ampChoice);
        chillerData.useLoad = true;
      } else {
        chillerData.useLoad = false;
      }

      // Set highPressureRefrig based on refrigerant type
      const refrigConfig = REFRIGERANT_TYPE[dto.refrigType];
      // if (typeof refrigConfig === "object") {
      chillerData.highPressureRefrig = refrigConfig.isHighPressure;
      // }

      // const allFieldsSet = Object.values(dto).every((val) => {
      //   if (
      //     typeof val === 'boolean' ||
      //     typeof val === 'number' ||
      //     typeof val === 'string'
      //   )
      //     return true;
      //   return val !== null && val !== undefined && val !== '';
      // });

      // chillerData.status = allFieldsSet
      //   ? CHILLER_STATUS.Active
      //   : CHILLER_STATUS.Pending;
      console.log("✌️chillerData --->", chillerData);
      chillerData.status = this.determineStatus(chillerData);

      console.log("✌️chillerData.ampChoice --->", chillerData.ampChoice);

      // Create and save chiller
      const created = await this.chillerModel.create(chillerData);
      if (dto?.facilityId) {
        await this.facilityModel.updateOne(
          { _id: new mongoose.Types.ObjectId(dto?.facilityId) },
          {
            $inc: { totalChiller: 1 },
            $push: { chillers: created._id },
          },
        );
      }

      if (dto?.companyId) {
        await this.companyModel.updateOne(
          { _id: new mongoose.Types.ObjectId(dto?.companyId) },
          { $inc: { totalChiller: 1 } },
        );

        if (dto.companyId && chillerData.status === CHILLER_STATUS.Active) {
          const existingActiveChiller = await this.chillerModel.findOne({
            companyId: dto.companyId,
            status: CHILLER_STATUS.Active,
            _id: { $ne: created._id },
          });

          // const company = await this.companyModel.findById(dto.companyId);

          if (!existingActiveChiller) {
            const start = new Date();
            // const end = new Date(start);
            // const end = new Date(Date.now() + 3 * 60 * 1000);
            // end.setDate(end.getDate() + 30);
            // end.setHours(23, 59, 59, 999); // End at midnight on day 30
            const end = new Date(start.getTime() + 10 * 60 * 1000); // kept for QA. Update it to above original logic

            await this.companyModel.updateOne(
              { _id: dto.companyId },
              {
                $set: {
                  freeTrialStartDate: start,
                  freeTrialEndDate: end,
                  trialReminderSent: false,
                  status: CompanyStatus.DEMO,
                },
              },
            );

            // ✅ Schedule 24hr email reminder
            await this.scheduleTrialExpiryEmail(dto.companyId, end);

            // ✅ Schedule company auto-deactivation
            await this.scheduleCompanyDeactivation(dto.companyId, end);
          }
        }
      }
      return created;
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  async findAll(req: Request, body: ChillerListDto) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        sort_by,
        sort_order = "desc",
        facilityId,
      } = body;
      let companyId = body.companyId;
      if (!page || !limit || page <= 0 || limit <= 0) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.INVALID_PAGE_AND_LIMIT_VALUE,
        );
      }
      const findUser = await this.userModel.findOne({
        _id: req["user"]["_id"],
      });
      const matchObj: FilterQuery<ChillerDocument> = { isDeleted: false };
      // console.log('findUser: ', findUser);
      if (!findUser) {
        throw TypeExceptions.BadRequestCommonFunction(USER.USER_NOT_FOUND);
      }

      if (req["user"]["role"] == Role.CORPORATE_MANAGER) {
        if (findUser.companyId) {
          companyId = findUser.companyId.toString();
        } else {
          matchObj._id = { $in: [] };
        }
      }

      let facilityIds = [];
      let chillerIds = [];
      if (req["user"]["role"] == Role.FACILITY_MANAGER) {
        companyId = findUser.companyId.toString();

        if (findUser?.facilityIds?.length > 0) {
          if (findUser.facilityIds && findUser.facilityIds.length) {
            facilityIds = findUser.facilityIds.map(
              (id) => new mongoose.Types.ObjectId(id),
            );
          }
        }
        matchObj.facilityId = { $in: facilityIds };
      }

      if (req["user"]["role"] == Role.OPERATOR) {
        companyId = findUser.companyId.toString();

        if (findUser.facilityIds) {
          if (findUser.facilityIds && findUser.facilityIds.length) {
            facilityIds = findUser.facilityIds.map(
              (id) => new mongoose.Types.ObjectId(id),
            );
          }
        }
        if (findUser.chillerIds) {
          if (findUser.chillerIds && findUser.chillerIds.length) {
            chillerIds = findUser.chillerIds.map(
              (id) => new mongoose.Types.ObjectId(id),
            );
          }
        }
        matchObj.facilityId = { $in: facilityIds };
        matchObj._id = { $in: chillerIds };
      }

      const skip = (page - 1) * limit;

      // Validate and apply company filter
      if (companyId) {
        const existingCompany = await this.companyModel.findById(companyId);
        if (!existingCompany) {
          throw TypeExceptions.BadRequestCommonFunction(
            RESPONSE_ERROR.COMPANY_NOT_FOUND,
          );
        }
        matchObj.companyId = new mongoose.Types.ObjectId(companyId);
      }

      // Validate and apply facility filter
      if (facilityId) {
        const existingFacility = await this.facilityModel.findById(facilityId);
        if (!existingFacility) {
          throw TypeExceptions.BadRequestCommonFunction(
            RESPONSE_ERROR.FACILITY_NOT_FOUND,
          );
        }
        matchObj.facilityId = new mongoose.Types.ObjectId(facilityId);
        if (req["user"]["role"] == Role.OPERATOR) {
          matchObj._id = { $in: chillerIds };
        }
        console.log("chillerIds: ", chillerIds);
      } else {
        if (
          req["user"]["role"] == Role.ADMIN ||
          req["user"]["role"] == Role.SUB_ADMIN ||
          req["user"]["role"] == Role.CORPORATE_MANAGER
        ) {
          if (facilityIds.length) {
            matchObj.facilityId = { $in: facilityIds };
          }
          if (chillerIds.length) {
            matchObj._id = { $in: chillerIds };
          }
        }
      }
      const pipeline = [];

      // Step 1: Filter documents
      console.log("matchObj: ", matchObj);
      pipeline.push({ $match: matchObj });

      // Step 2: Lookup company
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

      // Step 3: Lookup facility
      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.FACILITY,
          localField: "facilityId",
          foreignField: "_id",
          as: "facility",
        },
      });

      pipeline.push({
        $unwind: {
          path: "$facility",
          preserveNullAndEmptyArrays: true,
        },
      });

      // Step 4: Group and transform
      pipeline.push({
        $project: {
          _id: 1,
          ChillerNo: 1,
          model: 1,
          make: 1,
          tons: 1,
          kwr: 1,
          efficiencyRating: 1,
          isActive: 1,
          createdAt: 1,
          status: 1,
          unit: 1,
          companyId: 1,
          facilityId: 1,
          companyName: "$company.name",
          facilityName: "$facility.name",
          chillerName: {
            $concat: [{ $toString: "$make" }, " ", { $toString: "$model" }],
          },
          energyCost: 1,
          serialNumber: 1,
          latestLog: 1,
        },
      });

      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.LOGS,
          let: { chillerId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$chillerId", "$$chillerId"],
                },
              },
            },
            { $sort: { readingDateUTC: -1 } },
            { $limit: 1 },
          ],
          as: "latestLog",
        },
      });

      pipeline.push({
        $addFields: {
          latestLog: { $arrayElemAt: ["$latestLog", 0] },
        },
      });

      pipeline.push({
        $unwind: {
          path: "$latestLog",
          preserveNullAndEmptyArrays: true,
        },
      });

      // Step 5: Search
      if (search) {
        const regex = new RegExp(search.trim(), "i");
        pipeline.push({
          $match: {
            $or: [
              { ChillerNo: { $regex: regex } },
              { model: { $regex: regex } },
              { make: { $regex: regex } },
              { companyName: { $regex: regex } },
              { facilityName: { $regex: regex } },
              { chillerName: { $regex: regex } },
            ],
          },
        });
      }

      // Step 6: Sort
      pipeline.push({
        $sort: {
          // [sort_by || 'createdAt']: sort_order === 'ASC' ? 1 : -1,
          [sort_by === "chillerName" ? "chillerName" : sort_by || "createdAt"]:
            sort_order === "ASC" ? 1 : -1,
        },
      });

      // Step 7: Pagination
      pipeline.push({
        $facet: {
          chillerList: [{ $skip: skip }, { $limit: limit }],
          totalRecords: [{ $count: "count" }],
        },
      });
      // console.log('✌️pipeline --->', pipeline);

      const result = await this.chillerModel.aggregate(pipeline);

      // const metricFieldMap: Record<string, string> = {
      //   efficiencyLoss: 'effLoss',
      //   condenserLoss: 'condAppLoss',
      //   evaporatorLoss: 'evapAppLoss',
      //   nonCondenserLoss: 'nonCondLoss',
      //   otherLoss: 'otherLoss',
      // };

      const generalConditions = findUser?.alerts?.general?.conditions || [];
      console.log("✌️generalConditions --->", generalConditions);

      const evaluateCondition = (
        value: number,
        operator: string,
        threshold: number,
      ): boolean => {
        switch (operator) {
          case ">":
            return value > threshold;
          case ">=":
            return value >= threshold;
          case "<":
            return value < threshold;
          case "<=":
            return value <= threshold;
          case "=":
            return value === threshold;
          default:
            return false;
        }
      };

      const getLossType = (
        metric: string,
        value: number,
      ): "normal" | "warning" | "alert" => {
        const condition = generalConditions.find((c) => c.metric === metric);
        if (!condition) return "normal";

        const { warning, alert } = condition;
        if (evaluateCondition(value, alert.operator, alert.threshold))
          return "alert";
        if (evaluateCondition(value, warning.operator, warning.threshold))
          return "warning";
        return "normal";
      };

      // const formattedChillers = result.map((chiller) => {
      //   const log = chiller?.latestLog;
      //   console.log('✌️log --->', log);

      //   const latestLog = log
      //     ? {
      //         ...log,
      //         effLoss: {
      //           value: log.effLoss ?? 0,
      //           type: getLossType('efficiencyLoss', log.effLoss ?? 0),
      //         },
      //         condAppLoss: {
      //           value: log.condAppLoss ?? 0,
      //           type: getLossType('condenserLoss', log.condAppLoss ?? 0),
      //         },
      //         evapAppLoss: {
      //           value: log.evapAppLoss ?? 0,
      //           type: getLossType('evaporatorLoss', log.evapAppLoss ?? 0),
      //         },
      //         nonCondLoss: {
      //           value: log.nonCondLoss ?? 0,
      //           type: getLossType('nonCondenserLoss', log.nonCondLoss ?? 0),
      //         },
      //         otherLoss: {
      //           value: log.otherLoss ?? 0,
      //           type: getLossType('otherLoss', log.otherLoss ?? 0),
      //         },
      //       }
      //     : undefined;

      //   // eslint-disable-next-line @typescript-eslint/no-unused-vars
      //   const { logs, ...rest } = chiller;

      //   return {
      //     ...rest,
      //     latestLog,
      //   };
      // });
      const formattedChillers = result[0]?.chillerList.map((chiller) => {
        const log = chiller?.latestLog;

        // Remove latestLog from chiller object temporarily
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { latestLog: _, ...rest } = chiller;

        // Conditionally construct the latestLog object if it exists
        if (log) {
          const enhancedLog = {
            ...log,
            effLoss: {
              value: log.effLoss ?? 0,
              type: getLossType("efficiencyLoss", log.effLoss ?? 0),
            },
            condAppLoss: {
              value: log.condAppLoss ?? 0,
              type: getLossType("condenserLoss", log.condAppLoss ?? 0),
            },
            evapAppLoss: {
              value: log.evapAppLoss ?? 0,
              type: getLossType("evaporatorLoss", log.evapAppLoss ?? 0),
            },
            nonCondLoss: {
              value: log.nonCondLoss ?? 0,
              type: getLossType("nonCondenserLoss", log.nonCondLoss ?? 0),
            },
            otherLoss: {
              value: log.otherLoss ?? 0,
              type: getLossType("otherLoss", log.otherLoss ?? 0),
            },
          };

          return {
            ...rest,
            latestLog: enhancedLog,
          };
        }

        // If no latest log, just return the base chiller data (no `latestLog` key)
        return rest;
      });
      // console.log('✌️formattedChillers --->', formattedChillers);

      // return {
      //   ...result[0],
      //   totalRecords: result[0]?.totalRecords?.[0]?.count || 0,
      // };
      return {
        chillerList: formattedChillers,
        totalRecords: formattedChillers?.totalRecords?.count || 0,
      };
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  async findByFacilityIds(dto: ChillerByFacilityDto) {
    try {
      // const facilityObjectIds = dto.facilityIds.map(
      //   (id) => new mongoose.Types.ObjectId(id),
      // );

      const {
        page = 1,
        limit = 10,
        search,
        sort_by,
        sort_order = "DESC",
        facilityIds,
      } = dto;

      if (!page || !limit || page <= 0 || limit <= 0) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.INVALID_PAGE_AND_LIMIT_VALUE,
        );
      }

      const skip = (page - 1) * limit;
      const facilityObjectIds = facilityIds.map(
        (id) => new mongoose.Types.ObjectId(id),
      );

      // const chillers = await this.chillerModel
      //   .find({ facilityId: { $in: facilityObjectIds }, isDeleted: false })
      //   .select("_id make model tons energyCost isActive facilityId companyId") // select only what’s needed
      //   .lean();

      // // Construct chillerName from make and model safely
      // const chillersWithName = chillers.map((chiller) => ({
      //   ...chiller,
      //   chillerName:
      //     `${String(chiller.make || "")} ${String(chiller.model || "")}`.trim(),
      // }));

      // return chillersWithName;

      const matchObj = {
        facilityId: { $in: facilityObjectIds },
        isDeleted: false,
      };

      const pipeline = [];

      pipeline.push({ $match: matchObj });

      if (search && search.trim() !== "") {
        const searchRegex = new RegExp(search.trim(), "i");
        pipeline.push({
          $match: {
            $or: [
              { make: { $regex: searchRegex } },
              { model: { $regex: searchRegex } },
              { ChillerNo: { $regex: searchRegex } },
            ],
          },
        });
      }

      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.FACILITY,
          localField: "facilityId",
          foreignField: "_id",
          as: "facility",
        },
      });

      pipeline.push({
        $unwind: {
          path: "$facility",
          preserveNullAndEmptyArrays: true,
        },
      });

      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.USERS,
          let: { chillerId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$role", Role.OPERATOR] },
                    { $isArray: "$chillerIds" },
                    { $gt: [{ $size: "$chillerIds" }, 0] },
                    { $in: ["$$chillerId", "$chillerIds"] },
                  ],
                },
              },
            },
          ],
          as: "operators",
        },
      });

      pipeline.push({
        $addFields: {
          chillerName: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$make", ""] },
                  " ",
                  { $ifNull: ["$model", ""] },
                ],
              },
            },
          },
          nameLower: {
            $toLower: {
              $trim: {
                input: {
                  $concat: [
                    { $ifNull: ["$make", ""] },
                    " ",
                    { $ifNull: ["$model", ""] },
                  ],
                },
              },
            },
          },
        },
      });

      pipeline.push({
        $project: {
          _id: 1,
          ChillerNo: 1,
          make: 1,
          model: 1,
          tons: 1,
          kwr: 1,
          energyCost: 1,
          facilityId: 1,
          companyId: 1,
          facilityName: "$facility.name",
          status: 1,
          chillerName: 1,
          totalOperators: { $size: "$operators" },
          createdAt: 1,
        },
      });

      // const sortField =
      //   !sort_by || sort_by.trim() === ''
      //     ? 'createdAt'
      //     : sort_by === 'chillerName'
      //       ? 'nameLower'
      //       : sort_by;

      // pipeline.push({
      //   $sort: {
      //     [sortField]: sort_order.toUpperCase() === 'ASC' ? 1 : -1,
      //   },
      // });
      // 🔃 Sort
      let sortField = "createdAt";

      if (sort_by && sort_by.trim() !== "") {
        switch (sort_by) {
          case "chillerName":
            sortField = "nameLower";
            break;
          case "energyCost":
          case "totalOperators":
          case "status":
            sortField = sort_by;
            break;
          default:
            sortField = sort_by;
        }
      }

      pipeline.push({
        $sort: {
          [sortField]: sort_order?.toUpperCase() === "ASC" ? 1 : -1,
        },
      });

      // pipeline.push({
      //   $sort: { createdAt: -1 },
      // });

      pipeline.push({
        $facet: {
          chillerList: [{ $skip: skip }, { $limit: limit }],
          totalRecords: [{ $count: "count" }],
        },
      });

      // const chillers = await this.chillerModel.aggregate(pipeline);

      // const chillers = await this.chillerModel.aggregate([
      //   {
      //     $match: {
      //       facilityId: { $in: facilityObjectIds },
      //       isDeleted: false,
      //     },
      //   },
      //   {
      //     $lookup: {
      //       from: TABLE_NAMES.FACILITY, // assumes collection name is 'facilities'
      //       localField: 'facilityId',
      //       foreignField: '_id',
      //       as: 'facility',
      //     },
      //   },
      //   { $unwind: '$facility' },
      //   {
      //     $lookup: {
      //       from: TABLE_NAMES.USERS,
      //       let: { chillerId: '$_id' },
      //       pipeline: [
      //         {
      //           $match: {
      //             $expr: {
      //               $in: ['$$chillerId', '$chillerIds'],
      //             },
      //           },
      //         },
      //         {
      //           $match: {
      //             role: Role.OPERATOR, // optional: filter only operators
      //           },
      //         },
      //       ],
      //       as: 'operators',
      //     },
      //   },
      //   {
      //     $project: {
      //       _id: 1,
      //       ChillerNo: 1,
      //       make: 1,
      //       model: 1,
      //       tons: 1,
      //       energyCost: 1,
      //       facilityId: 1,
      //       companyId: 1,
      //       facilityName: '$facility.name',
      //       status: 1,
      //       totalOperators: { $size: '$operators' },
      //     },
      //   },
      // ]);

      // console.log('✌️chillers --->', chillers);
      // return chillers;
      const result = await this.chillerModel.aggregate(pipeline);
      const response = result[0] || {
        chillerList: [],
        totalRecords: [],
      };

      return {
        totalRecords: response.totalRecords.length
          ? response.totalRecords[0].count
          : 0,
        chillerList: response.chillerList,
      };
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  async findOne(id: string) {
    try {
      const objectId = new mongoose.Types.ObjectId(id);

      const matchObj = {
        isDeleted: false,
        _id: objectId,
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
        $unwind: {
          path: "$company",
          preserveNullAndEmptyArrays: true,
        },
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
        $unwind: {
          path: "$facility",
          preserveNullAndEmptyArrays: true,
        },
      });

      pipeline.push({
        $project: {
          companyId: 1,
          facilityId: 1,
          companyName: "$company.name",
          facilityName: "$facility.name",
          type: 1,
          unit: 1,
          ChillerNo: 1,
          weeklyHours: 1,
          weeksPerYear: 1,
          avgLoadProfile: 1,
          desInletWaterTemp: 1,
          make: 1,
          model: 1,
          status: 1,
          serialNumber: 1,
          manufacturedYear: 1,
          tons: 1,
          kwr: 1,
          efficiencyRating: 1,
          energyCost: 1,
          refrigType: 1,
          highPressureRefrig: 1,
          useEvapRefrigTemp: 1,
          designVoltage: 1,
          voltageChoice: 1,
          fullLoadAmps: 1,
          ampChoice: 1,
          condDPDrop: 1,
          condDPDropUnit: 1,
          condPressureUnit: 1,
          condAPDropUnit: 1,
          condApproach: 1,
          evapDPDrop: 1,
          evapDPDropUnit: 1,
          evapPressureUnit: 1,
          evapAPDropUnit: 1,
          evapApproach: 1,
          evapDOWTemp: 1,
          compOPIndicator: 1,
          userNote: 1,
          havePurge: 1,
          maxPurgeTime: 1,
          purgeReadingUnit: 1,
          haveBearingTemp: 1,
          useRunHours: 1,
          updatedBy: 1,
          oilPresHighUnit: 1,
          oilPresLowUnit: 1,
          oilPresDifUnit: 1,
          condDesignDeltaT: 1,
          condDesignFlow: 1,
          evapDesignDeltaT: 1,
          evapDesignFlow: 1,
          numberOfCompressors: 1,
          useLoad: 1,
        },
      });

      const result = await this.chillerModel.aggregate(pipeline);

      // if (result.length) {
      //   return result[0]; // Return the first result as the response
      // } else {
      //   throw TypeExceptions.BadRequestCommonFunction(
      //     RESPONSE_ERROR.FACILITY_NOT_FOUND,
      //   );
      // }
      if (!result.length) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.FACILITY_NOT_FOUND,
        );
      }

      const chiller = result[0];

      // if (chiller.unit === MEASUREMENT_UNITS.SIMetric) {
      //   // chiller.tons = parseFloat((chiller.tons * 3.51685).toFixed(2));
      //   // chiller.tons = Math.round(chiller.tons * 3.51685 * 100) / 100;
      //   const kwr = chiller.tons * 3.51685;
      //   chiller.tons = Math.round(kwr * 10000) / 10000; // reverse with 4 decimals
      // }

      return chiller;
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  async bulkUpdateEnergyCost(req: Request, body: BulkUpdateChillerCostDto) {
    try {
      const userId = req["user"]["_id"];

      const { chillerIds, energyCost } = body;

      const objectIds = chillerIds.map((id) => new mongoose.Types.ObjectId(id));

      // Find valid chillers (not deleted and active)
      const validChillers = await this.chillerModel.find({
        _id: { $in: objectIds },
        isDeleted: false,
        status: CHILLER_STATUS.Active,
      });

      if (validChillers.length === 0) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.NO_VAIL_CHILLER_FOUND,
        );
      }

      const validChillerIds = validChillers.map((chiller) => chiller._id);

      const result = await this.chillerModel.updateMany(
        { _id: { $in: validChillerIds } },
        { $set: { energyCost } },
      );
      const user = await this.userModel
        .findById(userId)
        .select("firstName lastName")
        .lean();

      const fullName = user
        ? `${user.firstName} ${user.lastName}`
        : "Unknown User";

      const title = "Chiller Bulk Updated";
      const description = generateTimelineDescription(title, {
        updatedBy: fullName,
      });
      for (const element of validChillerIds) {
        await this.timelineModel.create({
          chillerId: element,
          title: title,
          description: description,
          updatedBy: new mongoose.Types.ObjectId(userId),
        });
      }

      return {
        message: `${result.modifiedCount} chiller(s) updated successfully.`,
        modifiedCount: result.modifiedCount,
      };
    } catch (error) {
      console.log("error: ", error);
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  async inactivateChiller(chillerId: string, status: string, userId: string) {
    try {
      // const userId = req['user']['_id'];
      // console.log('✌️userId --->', userId);
      const allowedStatuses = [CHILLER_STATUS.Active, CHILLER_STATUS.InActive];
      if (!allowedStatuses.includes(status)) {
        throw TypeExceptions.BadRequestCommonFunction("Invalid status value");
      }
      const chiller = await this.chillerModel.findOne({
        _id: new mongoose.Types.ObjectId(chillerId),
        isDeleted: false,
      });

      if (!chiller) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.CHILLER_NOT_FOUND,
        );
      }

      if (chiller.status === status) {
        throw TypeExceptions.BadRequestCommonFunction(
          `Chiller is already ${status}`,
        );
      }

      // Update status
      chiller.status = status;
      await chiller.save();

      // Notify company & facility manager + all operators
      await this.sendInactivationNotification(chiller, status);

      const user = await this.userModel
        .findById(userId)
        .select("firstName lastName")
        .lean();

      const fullName = user
        ? `${user.firstName} ${user.lastName}`
        : "Unknown User";

      const title =
        status === CHILLER_STATUS.Active
          ? "Chiller Activated"
          : "Chiller Inactivated";

      const description = generateTimelineDescription(title, {
        updatedBy: fullName,
      });

      await this.timelineModel.create({
        chillerId: chiller._id,
        title,
        description,
        updatedBy: new mongoose.Types.ObjectId(userId),
      });

      const message =
        status == CHILLER_STATUS.Active
          ? CHILLER.CHILLER_ACTIVATED
          : CHILLER.CHILLER_INACTIVATED;

      return message;
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  private async sendInactivationNotification(chiller, status: string) {
    const company = await this.companyModel.findById(chiller.companyId).lean();
    const facility = await this.facilityModel
      .findById(chiller.facilityId)
      .lean();

    // You might be using a user-role system. Assuming you can fetch managers & operators like this:
    const managers = await this.userModel.find({
      $or: [
        { role: "company_manager", companyId: chiller.companyId },
        { role: "facility_manager", facilityId: chiller.facilityId },
      ],
    });

    const operators = await this.userModel.find({
      role: "operator",
      chillers: chiller._id, // assuming a list of chillers assigned to operator
    });

    const recipients = [...managers, ...operators];

    const message = `Chiller "${chiller.model}" at Facility "${facility?.name}" in Company "${company?.name}" has been marked as "${status}".`;

    for (const user of recipients) {
      await this.emailService.emailSender({
        to: user.email,
        subject: `Chiller ${chiller?.model} ${status}`,
        // message: `Chiller ${chiller?.model} at Facility ${facility?.name} under Company ${company?.name} has been inactivated. No new entries will be accepted.`,
        html: message,
      });
    }
  }

  async update(id: string, body: UpdateChillerDto, userId: string) {
    try {
      const chiller = await this.chillerModel.findOne({
        _id: new mongoose.Types.ObjectId(id),
        isDeleted: false,
      });

      if (!chiller) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.CHILLER_NOT_FOUND,
        );
      }

      // Prevent updating immutable fields
      const IMMUTABLE_FIELDS = ["companyId", "facilityId", "type", "unit"];
      for (const field of IMMUTABLE_FIELDS) {
        if (field in body) {
          delete body[field];
        }
      }

      // if (chiller.unit === MEASUREMENT_UNITS.SIMetric && body.kwr) {
      //   // body.tons = parseFloat((body.kwr / 3.51685).toFixed(2));
      //   // body.tons = Math.round((body.kwr * 10000) / 3.51685) / 10000;
      //   const tons = body.kwr / 3.51685;
      //   body.tons = Math.round(tons * 10000) / 10000; // round to 4 decimals
      // }

      if (body.unit === MEASUREMENT_UNITS.SIMetric) {
        body.oilPresHighUnit = "Bar";
        body.oilPresLowUnit = "Bar";
        body.oilPresDifUnit = "Bar";
      } else {
        body.oilPresHighUnit = "PSIG";
        body.oilPresLowUnit = "InHg";
        body.oilPresDifUnit = "PSIG";
      }

      if (body.ampChoice === AMPERAGE_CHOICE["Enter % Load"]) {
        body.ampChoice = AMPERAGE_CHOICE["1-Phase"];
        body.useLoad = true;
      } else {
        body.useLoad = false;
      }

      const refrigConfig = REFRIGERANT_TYPE[body.refrigType];

      body.highPressureRefrig = refrigConfig.isHighPressure;

      const originalChiller = chiller.toObject();

      const updatedFields = Object.keys(body)
        // .filter((key) => key !== 'kwr')
        .filter((key) => {
          const oldValue = originalChiller[key];
          const newValue = body[key];
          return (
            newValue !== undefined &&
            JSON.stringify(newValue) !== JSON.stringify(oldValue)
          );
        });

      Object.assign(chiller, body);
      chiller.status = this.determineStatus(chiller);

      if (chiller.status == CHILLER_STATUS.Active) {
        console.log("inside chillerstatus check in chiller update");
        const company = await this.companyModel.findOne({
          _id: chiller.companyId,
        });

        // const existingActiveChillers = await this.chillerModel.findOne({
        //   companyId: company._id,
        //   // status: CHILLER_STATUS.Active,
        //   // _id: { $ne: chiller._id },
        // });
        // console.log('✌️existingActiveChillers --->', existingActiveChillers);

        if (company.status == CompanyStatus.PROSPECT) {
          console.log("inside the company status update check");
          await this.companyModel.findOneAndUpdate(
            { _id: company._id },
            { status: CompanyStatus.DEMO },
          );
        }
      }

      console.log("✌️body.companyId --->", body.companyId);
      console.log(
        "✌️chiller.status === CHILLER_STATUS.Active --->",
        chiller.status === CHILLER_STATUS.Active,
      );
      if (chiller.companyId && chiller.status === CHILLER_STATUS.Active) {
        const existingActiveChiller = await this.chillerModel.findOne({
          companyId: chiller.companyId,
          status: CHILLER_STATUS.Active,
          _id: { $ne: chiller._id },
        });
        console.log("✌️existingActiveChiller --->", existingActiveChiller);
        console.log("inside existing chiller check");

        // const company = await this.companyModel.findById(dto.companyId);

        if (!existingActiveChiller) {
          console.log("inside existing chiller check");
          const start = new Date();
          // const end = new Date(start);
          // const end = new Date(Date.now() + 3 * 60 * 1000);
          // end.setDate(end.getDate() + 30);
          // end.setHours(23, 59, 59, 999); // End at midnight on day 30
          const end = new Date(start.getTime() + 10 * 60 * 1000); // kept for QA. Update it to above original logic

          await this.companyModel.updateOne(
            { _id: chiller.companyId },
            {
              $set: {
                freeTrialStartDate: start,
                freeTrialEndDate: end,
                trialReminderSent: false,
                status: CompanyStatus.DEMO,
              },
            },
          );

          // ✅ Schedule 24hr email reminder
          await this.scheduleTrialExpiryEmail(
            chiller.companyId.toString(),
            end,
          );

          // ✅ Schedule company auto-deactivation
          await this.scheduleCompanyDeactivation(
            chiller.companyId.toString(),
            end,
          );
        }
      }

      const result = await chiller.save();

      if (updatedFields.length > 0) {
        const user = await this.userModel
          .findById(userId)
          .select("firstName lastName")
          .lean();
        const fullName = user
          ? `${user.firstName} ${user.lastName}`
          : "Unknown User";

        const title = "Chiller Updated";
        const description = generateTimelineDescription(title, {
          updatedFields,
          updatedBy: fullName,
        });

        await this.timelineModel.create({
          chillerId: chiller._id,
          title,
          description,
          updatedBy: new mongoose.Types.ObjectId(userId),
        });
      }

      return result;
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  private determineStatus(chiller: Partial<Chiller>): string {
    // Define business-required fields, including some DTO-optional ones
    const REQUIRED_FIELDS = [
      "ChillerNo",
      "weeklyHours",
      "weeksPerYear",
      "avgLoadProfile",
      "desInletWaterTemp",
      "make",
      "model",
      "serialNumber", // Optional in DTO, required for log
      "manufacturedYear",
      "refrigType",
      "efficiencyRating",
      "energyCost",
      "useEvapRefrigTemp",
      "designVoltage",
      "voltageChoice",
      "fullLoadAmps",
      "ampChoice",
      "condPressureUnit",
      "condAPDropUnit",
      "condApproach",
      "evapPressureUnit",
      "evapAPDropUnit",
      "evapDOWTemp",
      "compOPIndicator",
      "havePurge",
      "haveBearingTemp",
      "useRunHours",
      "numberOfCompressors",
      "condDesignDeltaT", // Optional in DTO, required for log
      "condDesignFlow", // Optional in DTO, required for log
      "evapDesignDeltaT", // Optional in DTO, required for log
      "evapDesignFlow", // Optional in DTO, required for log
    ];

    for (const field of REQUIRED_FIELDS) {
      const value = chiller[field];
      const isEmpty =
        value === null ||
        value === undefined ||
        (typeof value === "string" && value.trim() === "");

      if (isEmpty) {
        return CHILLER_STATUS.Pending;
      }
    }

    return CHILLER_STATUS.Active;
  }

  async findAllActiveChillers(dto) {
    const facilityId = dto.facilityId;

    const existingFacility = await this.facilityModel.findById(
      new mongoose.Types.ObjectId(facilityId),
    );

    console.log("✌️existingFacility --->", existingFacility);

    if (!existingFacility) {
      throw TypeExceptions.BadRequestCommonFunction(
        RESPONSE_ERROR.FACILITY_NOT_FOUND,
      );
    }

    const activeChillers = await this.chillerModel.find({
      facilityId: existingFacility._id,
      status: CHILLER_STATUS.Active,
    });

    if (activeChillers.length == 0) {
      throw TypeExceptions.BadRequestCommonFunction(
        RESPONSE_ERROR.NO_ACTIVE_CHILLERS,
      );
    }

    return activeChillers;
  }

  remove(id: number) {
    return `This action removes a #${id} chiller`;
  }
}
