/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Logger } from "@nestjs/common";
import {
  CreateLogDTO,
  ExportLogIds,
  FileUploadLogDto,
  LogListDto,
  UpdateLogDto,
} from "./dto/logs.dto";
import { InjectModel } from "@nestjs/mongoose";
import { Logs, LogsDocument } from "src/common/schema/logs.schema";
import mongoose, { FilterQuery, Model } from "mongoose";
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
  AppEnvironment,
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
import * as dayjs from "dayjs";
import { ImageUploadService } from "../image-upload/image-upload.service";
import * as utc from "dayjs/plugin/utc";
import * as customParseFormat from "dayjs/plugin/customParseFormat";
import { ProblemAndSolutions } from "src/common/schema/problemAndSolutions.schema";
import { NotificationService } from "src/common/services/notification.service";
import { EmailService } from "src/common/helpers/email/email.service";
import { generalAlertNotificationTemplate } from "src/common/helpers/email/emailTemplates/generalAlertTemplate";

dayjs.extend(utc);
dayjs.extend(customParseFormat);

@Injectable()
export class LogService {
  private readonly logger = new Logger(LogService.name);

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
    @InjectModel(ProblemAndSolutions.name)
    private readonly problemSolutionModel: Model<ProblemAndSolutions>,
    private imageService: ImageUploadService,
    private readonly notificationService: NotificationService,
    private emailService: EmailService,
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

      const company = await this.companyModel.findById({
        _id: new mongoose.Types.ObjectId(createLogDto.companyId),
      });

