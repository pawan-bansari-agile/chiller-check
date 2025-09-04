import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";
import { TABLE_NAMES } from "../constants/table-name.constant";
import { User } from "./user.schema";

export type NotificationDocument = Notification & Document;

@Schema({
  collection: TABLE_NAMES.NOTIFICAIONS,
  timestamps: true,
})
export class Notification {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: false,
    default: null,
  })
  senderId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: false,
    default: null,
  })
  receiverId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ type: Object })
  data: unknown;

  @Prop()
  type: string;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
