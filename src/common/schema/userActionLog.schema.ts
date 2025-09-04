import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { TABLE_NAMES } from "../constants/table-name.constant";
import mongoose from "mongoose";

export type UserActionLogDocument = UserActionLog &
  Document & { createdAt: Date; updatedAt: Date };

@Schema({
  collection: TABLE_NAMES.USER_ACTION_LOG,
  timestamps: true,
  versionKey: false,
})
export class UserActionLog {
  @Prop({
    required: false,
    default: null,
    type: mongoose.Types.ObjectId,
    ref: "User",
  })
  userId: mongoose.Types.ObjectId;

  @Prop()
  userType: string;

  @Prop()
  apiEndPoint: string;

  @Prop()
  deviceType: string;

  @Prop()
  request: string;

  @Prop()
  response: string;

  @Prop()
  header: string;

  @Prop()
  timestamp: Date;
}

export const UserActionLogSchema = SchemaFactory.createForClass(UserActionLog);
