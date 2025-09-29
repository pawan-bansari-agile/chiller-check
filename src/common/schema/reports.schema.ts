import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { TABLE_NAMES } from "../constants/table-name.constant";
import mongoose from "mongoose";

export type ReportDocument = Report &
  Document & { createdAt: Date; updatedAt: Date };

@Schema({
  collection: TABLE_NAMES.REPORTS,
  timestamps: true,
  versionKey: false,
})
export class Report {
  @Prop()
  name: string;

  @Prop()
  startDate: string;

  @Prop()
  endDate: string;

  @Prop()
  notification: string;

  @Prop()
  parameter: string;

  @Prop()
  chartType: string;

  @Prop({ required: false, type: mongoose.Types.ObjectId, ref: "Company" })
  companyId: mongoose.Types.ObjectId;

  @Prop({
    required: false,
    type: [mongoose.Types.ObjectId],
    // ref: Departments.name,
  })
  facilityIds: mongoose.Types.ObjectId[];

  @Prop()
  description: string;

  @Prop()
  header: string;

  @Prop()
  footer: string;

  @Prop()
  dateType: string;

  // @Prop({
  //   required: false,
  //   type: [mongoose.Types.ObjectId],
  //   // ref: Departments.name,
  // })
  // sharedTo: mongoose.Types.ObjectId[];
  @Prop({
    required: false,
    type: [
      {
        _id: false,
        userId: { type: mongoose.Types.ObjectId, ref: "User", required: true },
        interval: {
          type: String,
          enum: ["daily", "weekly", "monthly"],
          required: true,
        },
      },
    ],
    default: undefined,
  })
  sharedTo?: {
    userId: mongoose.Types.ObjectId;
    interval: "daily" | "weekly" | "monthly";
  }[];

  @Prop({ required: true, type: mongoose.Types.ObjectId, ref: "User" })
  createdBy: mongoose.Types.ObjectId;

  @Prop({ required: true, type: mongoose.Types.ObjectId, ref: "User" })
  updatedBy: mongoose.Types.ObjectId;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const ReportSchema = SchemaFactory.createForClass(Report);
