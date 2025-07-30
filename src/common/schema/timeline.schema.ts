import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { TABLE_NAMES } from "../constants/table-name.constant";

export type TimelineDocument = Timeline & Document;

@Schema({
  collection: TABLE_NAMES.CHILLER_TIMELINE,
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
})
export class Timeline {
  @Prop({ type: Types.ObjectId, ref: "Chiller", required: true })
  chillerId: Types.ObjectId;

  @Prop({
    required: true,
    enum: [
      "Chiller Updated",
      "New Log Entry",
      "Log Edited",
      "Maintenance Entry Edited",
      "New Maintenance Entry",
      "Chiller Activated",
      "Chiller Inactivated",
      "New Bad Log Entry",
      "Bad Log Entry Edited",
      "Chiller Bulk Updated",
    ],
  })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  updatedBy: Types.ObjectId;
}

export const TimelineSchema = SchemaFactory.createForClass(Timeline);
