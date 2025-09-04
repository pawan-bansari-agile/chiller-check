import { Injectable } from "@nestjs/common";
import { UserActionLog } from "../schema/userActionLog.schema";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

@Injectable()
export class UserActionLogService {
  constructor(
    @InjectModel(UserActionLog.name)
    private readonly userActionLogModel: Model<UserActionLog>,
  ) {}

  /**
   * The `addRecords` function logs information about a request and saves it to a database.
   * @param data - The `data` parameter is an object that contains various properties used to create a
   * log record.
   */
  async addRecords(data) {
    try {
      // Create an object with information to be logged
      const insertObj = {
        userId: data.letData?._id,
        userType: data.letData?.role,
        apiEndPoint: data?.url,
        deviceType: data.headers.authorization?.deviceType,
        request: JSON.stringify(data?.body),
        response: "", // Response will be updated later
        timestamp: data?.timestamp,
        header: JSON.stringify(data?.headers),
      };

      // Log the success message
      await this.userActionLogModel.create(insertObj);

      return true;
    } catch (error) {
      // If any error occurs, throw a custom "Unknown Error" with the error message and status
      console.log("error record service:", error);
    }
  }
}