      if (!company) {
        throw TypeExceptions.NotFoundCommonFunction(
          RESPONSE_ERROR.COMPANY_NOT_FOUND,
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
        companyId: new mongoose.Types.ObjectId(createLogDto.companyId),
        facilityId: new mongoose.Types.ObjectId(createLogDto.facilityId),
      };

      logData.readingDateUTC = LogRecordHelper.convertToUTCString(
        logData.readingDate,
        logData.readingTime,
        logData.readingTimeZone,
      );

      const findExistingLogWithSameDate = await this.logsModel.findOne({
        chillerId: createLogDto?.chillerId,
        readingDateUTC: logData.readingDateUTC,
        isDeleted: false,
      });

      console.log("findExistingLogWithSameDate: ", findExistingLogWithSameDate);

      if (findExistingLogWithSameDate) {
        // Skip main log creation for existing dates
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.DUPLICATE_READING_DATE,
        );
      }

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
        await LogRecordHelper.calcEvapAppLoss(
          logData,
          chiller,
          this.conversionModel,
        ),
      );
      logData.nonCondLoss = LogRecordHelper.roundToFourDecimals(
        await LogRecordHelper.calcNonCondLoss(logData, chiller),
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
      // logData.actualCost = costPerHour;
      // logData.actualCost = (1 + (logData.totalLoss));

      logData.condInletLossCost = LogRecordHelper.roundToFourDecimals(
        logData.condInletLoss * costPerHour,
      );
      // console.log(
      //   '✌️logData.condAppLoss * logData.condAppLoss * 0.01 --->',
      //   logData.condAppLoss * logData.condAppLoss * 0.01
      // );
      logData.condAppLossCost = LogRecordHelper.roundToFourDecimals(
        logData.condAppLoss * logData.targetCost * 0.01,
      );
      // logData.condAppLoss * logData.targetCost * 0.01),
      logData.evapTempLossCost = LogRecordHelper.roundToFourDecimals(
        logData.evapTempLoss * costPerHour,
      );
      logData.evapAppLossCost = LogRecordHelper.roundToFourDecimals(
        logData.evapAppLoss * logData.targetCost * 0.01,
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

      // logData.totalLoss = LogRecordHelper.roundToFourDecimals(
      //   logData.actualCost + logData.lossCost
      // );
      logData.totalLoss = LogRecordHelper.roundToFourDecimals(
        logData.condInletLoss +
          logData.condAppLoss +
          logData.evapTempLoss +
          logData.evapAppLoss +
          logData.nonCondLoss +
          logData.deltaLoss,
      );

      logData.actualCost = LogRecordHelper.roundToFourDecimals(
        (1 + logData.totalLoss * 0.01) * logData.targetCost,
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

      // console.log('✌️logData --->', logData);
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
        LogRecordHelper.calcCO2(logData, chiller.emissionFactor),
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

      logData.effLossAtFullLoad =
        logData.condInletLoss +
        logData.EFLCondAppLoss +
        logData.evapTempLoss +
        logData.EFLEvapAppLoss +
        logData.nonCondLoss +
        logData.deltaLoss;

      const logPayload = {
        ...logData,
        purgeTimeMin: purgeTime,
        updatedBy: user._id,
        isLogManual: true,
      };
      // console.log('✌️logPayload --->', logPayload);

      // const hasInvalidFields = requiredFields.some((field) => {
      //   const value = logPayload[field];
      //   return (
      //     value === null ||
      //     value === undefined ||
      //     (typeof value === 'number' && isNaN(value))
      //   );
      // });
      // console.log('✌️hasInvalidFields --->', hasInvalidFields);
      const hasInvalidFields = requiredFields.some((field) => {
        const value = logPayload[field];

        if (value === null) {
          console.log(`❌ Invalid field: "${field}" → value is null`);
          return true;
        }

        if (value === undefined) {
          console.log(
            `❌ Invalid field: "${field}" → value is undefined (missing in payload)`,
          );
          return true;
        }

        if (typeof value === "number" && isNaN(value)) {
          console.log(`❌ Invalid field: "${field}" → value is NaN`);
          return true;
        }

        console.log(`✅ Valid field: "${field}" → ${value}`);
        return false;
      });

      console.log("✌️ hasInvalidFields --->", hasInvalidFields);

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

        return badLog;
      }

      const newLog = await this.logsModel.create(logPayload);

      // const companyUsers = await this.userModel.find({
      //   companyId: newLog.companyId,
      //   isActive: true,
      //   isDeleted: false,
      // });

      // if (companyUsers.length > 0) {
      //   for (const user of companyUsers) {
      //     if (!user.alerts?.general?.conditions?.length) continue;

      //     const { conditions, notifyBy } = user.alerts.general;
      //     console.log("✌️conditions, notifyBy --->", conditions, notifyBy);

      //     for (const condition of conditions) {
      //       console.log("✌️generalAlert --->", condition);
      //     }
      //   }
      // }
      const companyUsers = await this.userModel.find({
        companyId: newLog.companyId,
        isActive: true,
        isDeleted: false,
      });

      if (process.env.APP_ENV != "local") {
        if (companyUsers.length > 0) {
          for (const user of companyUsers) {
            // Skip if user has no general alert conditions
            if (!user.alerts?.general?.conditions?.length) continue;

            const { conditions, notifyBy } = user.alerts.general;

            let isUserEligible = false;

            switch (user.role) {
              case "corporateManager":
                // Corporate managers get alerts for all chillers under their company
                isUserEligible = true;
                break;

              case "facilityManager":
                // Facility managers only get alerts if the log's chiller belongs to their facilityIds
                if (
                  user.facilityIds?.length &&
                  user.facilityIds.some(
                    (fid) => newLog.facilityId?.toString() === fid.toString(),
                  )
                ) {
                  isUserEligible = true;
                }
                break;

              case "operator":
                // Operators only get alerts if the log's chiller belongs to their chillerIds
                if (
                  user.chillerIds?.length &&
                  user.chillerIds.some(
                    (cid) => newLog.chillerId?.toString() === cid.toString(),
                  )
                ) {
                  isUserEligible = true;
                }
                break;
            }

            if (!isUserEligible) continue;

            // ✅ Evaluate each condition against the new log
            for (const condition of conditions) {
              const { metric, warning, alert } = condition;

              const metricValue = newLog[metric];
              if (metricValue === undefined || metricValue === null) continue;

              const checkCondition = (
                operator: string,
                threshold: number,
              ): boolean => {
                switch (operator) {
                  case ">":
                    return metricValue > threshold;
                  case "<":
                    return metricValue < threshold;
                  case ">=":
                    return metricValue >= threshold;
                  case "<=":
                    return metricValue <= threshold;
                  case "=":
                    return metricValue === threshold;
                  default:
                    return false;
                }
              };

              let severity: "warning" | "alert" | null = null;

              if (checkCondition(alert.operator, alert.threshold)) {
                severity = "alert";
              } else if (checkCondition(warning.operator, warning.threshold)) {
                severity = "warning";
              }

              const facility = await this.facilityModel.findOne({
                _id: newLog.facilityId,
              });

              const chiller = await this.chillerModel.findOne({
                _id: newLog.chillerId,
              });

              if (severity) {
                const message = `Chiller ${chiller.serialNumber} at Facility ${facility.name} triggered a ${severity.toUpperCase()} for metric "${metric}" with value ${metricValue}`;
                const html = generalAlertNotificationTemplate(message);
                // Send notifications based on notifyBy value
                if (notifyBy === "email" || notifyBy === "both") {
                  // await this.notificationService.sendEmail(
                  //   user.email,
                  //   'Chiller Alert Notification',
                  //   `Hello ${user.firstName} ${user.lastName},\n\n${message}\n\nThanks.`
                  // );

                  this.logger.debug(`📧 Sending EMAIL to ${user.email}`);

                  await this.emailService.emailSender({
                    to: user.email,
                    subject: "General Alerts",
                    html: html,
                  });
                }

                if (notifyBy === "web" || notifyBy === "both") {
                  this.logger.debug(
                    `🌐 Sending WEB notification to ${user.email}`,
                  );

                  const payload = {
                    senderId: null,
                    receiverId: user._id,
                    title: "General Alerts",
                    message: message,
                    type: "General",
                    redirection: { type: "General" },
                  };

                  await this.notificationService.sendNotification(
                    payload.receiverId,
                    payload,
                  );
                }
              }
            }
          }
        }
      }

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
        facilityId,
        chillerId,
        peakLoad,
      } = body;
      let companyId = body.companyId;

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

      const matchObj: FilterQuery<LogsDocument> = { isDeleted: false };

      if (loggedInUser.role == Role.CORPORATE_MANAGER) {
        if (loggedInUser.companyId) {
          companyId = loggedInUser.companyId.toString();
        } else {
          matchObj._id = { $in: [] };
        }
      }
      if (companyId) {
        matchObj.companyId = new mongoose.Types.ObjectId(companyId);
      }
      let facilityIds = [];
      let chillerIds = [];
      if (loggedInUser.role == Role.FACILITY_MANAGER) {
        if (loggedInUser.companyId) {
          companyId = loggedInUser.companyId.toString();
        }

        if (loggedInUser?.facilityIds?.length > 0) {
          if (loggedInUser.facilityIds && loggedInUser.facilityIds.length) {
            facilityIds = loggedInUser.facilityIds.map(
              (id) => new mongoose.Types.ObjectId(id),
            );
          }
        }
        matchObj.facilityId = { $in: facilityIds };
      }
      if (loggedInUser.role == Role.OPERATOR) {
        if (loggedInUser.companyId) {
          companyId = loggedInUser.companyId.toString();
        }

        if (loggedInUser.facilityIds) {
          if (loggedInUser.facilityIds && loggedInUser.facilityIds.length) {
            facilityIds = loggedInUser.facilityIds.map(
              (id) => new mongoose.Types.ObjectId(id),
            );
          }
        }
        if (loggedInUser.chillerIds) {
          if (loggedInUser.chillerIds && loggedInUser.chillerIds.length) {
            chillerIds = loggedInUser.chillerIds.map(
              (id) => new mongoose.Types.ObjectId(id),
            );
          }
        }
        matchObj.facilityId = { $in: facilityIds };
        matchObj.chillerId = { $in: chillerIds };
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
        if (loggedInUser.role == Role.OPERATOR) {
          matchObj.chillerId = { $in: chillerIds };
        }
      } else {
        if (
          loggedInUser.role == Role.ADMIN ||
          loggedInUser.role == Role.SUB_ADMIN ||
          loggedInUser.role == Role.CORPORATE_MANAGER
        ) {
          if (facilityIds.length) {
            matchObj.facilityId = { $in: facilityIds };
          }
          if (chillerIds.length) {
            matchObj.chillerId = { $in: chillerIds };
          }
        }
      }
      if (chillerId) {
        matchObj.chillerId = new mongoose.Types.ObjectId(chillerId);
      }
      const pipeline: any[] = [];

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
          effLoss: 1,
          CO2: 1,
          otherLoss: 1,
          isDeleted: 1,
          createdAt: 1,
          updatedAt: 1,
          ChillerNo: "$chiller.ChillerNo",
          ChillerNumber: "$chiller.ChillerNumber",

          // Additional joined data
          chillerName: {
            $concat: [
              { $ifNull: ["$chiller.make", ""] },
              " - ",
              { $ifNull: ["$chiller.model", ""] },
            ],
          },
          facilityName: "$facility.name",
          userFirstName: "$user.firstName",
          userLastName: "$user.lastName",
          userProfileImage: "$user.profileImage",
        },
      });

      // Add lowercase fields for sorting
      pipeline.push({
        $addFields: {
          chillerNameLower: { $toLower: "$chillerName" },
          facilityNameLower: { $toLower: "$facilityName" },
          ChillerNoLower: { $toLower: "$ChillerNo" },
        },
      });

      if (peakLoad) {
        pipeline.push(
          {
            $addFields: {
              readingDateUTC: {
                $cond: {
                  if: { $eq: [{ $type: "$readingDateUTC" }, "string"] },
                  then: { $toDate: "$readingDateUTC" },
                  else: "$readingDateUTC",
                },
              },
            },
          },
          {
            $addFields: {
              readingDateOnly: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$readingDateUTC",
                },
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
            $sort: {
              loadPercentage: -1,
            },
          },
          {
            $group: {
              _id: {
                chillerId: "$chillerId",
                date: "$readingDateOnly",
              },
              peakLoad: { $first: "$$ROOT" },
            },
          },
          {
            $replaceRoot: {
              newRoot: "$peakLoad",
            },
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
        ChillerNo: "ChillerNoLower",
        effLoss: "effLoss",
        otherLoss: "otherLoss",
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
              { chillerName: { $regex: regex } },
              { ChillerNo: { $regex: regex } },
              { userFirstName: { $regex: regex } },
              { userLastName: { $regex: regex } },
              { facilityName: { $regex: regex } },
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
      if (!result || result.length === 0) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.FACILITY_NOT_FOUND,
        );
      }

      const generalConditions = loggedInUser?.alerts?.general?.conditions || [];

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

      const log = result[0];
      console.log("✌️log --->", log);

      // const formatLogs = (logs: any[], getLossType) => {
      //   return logs.map((log) => ({
      //     ...log,
      //     effLoss: {
      //       value: log.effLoss ?? 0,
      //       type: getLossType("efficiencyLoss", log.effLoss ?? 0),
      //       problem: this.generateProblemSolution(
      //         "effLoss",
      //         getLossType("efficiencyLoss", log.effLoss ?? 0),
      //       ),
      //     },
      //     condAppLoss: {
      //       value: log.condAppLoss ?? 0,
      //       type: getLossType("condenserLoss", log.condAppLoss ?? 0),
      //       problem: this.generateProblemSolution(
      //         "condAppLoss",
      //         getLossType("condenserLoss", log.condAppLoss ?? 0),
      //       ),
      //     },
      //     evapAppLoss: {
      //       value: log.evapAppLoss ?? 0,
      //       type: getLossType("evaporatorLoss", log.evapAppLoss ?? 0),
      //       problem: this.generateProblemSolution(
      //         "evapAppLoss",
      //         getLossType("evaporatorLoss", log.evapAppLoss ?? 0),
      //       ),
      //     },
      //     nonCondLoss: {
      //       value: log.nonCondLoss ?? 0,
      //       type: getLossType("nonCondenserLoss", log.nonCondLoss ?? 0),
      //       problem: this.generateProblemSolution(
      //         "nonCondLoss",
      //         getLossType("nonCondenserLoss", log.nonCondLoss ?? 0),
      //       ),
      //     },
      //     otherLoss: {
      //       value: log.otherLoss ?? 0,
      //       type: getLossType("otherLoss", log.otherLoss ?? 0),
      //       problem: this.generateProblemSolution(
      //         "otherLoss",
      //         getLossType("otherLoss", log.otherLoss ?? 0),
      //       ),
      //     },
      //   }));
      // };
      const formatLogs = async (logs: any[], getLossType) => {
        return Promise.all(
          logs.map(async (log) => {
            const effLossType = getLossType("efficiencyLoss", log.effLoss ?? 0);
            const condLossType = getLossType(
              "condenserLoss",
              log.condAppLoss ?? 0,
            );
            const evapLossType = getLossType(
              "evaporatorLoss",
              log.evapAppLoss ?? 0,
            );
            const nonCondLossType = getLossType(
              "nonCondenserLoss",
              log.nonCondLoss ?? 0,
            );
            const otherLossType = getLossType("otherLoss", log.otherLoss ?? 0);

            return {
              ...log,
              effLoss: {
                value: log.effLoss ?? 0,
                type: effLossType,
                problem: await this.generateProblemSolution(
                  "effLoss",
                  effLossType,
                ),
              },
              condAppLoss: {
                value: log.condAppLoss ?? 0,
                type: condLossType,
                problem: await this.generateProblemSolution(
                  "condAppLoss",
                  condLossType,
                ),
              },
              evapAppLoss: {
                value: log.evapAppLoss ?? 0,
                type: evapLossType,
                problem: await this.generateProblemSolution(
                  "evapAppLoss",
                  evapLossType,
                ),
              },
              nonCondLoss: {
                value: log.nonCondLoss ?? 0,
                type: nonCondLossType,
                problem: await this.generateProblemSolution(
                  "nonCondLoss",
                  nonCondLossType,
                ),
              },
              otherLoss: {
                value: log.otherLoss ?? 0,
                type: otherLossType,
                problem: await this.generateProblemSolution(
                  "otherLoss",
                  otherLossType,
                ),
              },
            };
          }),
        );
      };

      const { logList, totalRecords } = result[0] || {
        logList: [],
        totalRecords: [],
      };

      // Usage:
      // const formattedLogList = formatLogs(log.logList, getLossType);
      const formattedLogList = await formatLogs.call(
        this,
        log.logList,
        getLossType,
      );

      return {
        logList: formattedLogList || [],
        totalRecords: totalRecords?.length ? totalRecords[0].count : 0,
      };
      // return formattedLog;
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }
  async generateProblemSolution(key, type) {
    try {
      const problemSolution = [];
      if (type === "alert" || type === "warning") {
        const lossFields = [
          { key: "effLoss", field: "Efficiency Loss %" },
          { key: "condAppLoss", field: "Cond. App. Loss %" },
          { key: "evapAppLoss", field: "Evap. App. Loss %" },
          { key: "nonCondLoss", field: "Non-Cond. Loss %" },
          { key: "otherLoss", field: "Other Losses %" },
        ];
        const probSol = lossFields.find((item) => item.key === key);
        const ps = await this.problemSolutionModel.findOne({
          section: "Calculated",
          field: probSol?.field,
        });
        if (ps) return [ps];
      }
      return [];
    } catch (error) {
      console.error("Error in generateProblemSolution:", error);
      return [];
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
          localField: "userId",
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
          companyId: 1,
          facilityId: 1,
          comp1RunHourStart: 1,
          comp2RunHourStart: 1,
          comp1RunHours: 1,
          comp2RunHours: 1,
          effLoss: 1,
          // user: 1,
          userProfileImage: "$user.profileImage",
          // userName: '$user.firstName',

          // Derived metadata
          ChillerNo: "$chiller.ChillerNo",
          ChillerNumber: "$chiller.ChillerNumber",

          // Additional joined data
          chillerName: {
            $concat: [
              { $ifNull: ["$chiller.make", ""] },
              " - ",
              { $ifNull: ["$chiller.model", ""] },
            ],
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

      const log = result[0];
      console.log("✌️log --->", log);

      // Previous Log
      const prevLog = await this.logsModel
        .findOne({
          isDeleted: false, // ✅ apply globally
          $or: [
            { createdAt: { $gt: log.createdAt } },
            {
              createdAt: log.createdAt,
              _id: { $gt: log._id }, // in case timestamps are the same
            },
          ],
        })
        .sort({ createdAt: 1, _id: 1 });

      // Next Log L
      const nextLog = await this.logsModel
        .findOne({
          isDeleted: false, // ✅ apply globally
          $or: [
            { createdAt: { $lt: log.createdAt } },
            {
              createdAt: log.createdAt,
              _id: { $lt: log._id }, // in case timestamps are the same
            },
          ],
        })
        .sort({ createdAt: -1, _id: -1 });
      const generalConditions = loggedInUser?.alerts?.general?.conditions || [];

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

      console.log("prevLog: ", prevLog);
      console.log("nextLog: ", nextLog);
      const formattedLog = {
        ...log,
        nextLogId: nextLog?._id || null,
        prevLogId: prevLog?._id || null,
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

      return formattedLog;
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
      await LogRecordHelper.calcEvapAppLoss(
        updatedLog,
        chiller,
        this.conversionModel,
      ),
    );

    updatedLog.nonCondLoss = LogRecordHelper.roundToFourDecimals(
      await LogRecordHelper.calcNonCondLoss(updatedLog, chiller),
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

    // updatedLog.actualCost = costPerHour;
    updatedLog.condInletLossCost = LogRecordHelper.roundToFourDecimals(
      updatedLog.condInletLoss * costPerHour,
    );
    updatedLog.condAppLossCost = LogRecordHelper.roundToFourDecimals(
      updatedLog.condAppLoss * updatedLog.targetCost * 0.01,
    );
    updatedLog.evapTempLossCost = LogRecordHelper.roundToFourDecimals(
      updatedLog.evapTempLoss * costPerHour,
    );
    updatedLog.evapAppLossCost = LogRecordHelper.roundToFourDecimals(
      updatedLog.evapAppLoss * updatedLog.targetCost * 0.01,
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

    // updatedLog.totalLoss = LogRecordHelper.roundToFourDecimals(
    //   updatedLog.actualCost + updatedLog.lossCost
    // );

    updatedLog.totalLoss = LogRecordHelper.roundToFourDecimals(
      updatedLog.condInletLoss +
        updatedLog.condAppLoss +
        updatedLog.evapTempLoss +
        updatedLog.evapAppLoss +
        updatedLog.nonCondLoss +
        updatedLog.deltaLoss,
    );

    updatedLog.actualCost = LogRecordHelper.roundToFourDecimals(
      (1 + updatedLog.totalLoss * 0.01) * updatedLog.targetCost,
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
      LogRecordHelper.calcCO2(updatedLog, chiller.emissionFactor),
    );

    updatedLog.altitudeCorrection = LogRecordHelper.roundToFourDecimals(
      await LogRecordHelper.getAltitudeCorrectionByLocation(
        facility,
        this.altCorrectionModel,
      ),
    );

    // Final sanitation
    // const sanitizedLog = LogRecordHelper.sanitizeLogData(updatedLog, chiller);

    updatedLog.otherLoss =
      updatedLog.condInletLoss + updatedLog.evapTempLoss + updatedLog.deltaLoss;

    delete updatedLog.chillerId;
    delete updatedLog.facilityId;
    delete updatedLog.userId;
    delete updatedLog.companyId;
    await this.logsModel.updateOne({ _id: id }, { $set: updatedLog });

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
      const pipeline = [];
      const matchObj: FilterQuery<LogsDocument> = { isDeleted: false };

      const logIds = body?.logIds?.map((id) => new mongoose.Types.ObjectId(id));
      matchObj._id = { $in: logIds };

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

      const result = await this.logsModel.aggregate(pipeline);
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
                (e?.chiller.model || "") || "",
            "Updated At": formattedDate,
            "Efficiency Loss %": e?.effLoss,
            "Cond. App. Loss %": e?.condAppLoss,
            "Evap. App. Loss %": e?.evapAppLoss,
            "Non-Cond. App. Loss %": e?.nonCondLoss,
            "Other Losses %": e?.otherLoss,
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
        const fileName = `exportLogExcel_${Date.now()}.xlsx`;
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
          process.env.APP_ENV === AppEnvironment.PRODUCTION
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
      console.log("error:------- ", error);
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  // Helper function to validate range
  isOutOfRange(value: any, min: number, max: number): boolean {
    const num = Number(value);
    return isNaN(num) || num < min || num > max;
  }

  async importLogExcel(file: FileUploadLogDto, req) {
    try {
      console.log("✌️file --->", file);
      const loggedInUser = await this.userModel.findOne({
        _id: new mongoose.Types.ObjectId(req["user"]._id),
      });
      if (!loggedInUser) {
        throw AuthExceptions.AccountNotExist();
      }
      console.log("✌️loggedInUser --->", loggedInUser);
      if (!file) {
        throw AuthExceptions.chooseFile();
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file.buffer);

      const worksheet = workbook.getWorksheet(1);

      const headerRow = worksheet.getRow(1);
      const headers = headerRow.values;

      const data: any[] = [];
      const newLog = [];
      const badLog = [];
      const seenLogs = new Set();

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row
        const rowData: any = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber];
          rowData[header] = cell.value;
        });
        // Format Reading Time to AM/PM using moment
        let formattedTime;
        if (rowData["Reading Time"]) {
          // const rawTime = rowData["Reading Time"];
          // console.log("✌️rawTime --->", rawTime);
          // const parsed = dayjs(rawTime, ["hh:mm A"], true); // strict parsing

          // if (!parsed.isValid()) {
          //   console.log("✌️parsed --->", parsed);
          //   throw new Error("Invalid time value");
          // }
          // formattedTime = parsed.utc().format("HH:mm");
          if (rowData["Reading Time"]) {
            const rawTime = rowData["Reading Time"];

            if (rawTime instanceof Date) {
              // Special case: Excel times come with epoch 1899-12-30
              if (dayjs(rawTime).isBefore("1900-01-01")) {
                // Only take the time portion
                formattedTime = dayjs(rawTime).utc().format("HH:mm");
              } else {
                // Normal datetime
                formattedTime = dayjs(rawTime).utc().format("HH:mm");
              }
            } else if (typeof rawTime === "number") {
              // Excel stores times as fraction of a day
              const excelEpoch = dayjs("1899-12-30");
              formattedTime = excelEpoch
                .add(rawTime, "day")
                .utc()
                .format("HH:mm");
            } else if (typeof rawTime === "string") {
              const parsed = dayjs(rawTime, ["hh:mm A", "HH:mm"], true);
              if (parsed.isValid()) {
                formattedTime = parsed.utc().format("HH:mm");
              } else {
                throw new Error(`Invalid time value: ${rawTime}`);
              }
            }
          }

          // const date = new Date(rowData["Reading Time"]);
          // formattedTime = dayjs(date).utc().format("hh:mm A");
        }

        // Create unique key from all 5 fields to check for duplicates
        const uniqueKey = `${rowData["Serial Number"]}_${rowData["Chiller Name"]}_${rowData["Reading Date"]}_${formattedTime}_${rowData["Reading Timezone"]}`;
        console.log("uniqueKey: ", uniqueKey);

        if (!seenLogs.has(uniqueKey)) {
          seenLogs.add(uniqueKey);
          data.push(rowData);
        }
        // data.push(rowData);
      });
      console.log("data: ", data);
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

      for (const element of data) {
        let isBadLog = false;
        console.log("element: ", element);
        const findChiller = await this.chillerModel.findOne({
          serialNumber: element["Serial Number"],
          ChillerNo: element["Chiller Name"],
        });
        const insertObject = {};
        // Insert new logs
        insertObject["chillerId"] = findChiller?._id;
        insertObject["userId"] = loggedInUser?._id;
        insertObject["companyId"] = findChiller?.companyId;
        insertObject["facilityId"] = findChiller?.facilityId;

        insertObject["airTemp"] = element["Outside Air Temp."];
        insertObject["runHours"] = element["Chiller Run Hours"];
        insertObject["runHourStart"] = element["Begin Recording Run Hours"]; // boolean
        if (element["Begin Recording Run Hours"]) {
          if (element["Begin Recording Run Hours"].toLowerCase() == "yes") {
            insertObject["runHourStart"] = true; // boolean
          } else if (
            element["Begin Recording Run Hours"].toLowerCase() == "no"
          ) {
            insertObject["runHourStart"] = false; // boolean
          }
        }
        insertObject["userNote"] = element["Operator Notes"];
        insertObject["condInletTemp"] = element["Condenser Inlet Temp."];
        insertObject["condOutletTemp"] = element["Condenser Outlet Temp."];
        insertObject["condRefrigTemp"] = element["Condenser Refrig Temp."];

        insertObject["condPressure"] = element["Condenser Pressure"];
        insertObject["condAPDrop"] = element["Condenser Pressure Drop"];
        insertObject["evapInletTemp"] = element["Evaporator Inlet Temp."];
        insertObject["evapOutletTemp"] = element["Evaporator Outlet Temp."];
        insertObject["evapRefrigTemp"] = element["Evaporator Refrig Temp."];
        insertObject["evapPressure"] = element["Evaporator Pressure"];
        insertObject["evapAPDrop"] = element["Evaporator Pressure Drop"];

        insertObject["oilPresHigh"] = element["Oil Press High"];
        insertObject["oilPresLow"] = element["Oil Press Low"];
        insertObject["oilPresDif"] = element["Oil Press Diff"];

        insertObject["oilSumpTemp"] = element["Sump Temp."];
        insertObject["oilLevel"] = element["Oil Level"];
        insertObject["bearingTemp"] = element["Bearing Temp."];

        insertObject["comp1RunHours"] = element["Comp1 Run Hours"];
        insertObject["comp1RunHourStart"] = element["Comp1 Run Hours Start"];
        if (element["Comp1 Run Hours Start"]) {
          if (element["Comp1 Run Hours Start"].toLowerCase() == "yes") {
            insertObject["comp1RunHourStart"] = true; // boolean
          } else if (element["Comp1 Run Hours Start"].toLowerCase() == "no") {
            insertObject["comp1RunHourStart"] = false; // boolean
          }
        }

        insertObject["comp2RunHours"] = element["Comp2 Run Hours"];
        insertObject["comp2RunHourStart"] = element["Comp2 Run Hours Start"];
        if (element["Comp2 Run Hours Start"]) {
          if (element["Comp2 Run Hours Start"].toLowerCase() == "yes") {
            insertObject["comp2RunHourStart"] = true; // boolean
          } else if (element["Comp2 Run Hours Start"].toLowerCase() == "no") {
            insertObject["comp2RunHourStart"] = false; // boolean
          }
        }

        insertObject["purgeTimeHr"] = element["Purge Time Hours"];
        insertObject["purgeTimeMin"] = element["Purge Time Minutes"];
        let purgeTime = 0;

        if (findChiller?.purgeReadingUnit == PURGE_READING_UNIT["Min. only"]) {
          purgeTime = insertObject["purgeTimeMin"] || 0;
        } else {
          const purgeTimeMinTemp = this.isNumeric(element["Purge Time Minutes"])
            ? element["Purge Time Minutes"]
            : 0;
          const purgeTimeHrTemp = this.isNumeric(element["Purge Time Hours"])
            ? element["Purge Time Hours"]
            : 0;
          purgeTime = purgeTimeHrTemp * 60 + purgeTimeMinTemp;
        }

        console.log("findChiller: ", findChiller);
        // console.log('✌️insertObject --->', insertObject);
        if (findChiller) {
          const isMetric =
            findChiller.unit == MEASUREMENT_UNITS.SIMetric ? true : false;

          // Define valid ranges for temperature and pressure readings
          // const rangeChecks: { [key: string]: [number, number] } = {
          //   condInletTemp: [40, 105],
          //   condOutletTemp: [40, 105],
          //   condPressure: [-18, 33],
          //   condAPDrop: [0, 115],
          //   evapInletTemp: [-60, 80],
          //   evapOutletTemp: [-60, 80],
          //   evapRefrigTemp: [-60, 80],
          //   evapPressure: [-50, 2],
          //   evapAPDrop: [0, 115],
          //   oilPresHigh: [0, 200],
          // };

          // Loop through each key and validate
          // for (const [key, [min, max]] of Object.entries(rangeChecks)) {
          //   if (insertObject[key]) {
          //     const value = Number(insertObject[key]);
          //     if (isNaN(value) || value < min || value > max) {
          //       console.log("value:----- ", value);
          //       console.log("BREAK-1");

          //       isBadLog = true;
          //       break;
          //     }
          //   }
          // }
          if (!findChiller.useEvapRefrigTemp) {
            // Oil pressure high must be between 0 and 200.
            if (
              Number(insertObject["condRefrigTemp"]) < 0 ||
              Number(insertObject["condRefrigTemp"]) > 200
            ) {
              console.log("value:----- ", insertObject["condRefrigTemp"]);
              console.log("BREAK-2");

              isBadLog = true;
            }
          }
          // const date = new Date(element["Reading Time"]);

          // const formattedTime = dayjs(date).utc().format("hh:mm A");
          const readingDate = element["Reading Date"]; // "08-06-2025"
          const readingTime = element["Reading Time"]; // "01:00 PM"
          const timeZoneRaw = element["Reading Timezone"]; // "EST"
          const timeZoneMap: Record<string, string> = {
            EST: "America/New_York",
            PST: "America/Los_Angeles",
            CST: "America/Chicago",
            MST: "America/Denver",
            AKST: "America/Anchorage",
            HST: "Pacific/Honolulu", // Hawaii
            AST: "America/Halifax", // Atlantic (Canada)
            NST: "America/St_Johns", // Newfoundland
          };

          const timeZone = timeZoneMap[timeZoneRaw] || "UTC";
          const dateTimeString = `${readingDate} ${readingTime}`;

          const localTime = dayjs.tz(
            dateTimeString,
            "MM-DD-YYYY hh:mm A",
            timeZone,
          );
          const utcTime = localTime.utc().toISOString();
          insertObject["readingDateUTC"] = utcTime;
          // find existing log with same date
          console.log("findChiller?._id: ", findChiller?._id);
          console.log("utcTime: -----", utcTime);
          const findExistingLogWithSameDate = await this.logsModel.findOne({
            chillerId: findChiller?._id,
            readingDateUTC: utcTime.toString(),
            isDeleted: false,
          });
          console.log(
            "findExistingLogWithSameDate: ",
            findExistingLogWithSameDate,
          );
          if (findExistingLogWithSameDate) {
            // Skip main log creation for existing dates
            continue;
          }
          insertObject["readingDate"] = element["Reading Date"];
          // insertObject["readingDateUTC"] = LogRecordHelper.convertToUTCString(
          //   element["Reading Date"],
          //   rawTime,
          //   element["Reading Timezone"]
          // );

          // Set default values
          insertObject["ampsPhase1"] = 0;
          insertObject["ampsPhase2"] = 0;
          insertObject["ampsPhase3"] = 0;
          insertObject["voltsPhase1"] = 0;
          insertObject["voltsPhase2"] = 0;
          insertObject["voltsPhase3"] = 0;

          // Handle amps
          const ampChoice = findChiller.ampChoice;
          if (ampChoice === "1-Phase" || ampChoice === "Enter % Load") {
            insertObject["ampsPhase1"] = element["Amps Phase 1"];
            // if (this.isOutOfRange(insertObject["ampsPhase1"], 0, 30)) {
            //   console.log("BREAK-3");
            //   isBadLog = true;
            // }
          } else if (ampChoice === "3-Phase") {
            insertObject["ampsPhase1"] = element["Amps Phase 1"];
            insertObject["ampsPhase2"] = element["Amps Phase 2"];
            insertObject["ampsPhase3"] = element["Amps Phase 3"];
            // if (
            //   this.isOutOfRange(insertObject["ampsPhase1"], 0, 30) ||
            //   this.isOutOfRange(insertObject["ampsPhase2"], 0, 30) ||
            //   this.isOutOfRange(insertObject["ampsPhase3"], 0, 30)
            // ) {
            //   console.log("BREAK-4");
            //   isBadLog = true;
            // }
          }

          // Handle volts
          const voltageChoice = findChiller.voltageChoice;
          if (voltageChoice === "1-Phase") {
            insertObject["voltsPhase1"] = element["Volts Phase 1"];
            // if (this.isOutOfRange(insertObject["voltsPhase1"], 255, 345)) {
            //   console.log("BREAK-5");
            //   isBadLog = true;
            // }
          } else if (voltageChoice === "3-Phase") {
            insertObject["voltsPhase1"] = element["Volts Phase 1"];
            insertObject["voltsPhase2"] = element["Volts Phase 2"];
            insertObject["voltsPhase3"] = element["Volts Phase 3"];
            // if (
            //   this.isOutOfRange(insertObject["voltsPhase1"], 255, 345) ||
            //   this.isOutOfRange(insertObject["voltsPhase2"], 255, 345) ||
            //   this.isOutOfRange(insertObject["voltsPhase3"], 255, 345)
            // ) {
            //   console.log("BREAK-6");
            //   isBadLog = true;
            // }
          } else if (voltageChoice === "Enter % Load") {
            insertObject["voltsPhase1"] = 0;
            insertObject["voltsPhase2"] = 0;
            insertObject["voltsPhase3"] = 0;
          }

          const previousLog = await this.logsModel
            .findOne({
              chillerId: new mongoose.Types.ObjectId(findChiller._id),
              readingDate: { $lt: new Date(insertObject["readingDate"]) },
              runHours: { $ne: null },
              isValid: { $ne: true },
            })
            .sort({ readingDate: -1 })
            .select({ runHours: 1, readingDate: 1 });

          if (previousLog) {
            insertObject["lastRunHours"] = previousLog.runHours;
            insertObject["lastRunHoursReadingDate"] = new Date(
              previousLog.readingDate,
            ).getTime();
          }

          const nextLog = await this.logsModel
            .findOne({
              chillerId: new mongoose.Types.ObjectId(findChiller._id),
              readingDate: { $gt: new Date(insertObject["readingDate"]) },
              runHours: { $ne: null },
              isValid: { $ne: true },
            })
            .sort({ readingDate: 1 })
            .select({ runHours: 1, readingDate: 1 });

          if (nextLog) {
            insertObject["nextRunHours"] = nextLog.runHours;
            insertObject["nextRunHoursReadingDate"] = new Date(
              nextLog.readingDate,
            ).getTime();
          }

          insertObject["condInletLoss"] = LogRecordHelper.roundToFourDecimals(
            LogRecordHelper.calcCondInletLoss(insertObject as never, isMetric),
          );

          insertObject["condAppLoss"] = LogRecordHelper.roundToFourDecimals(
            LogRecordHelper.calcCondAppLoss(insertObject as never, findChiller),
          );

          const condApproach = LogRecordHelper.getCondenserApproach(
            insertObject as never,
            findChiller,
          );
          console.log(
            'insertObject["condApproach"]: ',
            insertObject["condApproach"],
          );
          console.log("condApproach: ", condApproach);
          insertObject["condApproach"] = LogRecordHelper.roundToFourDecimals(
            insertObject["condApproach"] ?? condApproach,
          );
          insertObject["condAppVariance"] =
            insertObject["condAppVariance"] ??
            LogRecordHelper.roundToFourDecimals(
              LogRecordHelper.getCondAppVariance(
                insertObject as never,
                findChiller,
              ),
            );

          const actualLoad = (insertObject["actualLoad"] =
            LogRecordHelper.roundToFourDecimals(
              LogRecordHelper.getLoadFactor(
                insertObject as never,
                findChiller,
                LogRecordHelper.roundToFourDecimals(
                  LogRecordHelper.getMaxAmp(insertObject as never),
                ),
              ),
            ) * 100);

          insertObject["actualLoad"] = actualLoad.toFixed(4);
          insertObject["evapTempLoss"] = LogRecordHelper.roundToFourDecimals(
            LogRecordHelper.calcEvapTempLoss(
              insertObject as never,
              findChiller,
            ),
          );
          insertObject["evapAppLoss"] = LogRecordHelper.roundToFourDecimals(
            await LogRecordHelper.calcEvapAppLoss(
              insertObject as never,
              findChiller,
              this.conversionModel,
            ),
          );
          insertObject["nonCondLoss"] = LogRecordHelper.roundToFourDecimals(
            await LogRecordHelper.calcNonCondLoss(
              insertObject as never,
              findChiller,
            ),
          );

          const { deltaLoss, condFlow } = LogRecordHelper.calcDeltaLoss(
            insertObject as never,
            findChiller,
          );
          insertObject["deltaLoss"] =
            LogRecordHelper.roundToFourDecimals(deltaLoss);
          insertObject["condFlow"] =
            LogRecordHelper.roundToFourDecimals(condFlow);

          insertObject["targetCost"] = LogRecordHelper.roundToFourDecimals(
            LogRecordHelper.calculateAnnualTargetCost(findChiller),
          );
          const costPerHour = LogRecordHelper.roundToFourDecimals(
            LogRecordHelper.calculateTargetCostPerHour(
              findChiller,
              insertObject["energyCost"],
            ),
          );
          // insertObject['actualCost'] = costPerHour;

          insertObject["condInletLossCost"] =
            LogRecordHelper.roundToFourDecimals(
              insertObject["condInletLoss"] * costPerHour,
            );
          insertObject["condAppLossCost"] = LogRecordHelper.roundToFourDecimals(
            insertObject["condAppLoss"] * insertObject["targetCost"] * 0.01,
          );
          insertObject["evapTempLossCost"] =
            LogRecordHelper.roundToFourDecimals(
              insertObject["evapTempLoss"] * costPerHour,
            );
          insertObject["evapAppLossCost"] = LogRecordHelper.roundToFourDecimals(
            insertObject["evapAppLoss"] * insertObject["targetCost"] * 0.01,
          );
          insertObject["nonCondLossCost"] = LogRecordHelper.roundToFourDecimals(
            insertObject["nonCondLoss"] * costPerHour,
          );
          insertObject["deltaLossCost"] = LogRecordHelper.roundToFourDecimals(
            insertObject["deltaLoss"] * costPerHour,
          );
          insertObject["lossCost"] =
            insertObject["condInletLossCost"] +
            insertObject["condAppLossCost"] +
            insertObject["evapTempLossCost"] +
            insertObject["evapAppLossCost"] +
            insertObject["nonCondLossCost"] +
            insertObject["deltaLossCost"];

          // insertObject['totalLoss'] = LogRecordHelper.roundToFourDecimals(
          //   insertObject['actualCost'] + insertObject['lossCost']
          // );
          insertObject["totalLoss"] = LogRecordHelper.roundToFourDecimals(
            insertObject["condInletLoss"] +
              insertObject["condAppLoss"] +
              insertObject["evapTempLoss"] +
              insertObject["evapAppLoss"] +
              insertObject["nonCondLoss"] +
              insertObject["deltaLoss"],
          );

          insertObject["actualCost"] = LogRecordHelper.roundToFourDecimals(
            (1 + insertObject["totalLoss"] * 0.01) * insertObject["targetCost"],
          );

          insertObject["effLoss"] = Number(
            insertObject["totalLoss"]?.toFixed(2),
          );

          insertObject["energyCost"] = findChiller.energyCost;

          insertObject["evapFlow"] = LogRecordHelper.roundToFourDecimals(
            LogRecordHelper.calcEvapFlow(insertObject as never, findChiller),
          );

          insertObject["calculatedEvapRefrigTemp"] =
            LogRecordHelper.roundToFourDecimals(
              await LogRecordHelper.calcEvapRefrigTemp(
                insertObject as never,
                findChiller,
                this.conversionModel,
              ),
            );
          const finalEvapRefrigTemp = LogRecordHelper.getFinalRefrigTemp(
            insertObject as never,
            findChiller,
            insertObject["calculatedEvapRefrigTemp"],
          );

          insertObject["evapRefrigTemp"] =
            LogRecordHelper.roundToFourDecimals(finalEvapRefrigTemp);

          const evapApproach = LogRecordHelper.getEvapApproach(
            insertObject as never,
            findChiller,
            finalEvapRefrigTemp,
          );
          insertObject["evapApproach"] = Number(evapApproach.toFixed(4));

          console.log("insertObject --->", insertObject);
          insertObject["evapAppVariance"] = LogRecordHelper.roundToFourDecimals(
            await LogRecordHelper.getEvapAppVariance(
              insertObject as never,
              findChiller,
              this.conversionModel,
            ),
          );

          const { EFLCondAppLoss, EFLEvapAppLoss } = LogRecordHelper.getEFLLoss(
            insertObject as never,
            findChiller,
          );
          insertObject["EFLCondAppLoss"] =
            LogRecordHelper.roundToFourDecimals(EFLCondAppLoss);
          insertObject["EFLEvapAppLoss"] =
            LogRecordHelper.roundToFourDecimals(EFLEvapAppLoss);

          const { ampImbalance, voltImbalance } =
            LogRecordHelper.checkImbalances(insertObject as never, findChiller);

          insertObject["ampImbalance"] =
            LogRecordHelper.roundToFourDecimals(ampImbalance);
          insertObject["voltImbalance"] =
            LogRecordHelper.roundToFourDecimals(voltImbalance);

          switch (findChiller.compOPIndicator) {
            case OIL_PRESSURE_DIFF["Enter High and Low Pressures"]:
              insertObject["oilPresDif"] = 0;
              break;

            case OIL_PRESSURE_DIFF["Enter High Pressure Only"]:
              insertObject["oilPresLow"] = 0;
              insertObject["oilPresDif"] = 0;
              break;

            case OIL_PRESSURE_DIFF["Enter Differential Directly"]:
              insertObject["oilPresHigh"] = 0;
              insertObject["oilPresLow"] = 0;
              break;

            case OIL_PRESSURE_DIFF["Do Not Log Lube System"]:
              insertObject["oilPresHigh"] = 0;
              insertObject["oilPresLow"] = 0;
              insertObject["oilPresDif"] = 0;
              insertObject["oilSumpTemp"] = 0;
              insertObject["oilLevel"] = 0;
              break;

            default:
              // Any other case (if exists)
              insertObject["oilPresHigh"] = 0;
              insertObject["oilPresLow"] = 0;
              insertObject["oilPresDif"] = 0;
              break;
          }
          if (findChiller.haveBearingTemp) {
            insertObject["bearingTemp"] = element["Bearing Temp."];
          } else {
            insertObject["bearingTemp"] = 0;
          }

          const finalOilDiff = LogRecordHelper.getFinalOilDiff(
            insertObject as never,
            findChiller,
          );
          insertObject["finalOilDiff"] =
            LogRecordHelper.roundToFourDecimals(finalOilDiff);

          const { nonCondensables, thisCondRefrigTemp } =
            await LogRecordHelper.getNonCondensables(
              insertObject as never,
              findChiller,
              this.conversionModel,
            );

          insertObject["nonCondensables"] =
            LogRecordHelper.roundToFourDecimals(nonCondensables);

          if (findChiller.highPressureRefrig) {
            insertObject["calculatedCondRefrigTemp"] =
              LogRecordHelper.roundToFourDecimals(thisCondRefrigTemp);
          }

          insertObject["validRunHours"] =
            await LogRecordHelper.validateRunHoursField(
              insertObject as never,
              findChiller,
            );

          insertObject["KWHLoss"] = LogRecordHelper.roundToFourDecimals(
            LogRecordHelper.calcKWHLoss(insertObject as never),
          );

          insertObject["BTULoss"] = LogRecordHelper.roundToFourDecimals(
            LogRecordHelper.calcBTULoss(insertObject as never),
          );

          insertObject["CO2"] = LogRecordHelper.roundToFourDecimals(
            LogRecordHelper.calcCO2(
              insertObject as never,
              findChiller.emissionFactor,
            ),
          );
          const facility = await this.facilityModel.findById({
            _id: findChiller.facilityId,
          });

          insertObject["altitudeCorrection"] =
            LogRecordHelper.roundToFourDecimals(
              await LogRecordHelper.getAltitudeCorrectionByLocation(
                facility,
                this.altCorrectionModel,
              ),
            );
          if (insertObject?.["numberOfCompressors"] == 1) {
            insertObject["comp1RunHours"] = element["Comp1 Run Hours"];
            insertObject["comp2RunHours"] = undefined;
            insertObject["comp1RunHourStart"] =
              element["Comp1 Run Hours Start"];
            insertObject["comp2RunHourStart"] = undefined;
          } else if (insertObject?.["numberOfCompressors"] == 2) {
            insertObject["comp1RunHours"] = element["Comp1 Run Hours"];
            insertObject["comp1RunHourStart"] =
              element["Comp1 Run Hours Start"];
            insertObject["comp2RunHours"] = element["Comp2 Run Hours"];
            insertObject["comp2RunHourStart"] =
              element["Comp2 Run Hours Start"];
          }

          insertObject["otherLoss"] =
            insertObject["condInletLoss"] +
            insertObject["evapTempLoss"] +
            insertObject["deltaLoss"];

          insertObject["effLossAtFullLoad"] =
            insertObject["condInletLoss"] +
            insertObject["EFLCondAppLoss"] +
            insertObject["evapTempLoss"] +
            insertObject["EFLEvapAppLoss"] +
            insertObject["nonCondLoss"] +
            insertObject["deltaLoss"];

          const logPayload = {
            ...insertObject,
            purgeTimeMin: purgeTime,
            updatedBy: loggedInUser._id,
            chillerId: new mongoose.Types.ObjectId(findChiller._id),
            isLogManual: false,
          };
          console.log("✌️logPayload --->", logPayload);

          // const hasInvalidFields = requiredFields.some((field) => {
          //   const value = logPayload[field];
          //   return (
          //     value === null ||
          //     value === undefined ||
          //     (typeof value === "number" && isNaN(value))
          //   );
          // });
          // console.log("hasInvalidFields: ", hasInvalidFields);
          const hasInvalidFields = requiredFields.some((field) => {
            const value = logPayload[field];

            if (value === null) {
              console.log(`❌ Invalid field: "${field}" → value is null`);
              return true;
            }

            if (value === undefined) {
              console.log(
                `❌ Invalid field: "${field}" → value is undefined (missing in payload)`,
              );
              return true;
            }

            if (typeof value === "number" && isNaN(value)) {
              console.log(`❌ Invalid field: "${field}" → value is NaN`);
              return true;
            }

            console.log(`✅ Valid field: "${field}" → ${value}`);
            return false;
          });

          console.log("✌️ hasInvalidFields --->", hasInvalidFields);
          console.log("isBadLog: ", isBadLog);
          if (hasInvalidFields || isBadLog) {
            const badLogData = {
              chillerID: logPayload["chillerId"]?.toString(),
              userId: logPayload["userId"]?.toString(),
              updatedBy: logPayload.updatedBy,
              ...Object.fromEntries(
                keysToCopy.map((key) => [key, logPayload[key]]),
              ),
            };

            const badLog = await this.badLogModel.create(badLogData);

            const title = "New Bad Log Entry";

            const fullName = loggedInUser
              ? `${loggedInUser.firstName} ${loggedInUser.lastName}`
              : "Unknown User";

            const description = generateTimelineDescription(title, {
              updatedBy: fullName,
              entryNotes: badLog.userNote,
              logId: badLog._id.toString(),
            });

            await this.timelineModel.create({
              chillerId: findChiller._id,
              title: title,
              description: description,
              updatedBy: loggedInUser?._id,
            });
            // ✅ Skip main log creation for bad log
            continue;
          }
          logPayload["chillerId"] = new mongoose.Types.ObjectId(findChiller.id);

          const newLog = await this.logsModel.create(logPayload);

          const fullName = `${loggedInUser.firstName} ${loggedInUser.lastName}`;

          const title = "New Log Entry";

          const description = generateTimelineDescription(title, {
            logId: newLog._id.toString(),
            updatedBy: fullName,
            entryNotes: newLog.userNote,
          });

          await this.timelineModel.create({
            chillerId: findChiller._id,
            title,
            description,
            updatedBy: loggedInUser?._id,
          });

          const companyUsers = await this.userModel.find({
            companyId: newLog.companyId,
            isActive: true,
            isDeleted: false,
          });

          console.log("✌️process.env.APP_ENV --->", process.env.APP_ENV);
          if (process.env.APP_ENV != "local") {
            if (companyUsers.length > 0) {
              for (const user of companyUsers) {
                // Skip if user has no general alert conditions
                if (!user.alerts?.general?.conditions?.length) continue;

                const { conditions, notifyBy } = user.alerts.general;

                let isUserEligible = false;

                switch (user.role) {
                  case "corporateManager":
                    // Corporate managers get alerts for all chillers under their company
                    isUserEligible = true;
                    break;

                  case "facilityManager":
                    // Facility managers only get alerts if the log's facility belongs to them
                    if (
                      user.facilityIds?.length &&
                      user.facilityIds.some(
                        (fid) =>
                          newLog.facilityId?.toString() === fid.toString(),
                      )
                    ) {
                      isUserEligible = true;
                    }
                    break;

                  case "operator":
                    // Operators only get alerts if the log's chiller belongs to them
                    if (
                      user.chillerIds?.length &&
                      user.chillerIds.some(
                        (cid) =>
                          newLog.chillerId?.toString() === cid.toString(),
                      )
                    ) {
                      isUserEligible = true;
                    }
                    break;
                }

                if (!isUserEligible) continue;

                // ✅ Evaluate conditions against newLog
                for (const condition of conditions) {
                  const { metric, warning, alert } = condition;

                  const metricValue = newLog[metric];
                  if (metricValue === undefined || metricValue === null)
                    continue;

                  const checkCondition = (
                    operator: string,
                    threshold: number,
                  ): boolean => {
                    switch (operator) {
                      case ">":
                        return metricValue > threshold;
                      case "<":
                        return metricValue < threshold;
                      case ">=":
                        return metricValue >= threshold;
                      case "<=":
                        return metricValue <= threshold;
                      case "=":
                        return metricValue === threshold;
                      default:
                        return false;
                    }
                  };

                  let severity: "warning" | "alert" | null = null;

                  if (checkCondition(alert.operator, alert.threshold)) {
                    severity = "alert";
                  } else if (
                    checkCondition(warning.operator, warning.threshold)
                  ) {
                    severity = "warning";
                  }

                  if (severity) {
                    const facility = await this.facilityModel.findById(
                      newLog.facilityId,
                    );
                    const chiller = await this.chillerModel.findById(
                      newLog.chillerId,
                    );

                    const message = `Chiller ${chiller?.serialNumber} at Facility ${facility?.name} triggered a ${severity.toUpperCase()} for metric "${metric}" with value ${metricValue}`;

                    // Send EMAIL
                    if (notifyBy === "email" || notifyBy === "both") {
                      this.logger.debug(`📧 Sending EMAIL to ${user.email}`);
                      await this.emailService.emailSender({
                        to: user.email,
                        subject: "General Alerts",
                        html: `
                <p>Hello ${user.firstName} ${user.lastName},</p>
                <p>${message}</p>
                <p>Thanks,</p>
              `,
                      });
                    }

                    // Send WEB notification
                    if (notifyBy === "web" || notifyBy === "both") {
                      this.logger.debug(
                        `🌐 Sending WEB notification to ${user.email}`,
                      );
                      const payload = {
                        senderId: null,
                        receiverId: user._id,
                        title: "General Alerts",
                        message,
                        type: "General",
                        redirection: { type: "General" },
                      };
                      await this.notificationService.sendNotification(
                        payload.receiverId,
                        payload,
                      );
                    }
                  }
                }
              }
            }
          }
        } else {
          const logPayload = {
            ...insertObject,
            purgeTimeMin: purgeTime,
            updatedBy: loggedInUser?._id,
            chillerId: findChiller
              ? new mongoose.Types.ObjectId(findChiller?._id)
              : "",
          };

          // Insert in Bad Logs
          const badLogData = {
            chillerID: logPayload?.["chillerId"]?.toString(),
            userId: logPayload["userId"]?.toString(),
            updatedBy: logPayload.updatedBy,
            ...Object.fromEntries(
              keysToCopy.map((key) => [key, logPayload[key]]),
            ),
          };

          console.log("badLogData: -------", badLogData);
          await this.badLogModel.create(badLogData);
        }
      }
      return [];
    } catch (error) {
      console.log("error: ", error);
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
