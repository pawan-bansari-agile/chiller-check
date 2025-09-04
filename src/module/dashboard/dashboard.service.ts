import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { User } from "src/common/schema/user.schema";
import mongoose, { Model } from "mongoose";
import { Logs } from "src/common/schema/logs.schema";
import { AuthExceptions, CustomError } from "src/common/helpers/exceptions";
import { Role } from "src/common/constants/enum.constant";
import { Chiller } from "src/common/schema/chiller.schema";
import { Facility } from "src/common/schema/facility.schema";
import { LogRecordHelper } from "src/common/helpers/logs/log.helper";
import { DashboardDto } from "./dto/dashboard.dto";
import { HistCompanyPerformance } from "src/common/schema/hist-company-performance.schema";
import { TABLE_NAMES } from "src/common/constants/table-name.constant";

interface ChillerWithFacility {
  _id: mongoose.Types.ObjectId;
  ChillerNo: string;
  make: string;
  model: string;
  facilityId: mongoose.Types.ObjectId;
  facilityName: string;
  facilityTimezone: string;
  status: string;
  energyCost: number;
  emissionFactor: number;
}

interface FacilityGroup {
  facilityId: mongoose.Types.ObjectId;
  facilityName: string;
  facilityTimezone: string;
  chillers: ChillerWithFacility[];
}

