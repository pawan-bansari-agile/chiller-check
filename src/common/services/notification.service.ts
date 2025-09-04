import { Injectable } from "@nestjs/common";
import {
  Notification,
  NotificationDocument,
} from "../schema/notification.schema";
import * as firebase from "firebase-admin";
import { CustomError } from "../helpers/exceptions";
import { InjectModel } from "@nestjs/mongoose";
import mongoose, { Model } from "mongoose";
import { Device, DeviceDocument } from "../schema/device.schema";
import { DeviceType } from "../constants/enum.constant";

interface NotificationInterface {
  senderId?: unknown;
  receiverId?: unknown;
  title?: string;
  type?: number;
  message?: string;
  data?: unknown;
}
@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    @InjectModel(Device.name)
    private deviceModel: Model<DeviceDocument>,
  ) {}

  /**
   * Sends a notification to a user.
   * @param {number} id - The ID of the user.
   * @param {number} userType - The type of the user.
   * @param {any} data - The notification data.
   */
  async sendNotification(id, data) {
    const findFcmToken = await this.deviceModel.find({
      userId: new mongoose.Types.ObjectId(id),
    });

    await this.createNotification({
      senderId: data.senderId,
      receiverId: data.receiverId,
      title: data.title,
      type: data.type,
      message: data.message,
      data: data.redirection,
    });

    if (findFcmToken?.length) {
      await Promise.all(
        findFcmToken.map(async (device) => {
          console.log("device: ", device);
          const token = device.fcmToken;
          const tokens = [token];
          let payload;
          if (device.deviceType === DeviceType.WEB) {
            payload = {
              tokens: tokens,
              data: {
                title: data.title,
                type: data.type,
                body: data.message,
                data: JSON.stringify(data.redirection ? data.redirection : {}),
              },
            };
            console.log("web payload is::::::::::", payload);
          } else {
            payload = {
              tokens: tokens,
              notification: {
                title: data.title,
                body: data.message,
                ...(data.redirection &&
                  data.redirection.image && {
                    image: data.redirection.image,
                  }),
              },
              android: {
                notification: {
                  sound: "default",
                  priority: "high",
                  //smallIcon: "ic_notification",
                },
              },
              apns: {
                payload: {
                  aps: {
                    "mutable-content": 1,
                  },
                },
              },
              data: {
                title: data.title,
                type: data.type,
                body: data.message,
                data: JSON.stringify(data.redirection ? data.redirection : {}),
              },
            };
            if (data.redirection && data.redirection.image) {
              payload.notification.image = data.redirection.image;
              payload = {
                ...payload,
                apns: {
                  fcmOptions: { imageUrl: data.redirection.image },
                  payload: {
                    aps: {
                      "mutable-content": 1,
                    },
                  },
                },
              };
            }
          }
          if (token) {
            await firebase
              .messaging()
              .sendEachForMulticast(payload)
              .then((succ) => {
                return succ;
              })
              .catch((err) => {
                console.log("Notification err logs: ", err);
              });
          }
        }),
      );
    }
  }

  /**
   * Creates a notification.
   * @param {any} data - The notification data.
   * @returns {Promise<any>} The created notification.
   * @throws {CustomError} Throws an error if an unknown error occurs.
   */
  async createNotification(data: NotificationInterface) {
    console.log("data: ", data);
    try {
      const notification: NotificationInterface = {};
      notification.receiverId = data.receiverId;
      notification.senderId = data.senderId;
      notification.message = data.message;
      notification.title = data.title;
      notification.type = data.type;
      notification.data = data.data;

      await this.notificationModel.create(notification);

      return notification;
    } catch (error) {
      throw CustomError.UnknownError(error?.message, error?.status);
    }
  }
}
