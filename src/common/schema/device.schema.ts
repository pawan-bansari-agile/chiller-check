import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { Document } from "mongoose";
import { TABLE_NAMES } from "../constants/table-name.constant";
import { User } from "./user.schema";
import { DeviceType, Role } from "../constants/enum.constant";

export type DeviceDocument = Device & Document;

@Schema({ collection: TABLE_NAMES.DEVICES, timestamps: true })
export class Device {
  @Prop({ required: true, type: mongoose.Types.ObjectId, ref: User.name })
  userId: mongoose.Types.ObjectId;

  @Prop({ required: true })
  role: Role;

  @Prop({ required: true })
  accessToken: string;

  @Prop()
  fcmToken: string;

  @Prop({ required: false })
  deviceId: string;

  @Prop({ required: true })
  deviceType: DeviceType;
}

export const DeviceSchema = SchemaFactory.createForClass(Device);
