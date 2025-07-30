import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { TABLE_NAMES } from "../constants/table-name.constant";

export type ScheduledJobDocument = ScheduledJob & Document;

@Schema({
  collection: TABLE_NAMES.SCHEDULE_JOBS,
  timestamps: true,
  versionKey: false,
})
export class ScheduledJob {
  @Prop({ required: true })
  jobId: string; // unique identifier (e.g., `trial-email-<companyId>`)

  @Prop({ required: true })
  jobType: "TRIAL_EMAIL" | "TRIAL_DEACTIVATE";

  @Prop({ required: true })
  companyId: string;

  @Prop({ required: true })
  executeAt: Date;

  @Prop({ required: true })
  isExecuted: boolean;
}

export const ScheduledJobSchema = SchemaFactory.createForClass(ScheduledJob);