interface PerformanceSummary {
  averageLoss: number;
  targetCost: number;
  lossCost: number;
  actualCost: number;
  kwhLoss: number;
  btuLoss: number;
  co2: number;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Logs.name) private readonly logsModel: Model<Logs>,
    @InjectModel(Chiller.name) private readonly chillerModel: Model<Chiller>,
    @InjectModel(Facility.name) private readonly facilityModel: Model<Facility>,
    @InjectModel(HistCompanyPerformance.name)
    private readonly histCompanyPerformanceModel: Model<HistCompanyPerformance>,
  ) {}

  async findAll(loggedInUserId: string, body: DashboardDto) {
    try {
      const loggedInUser = await this.userModel.findById(
        new mongoose.Types.ObjectId(loggedInUserId),
      );

      if (!loggedInUser) {
        throw AuthExceptions.AccountNotExist();
      }

      const isAdminUser = [Role.ADMIN, Role.SUB_ADMIN].includes(
        loggedInUser.role,
      );

      // Determine the target companyId for filtering
      let companyId: mongoose.Types.ObjectId | null = null;

      // If admin is viewing other company's dashboard
      if (isAdminUser && body.companyId) {
        companyId = new mongoose.Types.ObjectId(body.companyId);
      } else if (loggedInUser.companyId) {
        companyId = new mongoose.Types.ObjectId(loggedInUser.companyId);
      } else {
        // No company info — return empty
        return {
          efficiencyAlerts: [],
          performanceSummary: {},
          facilityWiseChillerLogs: [],
          facilityWisePerformance: [],
          chillers: [],
        };
      }

      // Build match object based on user role
      const matchObj = this.buildMatchObject(loggedInUser, companyId);
      console.log("matchObj: ", matchObj);

      // Get chillers based on user permissions
      const chillers = (await this.chillerModel.aggregate([
        { $match: matchObj },
        {
          $lookup: {
            from: TABLE_NAMES.FACILITY,
            localField: "facilityId",
            foreignField: "_id",
            as: "facility",
          },
        },
        { $unwind: "$facility" },
        {
          $project: {
            _id: 1,
            ChillerNumber: 1,
            make: 1,
            model: 1,
            facilityId: 1,
            facilityName: "$facility.name",
            facilityTimezone: "$facility.timezone",
            status: 1,
            energyCost: 1,
            emissionFactor: 1,
          },
        },
      ])) as ChillerWithFacility[];

      const chillerIds = chillers.map(
        (c) => new mongoose.Types.ObjectId(c._id),
      );
      console.log("chillerIds: ", chillerIds);

      // 1. Efficiency Loss Alerts (All facilities with chiller's log)
      const efficiencyAlerts = await this.getEfficiencyLossAlerts(chillerIds);

      // 2. Performance Summary for Company's Chillers based on different date ranges
      const performanceSummary =
        await this.getCompanyPerformanceSummary(companyId);

      console.log("performanceSummary: ------------", performanceSummary);
      // 3. Facility-wise all chiller's logs
      const facilityWiseChillerLogs = await this.getFacilityWiseChillerLogs(
        chillers,
        chillerIds,
      );

      // 4. Facility-wise performance based on date ranges
      const facilityWisePerformance =
        await this.getFacilityWisePerformance(chillers);

      // Get chillers with latest logs for dashboard overview
      const chillersWithLatestLogs = await this.getChillersWithLatestLogs(
        chillers,
        chillerIds,
      );

      return {
        efficiencyAlerts,
        performanceSummary: performanceSummary?.["performanceSummary"],
        facilityWiseChillerLogs,
        facilityWisePerformance,
        chillers: chillersWithLatestLogs,
      };
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }

  private buildMatchObject(
    loggedInUser: User,
    companyId: mongoose.Types.ObjectId | null,
  ) {
    const matchObj: Record<string, unknown> = { isDeleted: false };

    if (companyId) {
      matchObj.companyId = companyId;
    }

    switch (loggedInUser.role) {
      case Role.CORPORATE_MANAGER:
        // Can see all chillers in their company
        break;

      case Role.FACILITY_MANAGER:
        if (loggedInUser.facilityIds?.length > 0) {
          matchObj.facilityId = {
            $in: loggedInUser.facilityIds.map(
              (id) => new mongoose.Types.ObjectId(id),
            ),
          };
        }
        break;

      case Role.OPERATOR:
        if (loggedInUser.chillerIds?.length > 0) {
          matchObj._id = {
            $in: loggedInUser.chillerIds.map(
              (id) => new mongoose.Types.ObjectId(id),
            ),
          };
        }
        break;

      case Role.ADMIN:
      case Role.SUB_ADMIN:
        // Can see all chillers
        break;

      default:
        matchObj._id = null; // Invalid role → no data
    }

    return matchObj;
  }

  private async getEfficiencyLossAlerts(chillerIds: mongoose.Types.ObjectId[]) {
    if (chillerIds.length === 0) return [];

    // const sevenDaysAgo = new Date();
    // sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const alerts = await this.logsModel.aggregate([
      {
        $match: {
          chillerId: { $in: chillerIds },
          isDeleted: false,
          $expr: {
            $gte: [
              {
                $add: [
                  { $ifNull: ["$effLoss", 0] },
                  { $ifNull: ["$condAppLoss", 0] },
                  { $ifNull: ["$evapAppLoss", 0] },
                  { $ifNull: ["$nonCondLoss", 0] },
                  { $ifNull: ["$otherLoss", 0] },
                ],
              },
              10,
            ],
          },
        },
      },
      // Sort by chillerId and readingDateUTC DESC so latest comes first
      { $sort: { chillerId: 1, readingDateUTC: -1 } },

      // Group by chillerId and pick the latest log (which comes first due to sort)
      {
        $group: {
          _id: "$chillerId",
          log: { $first: "$$ROOT" },
        },
      },

      // Flatten the grouped log object
      { $replaceRoot: { newRoot: "$log" } },

      // Enrich with chiller and facility data
      {
        $lookup: {
          from: TABLE_NAMES.CHILLER,
          localField: "chillerId",
          foreignField: "_id",
          as: "chiller",
        },
      },
      { $unwind: "$chiller" },
      {
        $lookup: {
          from: TABLE_NAMES.FACILITY,
          localField: "chiller.facilityId",
          foreignField: "_id",
          as: "facility",
        },
      },
      { $unwind: "$facility" },

      // Final projection
      {
        $project: {
          _id: 1,
          chillerId: 1,
          logId: "$_id",
          facilityName: "$facility.name",
          facilityTimezone: "$facility.timezone",
          chillerName: {
            $concat: [
              { $ifNull: ["$chiller.make", ""] },
              " ",
              { $ifNull: ["$chiller.model", ""] },
            ],
          },
          ChillerNo: "$chiller.ChillerNo",
          ChillerNumber: "$chiller.ChillerNumber",
          effLoss: 1,
          condAppLoss: 1,
          evapAppLoss: 1,
          nonCondLoss: 1,
          otherLoss: 1,
          totalLoss: {
            $add: [
              { $ifNull: ["$effLoss", 0] },
              { $ifNull: ["$condAppLoss", 0] },
              { $ifNull: ["$evapAppLoss", 0] },
              { $ifNull: ["$nonCondLoss", 0] },
              { $ifNull: ["$otherLoss", 0] },
            ],
          },
          readingDate: 1,
          readingDateUTC: 1,
        },
      },
      { $sort: { totalLoss: -1 } }, // Final sort by totalLoss if needed
    ]);

    return alerts;
  }

  private async getCompanyPerformanceSummary(
    companyId: mongoose.Types.ObjectId,
  ) {
    return await LogRecordHelper.getCompanyPerformanceSummary(
      companyId.toString(),
      this.chillerModel,
      this.logsModel,
    );
  }

  private async getChillersWithLatestLogs(
    chillers: ChillerWithFacility[],
    chillerIds: mongoose.Types.ObjectId[],
  ) {
    if (chillerIds.length === 0) return [];

    // Get latest logs for all chillers
    const latestLogs = await this.logsModel.aggregate([
      { $match: { chillerId: { $in: chillerIds }, isDeleted: false } },
      { $sort: { readingDateUTC: -1 } },
      {
        $group: {
          _id: "$chillerId",
          latestLog: { $first: "$$ROOT" },
        },
      },
    ]);

    // Map chillers with their latest logs
    return chillers.map((chiller) => {
      const latestLog = latestLogs.find(
        (log) => log._id.toString() === chiller._id.toString(),
      )?.latestLog;

      return {
        ...chiller,
        latestLog: latestLog || null,
        // Add status indicators
        hasHighEfficiencyLoss: latestLog?.effLoss >= 10,
        lastReadingDate: latestLog?.readingDate || null,
        lastReadingDateUTC: latestLog?.readingDateUTC || null,
      };
    });
  }

  private async getFacilityWiseChillerLogs(
    chillers: ChillerWithFacility[],
    chillerIds: mongoose.Types.ObjectId[],
  ) {
    if (chillerIds.length === 0) return [];

    // Group chillers by facility
    const facilityGroups = chillers.reduce(
      (acc, chiller) => {
        const facilityId = chiller.facilityId.toString();
        if (!acc[facilityId]) {
          acc[facilityId] = {
            facilityId: chiller.facilityId,
            facilityName: chiller.facilityName,
            facilityTimezone: chiller.facilityTimezone,
            chillers: [],
          };
        }
        acc[facilityId].chillers.push(chiller);
        return acc;
      },
      {} as Record<string, FacilityGroup>,
    );

    const facilityWiseLogs = [];

    for (const [, facilityData] of Object.entries(facilityGroups)) {
      const facilityChillerIds = facilityData.chillers.map((c) => c._id);

      // Get latest logs for each chiller in this facility
      const latestLogs = await this.logsModel.aggregate([
        {
          $match: {
            chillerId: { $in: facilityChillerIds },
            isDeleted: false,
          },
        },
        { $sort: { readingDateUTC: -1 } },
        {
          $group: {
            _id: "$chillerId",
            latestLog: { $first: "$$ROOT" },
          },
        },
        {
          $lookup: {
            from: TABLE_NAMES.CHILLER,
            localField: "_id",
            foreignField: "_id",
            as: "chiller",
          },
        },
        { $unwind: "$chiller" },
        {
          $project: {
            _id: 1,
            logId: "$latestLog._id",
            chillerId: "$chiller._id",
            // chillerId: 1,
            ChillerNo: "$chiller.ChillerNo",
            chillerName: {
              $concat: [
                { $ifNull: ["$chiller.make", ""] },
                " ",
                { $ifNull: ["$chiller.model", ""] },
              ],
            },
            effLoss: "$latestLog.effLoss",
            condAppLoss: "$latestLog.condAppLoss",
            evapAppLoss: "$latestLog.evapAppLoss",
            nonCondLoss: "$latestLog.nonCondLoss",
            otherLoss: "$latestLog.otherLoss",
            totalLoss: {
              $add: [
                { $ifNull: ["$latestLog.effLoss", 0] },
                { $ifNull: ["$latestLog.condAppLoss", 0] },
                { $ifNull: ["$latestLog.evapAppLoss", 0] },
                { $ifNull: ["$latestLog.nonCondLoss", 0] },
                { $ifNull: ["$latestLog.otherLoss", 0] },
              ],
            },
            readingDate: "$latestLog.readingDate",
            readingDateUTC: "$latestLog.readingDateUTC",
          },
        },
        { $sort: { totalLoss: -1 } },
      ]);

      facilityWiseLogs.push({
        facilityId: facilityData.facilityId,
        facilityName: facilityData.facilityName,
        chillerLogs: latestLogs,
      });
    }

    return facilityWiseLogs;
  }

  private async getFacilityWisePerformance(chillers: ChillerWithFacility[]) {
    if (chillers.length === 0) return [];

    // Group chillers by facility
    const facilityGroups = chillers.reduce(
      (acc, chiller) => {
        const facilityId = chiller.facilityId.toString();
        if (!acc[facilityId]) {
          acc[facilityId] = {
            facilityId: chiller.facilityId,
            facilityName: chiller.facilityName,
            facilityTimezone: chiller.facilityTimezone,
            chillers: [],
          };
        }
        acc[facilityId].chillers.push(chiller);
        return acc;
      },
      {} as Record<string, FacilityGroup>,
    );

    const facilityWisePerformance = [];

    for (const [, facilityData] of Object.entries(facilityGroups)) {
      const facilityChillerIds = facilityData.chillers.map(
        (c) => new mongoose.Types.ObjectId(c._id),
      );

      // Calculate performance for different date ranges
      const ranges = LogRecordHelper.getFixedRanges(new Date());
      const facilityPerformance: Record<string, PerformanceSummary> = {};

      for (const [label, range] of Object.entries(ranges)) {
        const performance = await this.calculateFacilityPerformanceInRange(
          facilityChillerIds,
          range.startDate,
          range.endDate,
        );
        facilityPerformance[label] = performance;
      }

      facilityWisePerformance.push({
        facilityId: facilityData.facilityId,
        facilityName: facilityData.facilityName,
        performance: facilityPerformance,
      });
    }

    return facilityWisePerformance;
  }

  private async calculateFacilityPerformanceInRangeBKP(
    chillerIds: mongoose.Types.ObjectId[],
    startDate: Date,
    endDate: Date,
  ): Promise<PerformanceSummary> {
    const logs = await this.logsModel.find({
      chillerId: { $in: chillerIds },
      isDeleted: false,
      readingDateUTC: {
        $gte: startDate.toISOString(),
        $lte: endDate.toISOString(),
      },
    });

    if (logs.length === 0) {
      return {
        averageLoss: 0,
        targetCost: 0,
        lossCost: 0,
        actualCost: 0,
        kwhLoss: 0,
        btuLoss: 0,
        co2: 0,
      };
    }

    // Calculate aggregated performance
    const totalLoss = logs.reduce((sum, log) => sum + (log.effLoss || 0), 0);
    const avgLoss = totalLoss / logs.length;

    const totalTargetCost = logs.reduce(
      (sum, log) => sum + (log.targetCost || 0),
      0,
    );
    const totalActualCost = logs.reduce(
      (sum, log) => sum + (log.actualCost || 0),
      0,
    );
    const totalLossCost = logs.reduce(
      (sum, log) => sum + (log.lossCost || 0),
      0,
    );

    const totalKWHLoss = logs.reduce((sum, log) => sum + (log.KWHLoss || 0), 0);
    const totalBTULoss = logs.reduce((sum, log) => sum + (log.BTULoss || 0), 0);
    const totalCO2 = logs.reduce((sum, log) => sum + (log.CO2 || 0), 0);

    return {
      averageLoss: Math.round(avgLoss * 100) / 100,
      targetCost: Math.round(totalTargetCost * 100) / 100,
      lossCost: Math.round(totalLossCost * 100) / 100,
      actualCost: Math.round(totalActualCost * 100) / 100,
      kwhLoss: Math.round(totalKWHLoss * 100) / 100,
      btuLoss: Math.round(totalBTULoss * 100) / 100,
      co2: Math.round(totalCO2 * 100) / 100,
    };
  }
  private async calculateFacilityPerformanceInRange(
    chillerIds: mongoose.Types.ObjectId[],
    startDate: Date,
    endDate: Date,
  ): Promise<PerformanceSummary> {
    let chillerCount = 0;
    const combined = {
      averageLoss: 0,
      targetCost: 0,
      lossCost: 0,
      actualCost: 0,
      kwhLoss: 0,
      btuLoss: 0,
      co2: 0,
    };

    const chillers = await this.chillerModel.find({
      _id: { $in: chillerIds },
    });

    for (const chiller of chillers) {
      const logRecords = await LogRecordHelper.getLogRecordsInRange(
        startDate,
        endDate,
        chiller._id.toString(),
        this.logsModel,
      );

      if (!logRecords.length) continue;

      const useRunHours = chiller.useRunHours
        ? LogRecordHelper.checkRunHoursForRange(logRecords)
        : false;

      const perf = await LogRecordHelper.getPerformanceForRange(
        logRecords,
        useRunHours,
        startDate,
        this.logsModel,
        this.chillerModel,
      );

      combined.averageLoss += perf.avgLoss || 0;
      combined.targetCost += perf.targetCost || 0;
      combined.lossCost += perf.lossCost || 0;
      combined.actualCost += perf.actualCost || 0;
      combined.kwhLoss += perf.kwhLoss || 0;
      combined.btuLoss += perf.BTULoss || 0;
      combined.co2 += perf.CO2 || 0;

      chillerCount++;
    }

    // Average across chillers
    if (chillerCount > 0) {
      combined.averageLoss =
        Math.round((combined.averageLoss / chillerCount) * 100) / 100;
    }

    // Round all values
    return {
      averageLoss: combined.averageLoss,
      targetCost: Math.round(combined.targetCost * 100) / 100,
      lossCost: Math.round(combined.lossCost * 100) / 100,
      actualCost: Math.round(combined.actualCost * 100) / 100,
      kwhLoss: Math.round(combined.kwhLoss * 100) / 100,
      btuLoss: Math.round(combined.btuLoss * 100) / 100,
      // co2: Math.round(combined.co2 * 100) / 100,
      co2: Math.round(combined.co2),
    };
  }
}
