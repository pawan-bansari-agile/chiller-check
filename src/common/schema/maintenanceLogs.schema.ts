import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { TABLE_NAMES } from "../constants/table-name.constant";
import mongoose from "mongoose";

export type LogsDocument = Logs &
  Document & { createdAt: Date; updatedAt: Date };

@Schema({
  collection: TABLE_NAMES.MAINTENANCE_LOGS,
  timestamps: true,
  versionKey: false,
})
export class Logs {
  @Prop({ required: true, type: mongoose.Types.ObjectId, ref: "Chiller" })
  chillerId: mongoose.Types.ObjectId;

  @Prop()
  maintenanceType: string;

  @Prop()
  maintenanceCategory: string;

  @Prop()
  maintenanceDate: number;

  @Prop()
  maintDescription: string;

  @Prop()
  maintQuantity: number;

  @Prop()
  comments: string;

  @Prop({ required: true, type: mongoose.Types.ObjectId, ref: "User" })
  updateBy: mongoose.Types.ObjectId;

  @Prop()
  useMaintDesc: string;

  @Prop()
  useMaintQuantity: number;

  @Prop()
  fileName: string;
}

export const LogsSchema = SchemaFactory.createForClass(Logs);
