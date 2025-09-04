import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { TABLE_NAMES } from "../constants/table-name.constant";
import mongoose from "mongoose";

export type MaintenanceDocument = MaintenanceRecordsLogs &
  Document & { createdAt: Date; updatedAt: Date };

@Schema({
  collection: TABLE_NAMES.MAINTENANCE_LOGS,
  timestamps: true,
  versionKey: false,
})
export class MaintenanceRecordsLogs {
  @Prop({ required: true, type: mongoose.Types.ObjectId, ref: "Company" })
  companyId: mongoose.Types.ObjectId;

  @Prop({ required: true, type: mongoose.Types.ObjectId, ref: "Facility" })
  facilityId: mongoose.Types.ObjectId;

  @Prop({ required: true, type: mongoose.Types.ObjectId, ref: "Chiller" })
  chillerId: mongoose.Types.ObjectId;

  @Prop()
  maintenanceType: string;

  @Prop()
  maintenanceCategory: string;

  @Prop()
  maintenanceDate: string;

  @Prop()
  maintDescription: string;

  @Prop()
  maintQuantity: number;

  @Prop()
  purgeReading: number;

  @Prop()
  comments: string;

  @Prop({ required: true, type: mongoose.Types.ObjectId, ref: "User" })
  createdBy: mongoose.Types.ObjectId;

  @Prop({ required: true, type: mongoose.Types.ObjectId, ref: "User" })
  updatedBy: mongoose.Types.ObjectId;

  // @Prop()
  // useMaintDesc: string;

  // @Prop()
  // useMaintQuantity: number;

  @Prop()
  fileName: string;

  @Prop()
  fileRealName: string;

  @Prop()
  fileSize: number;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const MaintenanceRecordsLogsSchema = SchemaFactory.createForClass(
  MaintenanceRecordsLogs,
);
