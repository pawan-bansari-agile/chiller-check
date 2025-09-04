import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";
import { TABLE_NAMES } from "../constants/table-name.constant";

@Schema({
  collection: TABLE_NAMES.HIST_COMPANY_PERFORMANCE,
  timestamps: true,
  versionKey: false,
})
export class HistCompanyPerformance {
  @Prop({ type: Types.ObjectId, required: true }) companyId: Types.ObjectId;

  @Prop({ required: true }) year: number;
  @Prop({ required: true }) quarter: number;
  @Prop({ required: true }) month: number;

  @Prop({ default: 0 }) averageLoss: number;
  @Prop({ default: 0 }) targetCost: number;
  @Prop({ default: 0 }) lossCost: number;
  @Prop({ default: 0 }) actualCost: number;
  @Prop({ default: 0 }) kwhLoss: number;
  @Prop({ default: 0 }) btuLoss: number;
  @Prop({ default: 0 }) co2: number;
  @Prop({ default: 0 }) avgExcessCondApp: number;
  @Prop({ default: 0 }) avgExcessEvapApp: number;
  @Prop({ default: 0 }) avgOtherLoss: number;
}

export const HistCompanyPerformanceSchema = SchemaFactory.createForClass(
  HistCompanyPerformance,
);
