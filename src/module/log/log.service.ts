/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from "@nestjs/common";
import {
  CreateLogDTO,
  ExportLogIds,
  FileUploadLogDto,
  LogListDto,
  UpdateLogDto,
} from "./dto/logs.dto";
import { InjectModel } from "@nestjs/mongoose";
import { Logs } from "src/common/schema/logs.schema";
import mongoose, { Model } from "mongoose";
import { Timeline } from "src/common/schema/timeline.schema";
import { Chiller } from "src/common/schema/chiller.schema";
import {
  AuthExceptions,
  CustomError,
  TypeExceptions,
} from "src/common/helpers/exceptions";
import { RESPONSE_ERROR } from "src/common/constants/response.constant";
import { User } from "src/common/schema/user.schema";
import { LogRecordHelper } from "src/common/helpers/logs/log.helper";
import {
  ChillerStatus,
  // CHILLER_STATUS,
  MEASUREMENT_UNITS,
  OIL_PRESSURE_DIFF,
  PURGE_READING_UNIT,
  Role,
} from "src/common/constants/enum.constant";
import {
  Conversion,
  // ConversionDocument,
} from "src/common/schema/conversion.schema";
import { Facility } from "src/common/schema/facility.schema";
import { AltitudeCorrection } from "src/common/schema/altitudeCorrection.schema";
import { generateTimelineDescription } from "src/common/helpers/timelineDescriptions/description.generator";
import { TABLE_NAMES } from "src/common/constants/table-name.constant";
import { Company } from "src/common/schema/company.schema";
import { requiredFields } from "src/common/helpers/badLog/badLogHelper";
import { BadLog } from "src/common/schema/badLogs.schema";
import * as ExcelJS from "exceljs";
import { Workbook } from "exceljs";
import * as fs from "fs";

