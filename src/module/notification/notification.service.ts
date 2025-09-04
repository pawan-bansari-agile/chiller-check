import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Request } from "express";
import mongoose, { Model } from "mongoose";
import { PaginationDto } from "src/common/dto/common.dto";
import { CustomError } from "src/common/helpers/exceptions";
import { DeleteNotificationDto } from "./dto/notification.dto";
import {
  Notification,
  NotificationDocument,
} from "src/common/schema/notification.schema";

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
  ) {}
  async notificationList(body: PaginationDto, req: Request) {
    console.log("req: ", req.user);
    try {
      const { search, sort_by, sort_order = "DESC", startDate, endDate } = body;

      const limit = body.limit ? Number(body.limit) : 10;
      const page = body.page ? Number(body.page) : 1;
      const skip = (page - 1) * limit;
      const pipeline = [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const matchStage: any = {
        receiverId: new mongoose.Types.ObjectId(req.user["_id"]),
        isDeleted: { $in: [null, false] },
      };

      // pipeline.push({
      //   $match: {
      //     receiverId: new mongoose.Types.ObjectId(req.user['_id']),
      //     isDeleted: { $in: [null, false] },
      //   },
      // });

      if (startDate && endDate) {
        const start = new Date(startDate); // MM-DD-YYYY
        start.setHours(0, 0, 0, 0);

        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        matchStage.createdAt = { $gte: start, $lte: end };
      } else if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        matchStage.createdAt = { $gte: start };
      } else if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchStage.createdAt = { $lte: end };
      }

      pipeline.push({ $match: matchStage });

      pipeline.push({
        $project: {
          _id: 1,
          title: 1,
          message: 1,
          isRead: 1,
          data: 1,
          type: 1,
          createdAt: 1,
        },
      });

      if (search) {
        pipeline.push({
          $match: {
            $or: [
              { title: { $regex: search.trim(), $options: "i" } },
              { message: { $regex: search.trim(), $options: "i" } },
            ],
          },
        });
      }

      //  default sorting
      const sortStage = {};
      sortStage[sort_by || "createdAt"] = sort_order === "ASC" ? 1 : -1;
      pipeline.push({ $sort: sortStage });

      // pagination
      pipeline.push({
        $facet: {
          list: [{ $skip: skip }, { $limit: limit }],
          totalRecords: [{ $count: "count" }],
        },
      });
      const notifications = await this.notificationModel.aggregate(pipeline);

      if (notifications) {
        notifications[0].totalRecords =
          notifications[0].totalRecords.length > 0
            ? notifications[0].totalRecords[0].count
            : 0;
      }
      return notifications[0];
    } catch (error) {
      throw CustomError.UnknownError(
        error?.message || "Something went wrong",
        error.status,
      );
    }
  }

  async deleteNotification(body: DeleteNotificationDto) {
    try {
      await this.notificationModel.findByIdAndUpdate(
        new mongoose.Types.ObjectId(body._id),
        { isDeleted: true },
      );
      return;
    } catch (error) {
      throw CustomError.UnknownError(
        error?.message || "Something went wrong",
        error.status,
      );
    }
  }

  async readNotifications(req: Request) {
    try {
      await this.notificationModel.updateMany(
        {
          receiverId: new mongoose.Types.ObjectId(req.user["_id"]),
          isRead: false,
        },
        {
          isRead: true,
        },
      );
      return;
    } catch (error) {
      throw CustomError.UnknownError(
        error?.message || "Something went wrong",
        error.status,
      );
    }
  }

  async getNotificationCount(req: Request) {
    try {
      const totalReadNotificationOpen = await this.notificationModel.find({
        receiverId: new mongoose.Types.ObjectId(req.user["_id"]),
        isRead: true,
      });

      const totalUnReadNotification = await this.notificationModel.find({
        receiverId: new mongoose.Types.ObjectId(req.user["_id"]),
        isRead: false,
      });

      const data = {
        totalReadNotificationOpen: totalReadNotificationOpen.length,
        totalUnReadNotification: totalUnReadNotification.length,
      };
      return data;
    } catch (error) {
      throw CustomError.UnknownError(
        error?.message || "Something went wrong",
        error.status,
      );
    }
  }
}
