/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from "@nestjs/common";
import { TimelineListDto } from "./dto/timeline.dto";
import { CustomError, TypeExceptions } from "src/common/helpers/exceptions";
import { RESPONSE_ERROR } from "src/common/constants/response.constant";
import { InjectModel } from "@nestjs/mongoose";
import { Timeline } from "src/common/schema/timeline.schema";
import mongoose, { Model } from "mongoose";
import { Chiller } from "src/common/schema/chiller.schema";
import * as dayjs from "dayjs";
import * as utc from "dayjs/plugin/utc";
import * as timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class TimelineService {
  constructor(
    @InjectModel(Timeline.name) private readonly timelineModel: Model<Timeline>,
    @InjectModel(Chiller.name) private readonly chillerModel: Model<Chiller>,
  ) {}

  private parseMMDDYYYYToISO(dateStr: string): string {
    const [month, day, year] = dateStr.split("-");
    return new Date(`${year}-${month}-${day}T00:00:00.000Z`).toISOString();
  }

  async findAll(body: TimelineListDto) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        sort_by,
        sort_order = "desc",
        startDate,
        endDate,
        chillerId,
        timezone,
      } = body;

      if (!chillerId) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.CHILLER_ID_REQUIRED,
        );
      }

      const formattedChillerId = new mongoose.Types.ObjectId(chillerId);

      const existingChiller =
        await this.chillerModel.findById(formattedChillerId);

      if (!existingChiller) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.CHILLER_NOT_FOUND,
        );
      }

      if (!page || !limit || page <= 0 || limit <= 0) {
        throw TypeExceptions.BadRequestCommonFunction(
          RESPONSE_ERROR.INVALID_PAGE_AND_LIMIT_VALUE,
        );
      }

      const skip = (page - 1) * limit;
      const matchObj: Record<string, any> = {
        chillerId: formattedChillerId,
      };

      // Date range filter
      if (startDate || endDate) {
        matchObj.createdAt = {};
        // if (startDate) {
        //   matchObj.createdAt.$gte = new Date(startDate).toISOString();
        // }
        // if (endDate) {
        //   matchObj.createdAt.$lte = new Date(endDate).toISOString();
        // }
        if (startDate) {
          const startUtcDate = dayjs
            .tz(startDate, "MM-DD-YYYY", timezone || "Asia/Kolkata")
            .startOf("day")
            .utc()
            .toDate();
          matchObj.createdAt = { ...matchObj.createdAt, $gte: startUtcDate };
        }

        if (endDate) {
          const endUtcDate = dayjs
            .tz(endDate, "MM-DD-YYYY", timezone || "Asia/Kolkata")
            .endOf("day")
            .utc()
            .toDate();
          matchObj.createdAt = { ...matchObj.createdAt, $lte: endUtcDate };
        }
      }

      // Search filter
      if (search) {
        const regex = new RegExp(search.trim(), "i");
        matchObj.$or = [
          { title: { $regex: regex } },
          { description: { $regex: regex } },
        ];
      }

      const pipeline = [];

      // Match
      pipeline.push({ $match: matchObj });

      // Project
      pipeline.push({
        $project: {
          chillerId: 1,
          title: 1,
          description: 1,
          updatedBy: 1,
          createdAt: 1,
        },
      });

      // Sort
      pipeline.push({
        $sort: {
          [sort_by || "createdAt"]: sort_order === "ASC" ? 1 : -1,
        },
      });

      // Pagination
      pipeline.push({
        $facet: {
          timelineList: [{ $skip: skip }, { $limit: limit }],
          totalRecords: [{ $count: "count" }],
        },
      });

      const result = await this.timelineModel.aggregate(pipeline);
      return {
        timelineList: result[0]?.timelineList || [],
        totalRecords: result[0]?.totalRecords?.[0]?.count || 0,
      };
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }
}