@Injectable()
export class LogService {
  constructor(
    @InjectModel(Logs.name) private readonly logsModel: Model<Logs>,
    @InjectModel(Timeline.name) private readonly timelineModel: Model<Timeline>,
    @InjectModel(Chiller.name) private readonly chillerModel: Model<Chiller>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Facility.name) private readonly facilityModel: Model<Facility>,
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
    @InjectModel(BadLog.name) private readonly badLogModel: Model<BadLog>,
    @InjectModel(AltitudeCorrection.name)
    private readonly altCorrectionModel: Model<AltitudeCorrection>,
    @InjectModel(Conversion.name)
    private conversionModel: Model<Conversion>,
  ) {}

  private isNumeric(value: any): boolean {
    return !isNaN(parseFloat(value)) && isFinite(value);
  }

  async create(createLogDto: CreateLogDTO, userId) {
    try {
      const user = await this.userModel.findOne({ _id: userId });
      if (!user) {
        throw TypeExceptions.NotFoundCommonFunction(
          RESPONSE_ERROR.USER_NOT_FOUND,
        );
      }

      const chiller = await this.chillerModel.findById(createLogDto.chillerId);
      // .select('purgeReadingUnit');

      if (!chiller) {
        // throw new NotFoundException('Chiller not found');
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.CHILLER_NOT_FOUND,
        );
      }

      if (chiller.status != ChillerStatus.Active) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.CHILLER_NOT_FOUND,
        );
      }

      const facility = await this.facilityModel.findById({
        _id: chiller.facilityId,
      });

      if (!facility) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.FACILITY_NOT_FOUND,
        );
      }

      const isMetric =
        chiller.unit == MEASUREMENT_UNITS.SIMetric ? true : false;

      const logData: any = {
        ...createLogDto,
        chillerId: createLogDto.chillerId
          ? new mongoose.Types.ObjectId(createLogDto.chillerId)
          : undefined,
        userId: new mongoose.Types.ObjectId(user._id),
      };

      logData.readingDateUTC = LogRecordHelper.convertToUTCString(
        logData.readingDate,
        logData.readingTime,
        logData.readingTimeZone,
      );

      if (
        chiller.ampChoice == "1-Phase" ||
        chiller.ampChoice == "Enter % Load"
      ) {
        logData.ampsPhase1 = createLogDto.ampsPhase1;
        logData.ampsPhase2 = 0;
        logData.ampsPhase3 = 0;
      } else if (chiller.ampChoice == "3-Phase") {
        logData.ampsPhase1 = createLogDto.ampsPhase1;
        logData.ampsPhase2 = createLogDto.ampsPhase2;
        logData.ampsPhase3 = createLogDto.ampsPhase3;
      }

      if (chiller.voltageChoice == "Enter % Load") {
        logData.voltsPhase1 = 0;
        logData.voltsPhase2 = 0;
        logData.voltsPhase3 = 0;
      } else if (chiller.voltageChoice == "1-Phase") {
        logData.voltsPhase1 = createLogDto.voltsPhase1;
        logData.voltsPhase2 = 0;
        logData.voltsPhase3 = 0;
      } else if (chiller.voltageChoice == "3-Phase") {
        logData.voltsPhase1 = createLogDto.voltsPhase1;
        logData.voltsPhase2 = createLogDto.voltsPhase2;
        logData.voltsPhase3 = createLogDto.voltsPhase3;
      }

      let purgeTime = 0;

      if (chiller.purgeReadingUnit == PURGE_READING_UNIT["Min. only"]) {
        purgeTime = logData.purgeTimeMin || 0;
      } else {
        const purgeTimeMinTemp = this.isNumeric(logData.purgeTimeMin)
          ? logData.purgeTimeMin
          : 0;
        const purgeTimeHrTemp = this.isNumeric(logData.purgeTimeHr)
          ? logData.purgeTimeHr
          : 0;
        purgeTime = purgeTimeHrTemp * 60 + purgeTimeMinTemp;
      }

      const previousLog = await this.logsModel
        .findOne({
          chillerId: new mongoose.Types.ObjectId(createLogDto.chillerId),
          readingDate: { $lt: new Date(createLogDto.readingDate) },
          runHours: { $ne: null },
          isValid: { $ne: true },
        })
        .sort({ readingDate: -1 })
        .select({ runHours: 1, readingDate: 1 });

      if (previousLog) {
        logData.lastRunHours = previousLog.runHours;
        logData.lastRunHoursReadingDate = new Date(
          previousLog.readingDate,
        ).getTime();
      }

      const nextLog = await this.logsModel
        .findOne({
          chillerId: new mongoose.Types.ObjectId(createLogDto.chillerId),
          readingDate: { $gt: new Date(createLogDto.readingDate) },
          runHours: { $ne: null },
          isValid: { $ne: true },
        })
        .sort({ readingDate: 1 })
        .select({ runHours: 1, readingDate: 1 });

      if (nextLog) {
        logData.nextRunHours = nextLog.runHours;
        logData.nextRunHoursReadingDate = new Date(
          nextLog.readingDate,
        ).getTime();
      }

      logData.condInletLoss = LogRecordHelper.roundToFourDecimals(
        LogRecordHelper.calcCondInletLoss(logData, isMetric),
      );

      logData.condAppLoss = LogRecordHelper.roundToFourDecimals(
        LogRecordHelper.calcCondAppLoss(logData, chiller),
      );

      const condApproach = LogRecordHelper.getCondenserApproach(
        logData,
        chiller,
      );
      logData.condApproach = LogRecordHelper.roundToFourDecimals(
        logData.condApproach ?? condApproach,
      );

      logData.condAppVariance =
        logData.condAppVariance ??
        LogRecordHelper.roundToFourDecimals(
          LogRecordHelper.getCondAppVariance(logData, chiller),
        );

      const actualLoad = (logData.actualLoad =
        LogRecordHelper.roundToFourDecimals(
          LogRecordHelper.getLoadFactor(
            logData,
            chiller,
            LogRecordHelper.roundToFourDecimals(
              LogRecordHelper.getMaxAmp(logData),
            ),
          ),
        ) * 100);

      logData.actualLoad = actualLoad.toFixed(4);

      logData.evapTempLoss = LogRecordHelper.roundToFourDecimals(
        LogRecordHelper.calcEvapTempLoss(logData, chiller),
      );
      logData.evapAppLoss = LogRecordHelper.roundToFourDecimals(
        LogRecordHelper.calcEvapAppLoss(logData, chiller),
      );
      logData.nonCondLoss = LogRecordHelper.roundToFourDecimals(
        LogRecordHelper.calcNonCondLoss(logData, chiller),
      );

      const { deltaLoss, condFlow } = LogRecordHelper.calcDeltaLoss(
        logData,
        chiller,
      );

      logData.deltaLoss = LogRecordHelper.roundToFourDecimals(deltaLoss);
      logData.condFlow = LogRecordHelper.roundToFourDecimals(condFlow);

      logData.targetCost = LogRecordHelper.roundToFourDecimals(
        LogRecordHelper.calculateAnnualTargetCost(chiller),
      );
      const costPerHour = LogRecordHelper.roundToFourDecimals(
        LogRecordHelper.calculateTargetCostPerHour(chiller, logData.energyCost),
      );
      logData.actualCost = costPerHour;

      logData.condInletLossCost = LogRecordHelper.roundToFourDecimals(
        logData.condInletLoss * costPerHour,
      );
      logData.condAppLossCost = LogRecordHelper.roundToFourDecimals(
        logData.condAppLoss * costPerHour,
      );
      logData.evapTempLossCost = LogRecordHelper.roundToFourDecimals(
        logData.evapTempLoss * costPerHour,
      );
      logData.evapAppLossCost = LogRecordHelper.roundToFourDecimals(
        logData.evapAppLoss * costPerHour,
      );
      logData.nonCondLossCost = LogRecordHelper.roundToFourDecimals(
        logData.nonCondLoss * costPerHour,
      );
      logData.deltaLossCost = LogRecordHelper.roundToFourDecimals(
        logData.deltaLoss * costPerHour,
      );

      logData.lossCost =
        logData.condInletLossCost +
        logData.condAppLossCost +
        logData.evapTempLossCost +
        logData.evapAppLossCost +
        logData.nonCondLossCost +
        logData.deltaLossCost;

      logData.totalLoss = LogRecordHelper.roundToFourDecimals(
        logData.actualCost + logData.lossCost,
      );

      logData.effLoss = Number(logData.totalLoss?.toFixed(2));
      // new Intl.NumberFormat("en-US", {
      //   minimumFractionDigits: 2,
      //   maximumFractionDigits: 2,
      // }).format(logData.totalLoss);

      logData.energyCost = chiller.energyCost;

      logData.evapFlow = LogRecordHelper.roundToFourDecimals(
        LogRecordHelper.calcEvapFlow(logData, chiller),
      );

      logData.calculatedEvapRefrigTemp = LogRecordHelper.roundToFourDecimals(
        await LogRecordHelper.calcEvapRefrigTemp(
          logData,
          chiller,
          this.conversionModel,
        ),
      );

      const finalEvapRefrigTemp = LogRecordHelper.getFinalRefrigTemp(
        logData,
        chiller,
        logData.calculatedEvapRefrigTemp,
      );

      logData.evapRefrigTemp =
        LogRecordHelper.roundToFourDecimals(finalEvapRefrigTemp);

      const evapApproach = LogRecordHelper.getEvapApproach(
        logData,
        chiller,
        finalEvapRefrigTemp,
      );
      logData.evapApproach = Number(evapApproach.toFixed(4));

      console.log("✌️logData --->", logData);
      logData.evapAppVariance = LogRecordHelper.roundToFourDecimals(
        await LogRecordHelper.getEvapAppVariance(
          logData,
          chiller,
          this.conversionModel,
        ),
      );

      const { EFLCondAppLoss, EFLEvapAppLoss } = LogRecordHelper.getEFLLoss(
        logData,
        chiller,
      );
      logData.EFLCondAppLoss =
        LogRecordHelper.roundToFourDecimals(EFLCondAppLoss);
      logData.EFLEvapAppLoss =
        LogRecordHelper.roundToFourDecimals(EFLEvapAppLoss);

      const { ampImbalance, voltImbalance } = LogRecordHelper.checkImbalances(
        logData,
        chiller,
      );

      logData.ampImbalance = LogRecordHelper.roundToFourDecimals(ampImbalance);
      logData.voltImbalance =
        LogRecordHelper.roundToFourDecimals(voltImbalance);

      switch (chiller.compOPIndicator) {
        case OIL_PRESSURE_DIFF["Enter High and Low Pressures"]:
          logData.oilPresHigh = createLogDto.oilPresHigh;
          logData.oilPresLow = createLogDto.oilPresLow;
          logData.oilPresDif = 0;
          break;

        case OIL_PRESSURE_DIFF["Enter High Pressure Only"]:
          logData.oilPresHigh = createLogDto.oilPresHigh;
          logData.oilPresLow = 0;
          logData.oilPresDif = 0;
          break;

        case OIL_PRESSURE_DIFF["Enter Differential Directly"]:
          logData.oilPresDif = createLogDto.oilPresDif;
          logData.oilPresHigh = 0;
          logData.oilPresLow = 0;
          break;

        case OIL_PRESSURE_DIFF["Do Not Log Lube System"]:
          logData.oilPresHigh = 0;
          logData.oilPresLow = 0;
          logData.oilPresDif = 0;
          logData.oilSumpTemp = 0;
          logData.oilLevel = 0;
          break;

        default:
          // Any other case (if exists)
          logData.oilPresHigh = 0;
          logData.oilPresLow = 0;
          logData.oilPresDif = 0;
          logData.oilSumpTemp = createLogDto.oilSumpTemp;
          logData.oilLevel = createLogDto.oilLevel;
          break;
      }

      if (chiller.haveBearingTemp) {
        logData.bearingTemp = createLogDto.bearingTemp;
      } else {
        logData.bearingTemp = 0;
      }

      const finalOilDiff = LogRecordHelper.getFinalOilDiff(logData, chiller);
      logData.finalOilDiff = LogRecordHelper.roundToFourDecimals(finalOilDiff);

      const { nonCondensables, thisCondRefrigTemp } =
        await LogRecordHelper.getNonCondensables(
          logData,
          chiller,
          this.conversionModel,
        );

      logData.nonCondensables =
        LogRecordHelper.roundToFourDecimals(nonCondensables);

      if (chiller.highPressureRefrig) {
        logData.calculatedCondRefrigTemp =
          LogRecordHelper.roundToFourDecimals(thisCondRefrigTemp);
      }

      logData.validRunHours = await LogRecordHelper.validateRunHoursField(
        logData,
        chiller,
      );

      logData.KWHLoss = LogRecordHelper.roundToFourDecimals(
        LogRecordHelper.calcKWHLoss(logData),
      );

      logData.BTULoss = LogRecordHelper.roundToFourDecimals(
        LogRecordHelper.calcBTULoss(logData),
      );

      logData.CO2 = LogRecordHelper.roundToFourDecimals(
        LogRecordHelper.calcCO2(logData),
      );

      logData.altitudeCorrection = LogRecordHelper.roundToFourDecimals(
        await LogRecordHelper.getAltitudeCorrectionByLocation(
          facility,
          this.altCorrectionModel,
        ),
      );

      if (logData?.numberOfCompressors == 1) {
        logData.comp1RunHours = createLogDto.comp1RunHours;
        logData.comp2RunHours = undefined;
        logData.comp1RunHourStart = createLogDto.comp1RunHourStart;
        logData.comp2RunHourStart = undefined;
      } else if (logData?.numberOfCompressors == 2) {
        logData.comp1RunHours = createLogDto?.comp1RunHours;
        logData.comp2RunHours = createLogDto?.comp2RunHours;
        logData.comp1RunHourStart = createLogDto?.comp1RunHourStart;
        logData.comp2RunHourStart = createLogDto?.comp2RunHourStart;
      }

      logData.otherLoss =
        logData.condInletLoss + logData.evapTempLoss + logData.deltaLoss;

      const logPayload = {
        ...logData,
        purgeTimeMin: purgeTime,
        updatedBy: user._id,
      };
      console.log("✌️logPayload --->", logPayload);

      const hasInvalidFields = requiredFields.some((field) => {
        const value = logPayload[field];
        return (
          value === null ||
          value === undefined ||
          (typeof value === "number" && isNaN(value))
        );
      });

      if (hasInvalidFields) {
        const keysToCopy = [
          "readingDate",
          "readingDateUTC",
          "condInletTemp",
          "condOutletTemp",
          "condRefrigTemp",
          "condPressure",
          "condAPDrop",
          "evapInletTemp",
          "evapOutletTemp",
          "evapRefrigTemp",
          "evapPressure",
          "evapAPDrop",
          "ampsPhase1",
          "ampsPhase2",
          "ampsPhase3",
          "voltsPhase1",
          "voltsPhase2",
          "voltsPhase3",
          "oilPresHigh",
          "oilPresLow",
          "oilPresDif",
          "oilSumpTemp",
          "oilLevel",
          "bearingTemp",
          "runHours",
          "purgeTimeHr",
          "purgeTimeMin",
          "userNote",
          "airTemp",
        ];

        const badLogData = {
          chillerID: logPayload.chillerId?.toString(),
          userId: logPayload.userId?.toString(),
          updatedBy: logPayload.updatedBy,
          ...Object.fromEntries(
            keysToCopy.map((key) => [key, logPayload[key]]),
          ),
        };

        const badLog = await this.badLogModel.create(badLogData);

        const title = "New Bad Log Entry";

        const fullName = user
          ? `${user.firstName} ${user.lastName}`
          : "Unknown User";

        const description = generateTimelineDescription(title, {
          updatedBy: fullName,
          entryNotes: badLog.userNote,
          logId: badLog._id.toString(),
        });

        console.log("userId.toString()  ------>", userId.toString());

        await this.timelineModel.create({
          chillerId: chiller._id,
          title: title,
          description: description,
          updatedBy: new mongoose.Types.ObjectId(userId),
        });
      }

      const newLog = await this.logsModel.create(logPayload);

      const updatedAt = newLog["updatedAt"] as Date;
      const createdAt = newLog["createdAt"] as Date;
      // console.log('✌️newLog --->', newLog);

      const fullName = `${user.firstName} ${user.lastName}`;

      const title = "New Log Entry";

      const description = generateTimelineDescription(title, {
        logId: newLog._id.toString(),
        updatedBy: fullName,
        entryNotes: newLog.userNote,
      });

      await this.timelineModel.create({
        chillerId: chiller._id,
        title,
        description,
        updatedBy: new mongoose.Types.ObjectId(user._id),
      });

      return newLog;
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  async findAll(body: LogListDto, loggedInUserId: string) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        sort_by,
        sort_order = "DESC",
        companyId,
        facilityId,
        userId,
        peakLoad,
      } = body;

      if (page <= 0 || limit <= 0) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.INVALID_PAGE_AND_LIMIT_VALUE,
        );
      }

      const skip = (page - 1) * limit;
      const sortOrder = sort_order === "ASC" ? 1 : -1;

      // const matchStage: any = { isDeleted: false };

      const loggedInUser = await this.userModel.findById(
        new mongoose.Types.ObjectId(loggedInUserId),
      );

      if (!loggedInUser) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.UNAUTHORIZED_USER,
        );
      }

      const pipeline: any[] = [];

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

      // Lookup facility from chiller
      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.FACILITY,
          localField: "chiller.facilityId",
          foreignField: "_id",
          as: "facility",
        },
      });
      pipeline.push({
        $unwind: { path: "$facility", preserveNullAndEmptyArrays: false },
      });

      // Lookup user
      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.USERS,
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      });
      pipeline.push({
        $unwind: { path: "$user", preserveNullAndEmptyArrays: true },
      });

      // Global filter (e.g., not deleted)
      // pipeline.push({ $match: { isDeleted: false } });

      switch (loggedInUser.role) {
        case Role.ADMIN:
        case Role.SUB_ADMIN:
          // no further restrictions
          break;

        case Role.CORPORATE_MANAGER:
          pipeline.push({
            $match: {
              "facility.companyId": new mongoose.Types.ObjectId(
                loggedInUser.companyId,
              ),
            },
          });
          console.log("pipeline for corporate manager -->", pipeline);
          break;

        case Role.FACILITY_MANAGER:
          if (!loggedInUser.facilityIds || !loggedInUser.facilityIds.length) {
            return { logList: [], totalRecords: 0 };
          }
          pipeline.push({
            $match: {
              "facility._id": {
                $in: loggedInUser.facilityIds.map(
                  (id) => new mongoose.Types.ObjectId(id),
                ),
              },
            },
          });
          break;

        case Role.OPERATOR:
          if (!loggedInUser.chillerIds || !loggedInUser.chillerIds.length) {
            return { logList: [], totalRecords: 0 };
          }
          pipeline.push({
            $match: {
              userId: new mongoose.Types.ObjectId(loggedInUser._id),
            },
          });
          break;

        default:
          throw TypeExceptions.BadRequestCommonFunction(
            RESPONSE_ERROR.UNAUTHORIZED_USER,
          );
      }

      pipeline.push({ $match: { isDeleted: false } });

      if (userId) {
        // matchStage.userID = new mongoose.Types.ObjectId(userId);
        pipeline.push({
          $match: { userId: new mongoose.Types.ObjectId(userId) },
        });
      }

      // const pipeline: any[] = [];

      // Match logs
      // pipeline.push({ $match: matchStage });

      // Lookup chiller
      // pipeline.push({
      //   $lookup: {
      //     from: TABLE_NAMES.CHILLER,
      //     localField: 'chillerId',
      //     foreignField: '_id',
      //     as: 'chiller',
      //   },
      // });
      // pipeline.push({
      //   $unwind: { path: '$chiller', preserveNullAndEmptyArrays: true },
      // });

      // // Lookup facility
      // pipeline.push({
      //   $lookup: {
      //     from: TABLE_NAMES.FACILITY,
      //     localField: 'chiller.facilityId',
      //     foreignField: '_id',
      //     as: 'facility',
      //   },
      // });
      // pipeline.push({
      //   $unwind: { path: '$facility', preserveNullAndEmptyArrays: true },
      // });

      // // Lookup user
      // pipeline.push({
      //   $lookup: {
      //     from: TABLE_NAMES.USERS,
      //     localField: 'userID',
      //     foreignField: '_id',
      //     as: 'user',
      //   },
      // });
      // pipeline.push({
      //   $unwind: { path: '$user', preserveNullAndEmptyArrays: true },
      // });

      // Filter by companyId/facilityId
      if (companyId) {
        const companyExists = await this.companyModel.findById(companyId);
        if (!companyExists) {
          throw TypeExceptions.BadRequestCommonFunction(
            RESPONSE_ERROR.COMPANY_NOT_FOUND,
          );
        }
        pipeline.push({
          $match: {
            "facility.companyId": new mongoose.Types.ObjectId(companyId),
          },
        });
      }

      if (facilityId) {
        pipeline.push({
          $match: {
            "chiller.facilityId": new mongoose.Types.ObjectId(facilityId),
          },
        });
      }

      // Add projected fields
      // pipeline.push({
      //   $project: {
      //     _id: 1,
      //     chillerId: 1,
      //     userID: 1,
      //     readingDate: 1,
      //     updatedAt: 1,
      //     condAppLoss: 1,
      //     evapAppLoss: 1,
      //     nonCondLoss: 1,
      //     chillerName: {
      //       $concat: [
      //         { $ifNull: ['$chiller.ChillerNo', ''] },
      //         ' - ',
      //         { $ifNull: ['$chiller.model', ''] },
      //       ],
      //     },

      //     facilityName: '$facility.name',
      //     userFirstName: '$user.firstName',
      //     userLastName: '$user.lastName',
      //   },
      // });
      pipeline.push({
        $project: {
          // Include all fields from the Logs document
          _id: 1,
          chillerId: 1,
          userId: 1,
          updatedBy: 1,
          readingDate: 1,
          readingDateUTC: 1,
          condInletTemp: 1,
          condOutletTemp: 1,
          condRefrigTemp: 1,
          condPressure: 1,
          condAPDrop: 1,
          evapInletTemp: 1,
          evapOutletTemp: 1,
          evapRefrigTemp: 1,
          evapPressure: 1,
          evapAPDrop: 1,
          ampsPhase1: 1,
          ampsPhase2: 1,
          ampsPhase3: 1,
          voltsPhase1: 1,
          voltsPhase2: 1,
          voltsPhase3: 1,
          oilPresHigh: 1,
          oilPresLow: 1,
          oilPresDif: 1,
          oilSumpTemp: 1,
          oilLevel: 1,
          bearingTemp: 1,
          runHours: 1,
          comp1RunHours: 1,
          comp2RunHours: 1,
          lastRunHours: 1,
          lastRunHoursReadingDate: 1,
          nextRunHours: 1,
          nextRunHoursReadingDate: 1,
          purgeTimeHr: 1,
          purgeTimeMin: 1,
          userNote: 1,
          airTemp: 1,
          targetCost: 1,
          actualCost: 1,
          lossCost: 1,
          totalLoss: 1,
          condInletLoss: 1,
          condInletLossCost: 1,
          EFLCondAppLoss: 1,
          condApproach: 1,
          condAppLoss: 1,
          condAppLossCost: 1,
          evapTempLoss: 1,
          evapTempLossCost: 1,
          EFLEvapAppLoss: 1,
          evapAppLoss: 1,
          evapAppLossCost: 1,
          nonCondLoss: 1,
          nonCondLossCost: 1,
          deltaLoss: 1,
          deltaLossCost: 1,
          condFlow: 1,
          evapFlow: 1,
          energyCost: 1,
          ampImbalance: 1,
          voltImbalance: 1,
          actualLoad: 1,
          finalOilDiff: 1,
          condAppVariance: 1,
          nonCondensables: 1,
          calculatedEvapRefrigTemp: 1,
          calculatedCondRefrigTemp: 1,
          evapAppVariance: 1,
          evapApproach: 1,
          altitudeCorrection: 1,
          validRunHours: 1,
          runHourStart: 1,
          comp1RunHourStart: 1,
          comp2RunHourStart: 1,
          KWHLoss: 1,
          BTULoss: 1,
          CO2: 1,
          otherLoss: 1,
          isDeleted: 1,
          createdAt: 1,
          updatedAt: 1,

          // Additional joined data
          chillerName: {
            $concat: [
              { $ifNull: ["$chiller.ChillerNo", ""] },
              " - ",
              { $ifNull: ["$chiller.model", ""] },
            ],
          },
          facilityName: "$facility.name",
          userFirstName: "$user.firstName",
          userLastName: "$user.lastName",
        },
      });

      // Add lowercase fields for sorting
      pipeline.push({
        $addFields: {
          chillerNameLower: { $toLower: "$chillerName" },
          facilityNameLower: { $toLower: "$facilityName" },
        },
      });

      if (peakLoad) {
        pipeline.push(
          {
            $addFields: {
              readingDateOnly: {
                $dateToString: { format: "%Y-%m-%d", date: "$readingDateUTC" },
              },
              ampsMax: {
                $max: ["$ampsPhase1", "$ampsPhase2", "$ampsPhase3"],
              },
              loadPercentage: {
                $max: [
                  { $divide: ["$ampsPhase1", 100] },
                  { $divide: ["$ampsPhase2", 100] },
                  { $divide: ["$ampsPhase3", 100] },
                  "$actualLoad",
                ],
              },
            },
          },
          {
            $group: {
              _id: {
                chillerId: "$chillerId",
                date: "$readingDateOnly",
              },
              peakLoadId: {
                $first: {
                  $arrayElemAt: [
                    {
                      $sortArray: {
                        input: "$ROOT",
                        sortBy: { loadPercentage: -1 },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
          {
            $replaceRoot: { newRoot: "$peakLoadId" },
          },
        );
      }

      // Sorting logic
      const sortFieldMap: Record<string, any> = {
        facilityName: "facilityNameLower",
        chillerName: "chillerNameLower",
        updatedAt: "updatedAt",
        condAppLoss: "condAppLoss",
        evapAppLoss: "evapAppLoss",
        nonCondLoss: "nonCondLoss",
      };

      const sortField = sortFieldMap[sort_by] || "updatedAt";

      pipeline.push({
        $sort: {
          [sortField]: sortOrder,
        },
      });

      // Search filter (on chiller/facility/user names)
      if (search) {
        const regex = new RegExp(search.trim(), "i");
        pipeline.push({
          $match: {
            $or: [
              { "chiller.ChillerNo": { $regex: regex } },
              { "chiller.model": { $regex: regex } },
              { "facility.name": { $regex: regex } },
              { "user.firstName": { $regex: regex } },
              { "user.lastName": { $regex: regex } },
            ],
          },
        });
      }

      // Pagination
      pipeline.push({
        $facet: {
          logList: [{ $skip: skip }, { $limit: limit }],
          totalRecords: [{ $count: "count" }],
        },
      });

      console.log("final pipeline --- >", pipeline);

      // Execute
      const result = await this.logsModel.aggregate(pipeline);
      console.log("✌️result --->", result);

      return {
        logList: result[0]?.logList || [],
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

      const objectId = new mongoose.Types.ObjectId(id);

      const pipeline = [];

      // Match the log entry
      pipeline.push({
        $match: {
          _id: objectId,
          isDeleted: false,
        },
      });

      // Lookup Chiller
      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.CHILLER,
          localField: "chillerId",
          foreignField: "_id",
          as: "chiller",
        },
      });
      pipeline.push({
        $unwind: {
          path: "$chiller",
          preserveNullAndEmptyArrays: true,
        },
      });

      // Lookup Facility using chiller.facilityId
      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.FACILITY,
          localField: "chiller.facilityId",
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

      // Lookup Company using chiller.companyId
      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.COMPANY,
          localField: "chiller.companyId",
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

      // Lookup User using chiller.userId
      pipeline.push({
        $lookup: {
          from: TABLE_NAMES.USERS,
          localField: "chiller.userId",
          foreignField: "_id",
          as: "user",
        },
      });

      pipeline.push({
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      });

      switch (loggedInUser.role) {
        case Role.ADMIN:
        case Role.SUB_ADMIN:
          // no restrictions
          break;

        case Role.CORPORATE_MANAGER:
          pipeline.push({
            $match: {
              "facility.companyId": new mongoose.Types.ObjectId(
                loggedInUser.companyId,
              ),
            },
          });
          break;

        case Role.FACILITY_MANAGER:
          if (!loggedInUser.facilityIds || !loggedInUser.facilityIds.length) {
            throw TypeExceptions.BadRequestCommonFunction(
              RESPONSE_ERROR.UNAUTHORIZED_USER,
            );
          }
          pipeline.push({
            $match: {
              "facility._id": {
                $in: loggedInUser.facilityIds.map(
                  (id) => new mongoose.Types.ObjectId(id),
                ),
              },
            },
          });
          break;

        case Role.OPERATOR:
          pipeline.push({
            $match: {
              userId: new mongoose.Types.ObjectId(loggedInUser._id),
            },
          });
          break;

        default:
          throw TypeExceptions.BadRequestCommonFunction(
            RESPONSE_ERROR.UNAUTHORIZED_USER,
          );
      }

      // Final projection
      pipeline.push({
        $project: {
          _id: 1,
          chillerId: 1,
          userId: 1,
          updatedBy: 1,
          readingDate: 1,
          readingDateUTC: 1,
          condInletTemp: 1,
          condOutletTemp: 1,
          condRefrigTemp: 1,
          condPressure: 1,
          condAPDrop: 1,
          evapInletTemp: 1,
          evapOutletTemp: 1,
          evapRefrigTemp: 1,
          evapPressure: 1,
          evapAPDrop: 1,
          ampsPhase1: 1,
          ampsPhase2: 1,
          ampsPhase3: 1,
          voltsPhase1: 1,
          voltsPhase2: 1,
          voltsPhase3: 1,
          oilPresHigh: 1,
          oilPresLow: 1,
          oilPresDif: 1,
          oilSumpTemp: 1,
          oilLevel: 1,
          bearingTemp: 1,
          runHours: 1,
          lastRunHours: 1,
          lastRunHoursReadingDate: 1,
          nextRunHours: 1,
          nextRunHoursReadingDate: 1,
          purgeTimeHr: 1,
          purgeTimeMin: 1,
          userNote: 1,
          airTemp: 1,
          targetCost: 1,
          actualCost: 1,
          lossCost: 1,
          totalLoss: 1,
          condInletLoss: 1,
          condInletLossCost: 1,
          EFLCondAppLoss: 1,
          condApproach: 1,
          condAppLoss: 1,
          condAppLossCost: 1,
          evapTempLoss: 1,
          evapTempLossCost: 1,
          EFLEvapAppLoss: 1,
          evapAppLoss: 1,
          evapAppLossCost: 1,
          nonCondLoss: 1,
          nonCondLossCost: 1,
          deltaLoss: 1,
          deltaLossCost: 1,
          condFlow: 1,
          evapFlow: 1,
          energyCost: 1,
          ampImbalance: 1,
          voltImbalance: 1,
          actualLoad: 1,
          finalOilDiff: 1,
          condAppVariance: 1,
          nonCondensables: 1,
          calculatedEvapRefrigTemp: 1,
          calculatedCondRefrigTemp: 1,
          evapAppVariance: 1,
          evapApproach: 1,
          altitudeCorrection: 1,
          validRunHours: 1,
          runHourStart: 1,
          KWHLoss: 1,
          BTULoss: 1,
          CO2: 1,
          otherLoss: 1,
          isDeleted: 1,
          createdAt: 1,
          updatedAt: 1,

          // Derived metadata
          chillerName: {
            $concat: ["$chiller.ChillerNo", " - ", "$chiller.model"],
          },
          facilityName: "$facility.name",
          companyName: "$company.name",
          userName: {
            $concat: ["$user.firstName", " - ", "$user.lastName"],
          },
        },
      });

      const result = await this.logsModel.aggregate(pipeline);

      if (!result.length) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.LOG_NOT_FOUND,
        );
      }

      return result[0];
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  async update(
    id: string,
    updateLogDto: UpdateLogDto,
    updatedByUserId: string,
  ): Promise<Logs> {
    const existingLog = await this.logsModel.findById(id);
    if (!existingLog) {
      throw TypeExceptions.NotFoundCommonFunction(RESPONSE_ERROR.LOG_NOT_FOUND);
    }

    const chiller = await this.chillerModel.findById(existingLog.chillerId);
    if (!chiller) {
      throw TypeExceptions.BadRequestCommonFunction(
        RESPONSE_ERROR.CHILLER_NOT_FOUND,
      );
    }

    const facility = await this.facilityModel.findById(chiller.facilityId);
    if (!facility) {
      throw TypeExceptions.BadRequestCommonFunction(
        RESPONSE_ERROR.FACILITY_NOT_FOUND,
      );
    }

    const isMetric = chiller.unit === MEASUREMENT_UNITS.SIMetric;

    const updatedLog: any = {
      ...existingLog.toObject(),
      ...updateLogDto,
      updatedBy: new mongoose.Types.ObjectId(updatedByUserId),
      readingDateUTC: LogRecordHelper.convertToUTCString(
        updateLogDto.readingDate,
        updateLogDto.readingTime,
        updateLogDto.readingTimeZone,
      ),
      energyCost: existingLog.energyCost, // preserve original
      updatedAt: new Date(),
    };

    // Phase/Voltage settings
    if (
      chiller.ampChoice === "1-Phase" ||
      chiller.ampChoice === "Enter % Load"
    ) {
      updatedLog.ampsPhase2 = 0;
      updatedLog.ampsPhase3 = 0;
    }

    if (chiller.voltageChoice === "1-Phase") {
      updatedLog.voltsPhase2 = 0;
      updatedLog.voltsPhase3 = 0;
    } else if (chiller.voltageChoice === "Enter % Load") {
      updatedLog.voltsPhase1 = 0;
      updatedLog.voltsPhase2 = 0;
      updatedLog.voltsPhase3 = 0;
    }

    // Purge time calculation
    let purgeTime = 0;
    if (chiller.purgeReadingUnit === PURGE_READING_UNIT["Min. only"]) {
      purgeTime = updatedLog.purgeTimeMin || 0;
    } else {
      const purgeTimeMin = LogRecordHelper.isNumeric(updatedLog.purgeTimeMin)
        ? updatedLog.purgeTimeMin
        : 0;
      const purgeTimeHr = LogRecordHelper.isNumeric(updatedLog.purgeTimeHr)
        ? updatedLog.purgeTimeHr
        : 0;
      purgeTime = purgeTimeHr * 60 + purgeTimeMin;
    }

    // Last/Next Run Hours (optional — add if needed for your app)
    const previousLog = await this.logsModel
      .findOne({
        chillerId: chiller._id,
        readingDate: { $lt: new Date(updatedLog.readingDate) },
        runHours: { $ne: null },
        isValid: { $ne: true },
      })
      .sort({ readingDate: -1 })
      .select({ runHours: 1, readingDate: 1 });

    if (previousLog) {
      updatedLog.lastRunHours = previousLog.runHours;
      updatedLog.lastRunHoursReadingDate = new Date(
        previousLog.readingDate,
      ).getTime();
    }

    const nextLog = await this.logsModel
      .findOne({
        chillerId: chiller._id,
        readingDate: { $gt: new Date(updatedLog.readingDate) },
        runHours: { $ne: null },
        isValid: { $ne: true },
      })
      .sort({ readingDate: 1 })
      .select({ runHours: 1, readingDate: 1 });

    if (nextLog) {
      updatedLog.nextRunHours = nextLog.runHours;
      updatedLog.nextRunHoursReadingDate = new Date(
        nextLog.readingDate,
      ).getTime();
    }

    // === Recalculations ===
    updatedLog.condInletLoss = LogRecordHelper.roundToFourDecimals(
      LogRecordHelper.calcCondInletLoss(updatedLog, isMetric),
    );

    updatedLog.condAppLoss = LogRecordHelper.roundToFourDecimals(
      LogRecordHelper.calcCondAppLoss(updatedLog, chiller),
    );

    const condApproach = LogRecordHelper.getCondenserApproach(
      updatedLog,
      chiller,
    );
    updatedLog.condApproach = LogRecordHelper.roundToFourDecimals(condApproach);

    updatedLog.condAppVariance = LogRecordHelper.roundToFourDecimals(
      LogRecordHelper.getCondAppVariance(updatedLog, chiller),
    );

    const actualLoad = LogRecordHelper.roundToFourDecimals(
      LogRecordHelper.getLoadFactor(
        updatedLog,
        chiller,
        LogRecordHelper.roundToFourDecimals(
          LogRecordHelper.getMaxAmp(updatedLog),
        ),
      ) * 100,
    );
    updatedLog.actualLoad = actualLoad.toFixed(4);

    updatedLog.evapTempLoss = LogRecordHelper.roundToFourDecimals(
      LogRecordHelper.calcEvapTempLoss(updatedLog, chiller),
    );

    updatedLog.evapAppLoss = LogRecordHelper.roundToFourDecimals(
      LogRecordHelper.calcEvapAppLoss(updatedLog, chiller),
    );

    updatedLog.nonCondLoss = LogRecordHelper.roundToFourDecimals(
      LogRecordHelper.calcNonCondLoss(updatedLog, chiller),
    );

    const { deltaLoss, condFlow } = LogRecordHelper.calcDeltaLoss(
      updatedLog,
      chiller,
    );
    updatedLog.deltaLoss = LogRecordHelper.roundToFourDecimals(deltaLoss);
    updatedLog.condFlow = LogRecordHelper.roundToFourDecimals(condFlow);

    updatedLog.targetCost = LogRecordHelper.roundToFourDecimals(
      LogRecordHelper.calculateAnnualTargetCost(chiller),
    );

    const costPerHour = LogRecordHelper.roundToFourDecimals(
      LogRecordHelper.calculateTargetCostPerHour(
        chiller,
        updatedLog.energyCost,
      ),
    );

    updatedLog.actualCost = costPerHour;
    updatedLog.condInletLossCost = LogRecordHelper.roundToFourDecimals(
      updatedLog.condInletLoss * costPerHour,
    );
    updatedLog.condAppLossCost = LogRecordHelper.roundToFourDecimals(
      updatedLog.condAppLoss * costPerHour,
    );
    updatedLog.evapTempLossCost = LogRecordHelper.roundToFourDecimals(
      updatedLog.evapTempLoss * costPerHour,
    );
    updatedLog.evapAppLossCost = LogRecordHelper.roundToFourDecimals(
      updatedLog.evapAppLoss * costPerHour,
    );
    updatedLog.nonCondLossCost = LogRecordHelper.roundToFourDecimals(
      updatedLog.nonCondLoss * costPerHour,
    );
    updatedLog.deltaLossCost = LogRecordHelper.roundToFourDecimals(
      updatedLog.deltaLoss * costPerHour,
    );

    updatedLog.lossCost =
      updatedLog.condInletLossCost +
      updatedLog.condAppLossCost +
      updatedLog.evapTempLossCost +
      updatedLog.evapAppLossCost +
      updatedLog.nonCondLossCost +
      updatedLog.deltaLossCost;

    updatedLog.totalLoss = LogRecordHelper.roundToFourDecimals(
      updatedLog.actualCost + updatedLog.lossCost,
    );

    updatedLog.effLoss = Number(updatedLog.totalLoss?.toFixed(2));
    // new Intl.NumberFormat("en-US", {
    //   minimumFractionDigits: 2,
    //   maximumFractionDigits: 2,
    // }).format(updatedLog.totalLoss);

    updatedLog.evapFlow = LogRecordHelper.roundToFourDecimals(
      LogRecordHelper.calcEvapFlow(updatedLog, chiller),
    );

    updatedLog.calculatedEvapRefrigTemp = LogRecordHelper.roundToFourDecimals(
      await LogRecordHelper.calcEvapRefrigTemp(
        updatedLog,
        chiller,
        this.conversionModel,
      ),
    );

    const finalEvapRefrigTemp = LogRecordHelper.getFinalRefrigTemp(
      updatedLog,
      chiller,
      updatedLog.calculatedEvapRefrigTemp,
    );

    updatedLog.evapRefrigTemp =
      LogRecordHelper.roundToFourDecimals(finalEvapRefrigTemp);

    updatedLog.evapApproach = LogRecordHelper.getEvapApproach(
      updatedLog,
      chiller,
      finalEvapRefrigTemp,
    );

    updatedLog.evapAppVariance = LogRecordHelper.roundToFourDecimals(
      await LogRecordHelper.getEvapAppVariance(
        updatedLog,
        chiller,
        this.conversionModel,
      ),
    );

    const { EFLCondAppLoss, EFLEvapAppLoss } = LogRecordHelper.getEFLLoss(
      updatedLog,
      chiller,
    );
    updatedLog.EFLCondAppLoss =
      LogRecordHelper.roundToFourDecimals(EFLCondAppLoss);
    updatedLog.EFLEvapAppLoss =
      LogRecordHelper.roundToFourDecimals(EFLEvapAppLoss);

    const { ampImbalance, voltImbalance } = LogRecordHelper.checkImbalances(
      updatedLog,
      chiller,
    );
    updatedLog.ampImbalance = LogRecordHelper.roundToFourDecimals(ampImbalance);
    updatedLog.voltImbalance =
      LogRecordHelper.roundToFourDecimals(voltImbalance);

    switch (chiller.compOPIndicator) {
      case OIL_PRESSURE_DIFF["Enter High and Low Pressures"]:
        updatedLog.oilPresHigh = updateLogDto.oilPresHigh;
        updatedLog.oilPresLow = updateLogDto.oilPresLow;
        updatedLog.oilPresDif = 0;
        break;

      case OIL_PRESSURE_DIFF["Enter High Pressure Only"]:
        updatedLog.oilPresHigh = updateLogDto.oilPresHigh;
        updatedLog.oilPresLow = 0;
        updatedLog.oilPresDif = 0;
        break;

      case OIL_PRESSURE_DIFF["Enter Differential Directly"]:
        updatedLog.oilPresDif = updateLogDto.oilPresDif;
        updatedLog.oilPresHigh = 0;
        updatedLog.oilPresLow = 0;
        break;

      case OIL_PRESSURE_DIFF["Do Not Log Lube System"]:
        updatedLog.oilPresHigh = 0;
        updatedLog.oilPresLow = 0;
        updatedLog.oilPresDif = 0;
        updatedLog.oilSumpTemp = 0;
        updatedLog.oilLevel = 0;
        break;

      default:
        // Any other case (if exists)
        updatedLog.oilPresHigh = 0;
        updatedLog.oilPresLow = 0;
        updatedLog.oilPresDif = 0;
        updatedLog.oilSumpTemp = updateLogDto.oilSumpTemp;
        updatedLog.oilLevel = updateLogDto.oilLevel;
        break;
    }

    if (chiller.haveBearingTemp) {
      updatedLog.bearingTemp = updateLogDto.bearingTemp;
    } else {
      updatedLog.bearingTemp = 0;
    }

    updatedLog.finalOilDiff = LogRecordHelper.roundToFourDecimals(
      LogRecordHelper.getFinalOilDiff(updatedLog, chiller),
    );

    const { nonCondensables, thisCondRefrigTemp } =
      await LogRecordHelper.getNonCondensables(
        updatedLog,
        chiller,
        this.conversionModel,
      );

    updatedLog.nonCondensables =
      LogRecordHelper.roundToFourDecimals(nonCondensables);

    if (chiller.highPressureRefrig) {
      updatedLog.calculatedCondRefrigTemp =
        LogRecordHelper.roundToFourDecimals(thisCondRefrigTemp);
    }

    updatedLog.validRunHours = await LogRecordHelper.validateRunHoursField(
      updatedLog,
      chiller,
    );

    updatedLog.KWHLoss = LogRecordHelper.roundToFourDecimals(
      LogRecordHelper.calcKWHLoss(updatedLog),
    );
    updatedLog.BTULoss = LogRecordHelper.roundToFourDecimals(
      LogRecordHelper.calcBTULoss(updatedLog),
    );
    updatedLog.CO2 = LogRecordHelper.roundToFourDecimals(
      LogRecordHelper.calcCO2(updatedLog),
    );

    updatedLog.altitudeCorrection = LogRecordHelper.roundToFourDecimals(
      await LogRecordHelper.getAltitudeCorrectionByLocation(
        facility,
        this.altCorrectionModel,
      ),
    );

    // Final sanitation
    const sanitizedLog = LogRecordHelper.sanitizeLogData(updatedLog, chiller);

    updatedLog.otherLoss =
      updatedLog.condInletLoss + updatedLog.evapTempLoss + updatedLog.deltaLoss;

    await this.logsModel.updateOne({ _id: id }, { $set: sanitizedLog });

    const result = await this.logsModel.findById(id);
    const updatedAt = result["updatedAt"] as Date;
    const createdAt = result["createdAt"] as Date;
    console.log("✌️createdAt --->", updatedAt.toString());

    // console.log('✌️result --->', result.createdAt);

    const loggedInUser = await this.userModel
      .findById(new mongoose.Types.ObjectId(updatedByUserId))
      .select("firstName lastName")
      .lean();

    const fullName = updatedByUserId
      ? `${loggedInUser.firstName} ${loggedInUser.lastName}`
      : "Unknown User";

    const title = "Log Edited";

    const description = generateTimelineDescription(title, {
      logId: result._id.toString(),
      updatedBy: fullName,
      logCreatedAt: createdAt,
      updatedAt: updatedAt,
      entryNotes: result.userNote,
    });

    await this.timelineModel.create({
      chillerId: chiller._id,
      title,
      description,
      updatedBy: new mongoose.Types.ObjectId(updatedByUserId),
    });

    return result;
  }
  async exportSelectedLogsExcel(body: ExportLogIds) {
    try {
      console.log("body: ", body);
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }
  async importLogExcel(file: FileUploadLogDto) {
    try {
      if (!file) {
        throw AuthExceptions.chooseFile();
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file.buffer);

      const worksheet = workbook.getWorksheet(1);

      const headerRow = worksheet.getRow(1);
      const headers = headerRow.values;

      const data: any[] = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row
        const rowData: any = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber];
          rowData[header] = cell.value;
        });
        data.push(rowData);
      });
      return data;
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  async remove(id: string) {
    const existingLog = await this.logsModel.findById(
      new mongoose.Types.ObjectId(id),
    );

    if (!existingLog) {
      throw TypeExceptions.NotFoundCommonFunction(RESPONSE_ERROR.LOG_NOT_FOUND);
    }

    await this.logsModel.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id) },
      { isDeleted: true },
    );
  }
}
