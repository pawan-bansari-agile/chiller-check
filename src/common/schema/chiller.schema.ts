import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { Document } from "mongoose";

import { TABLE_NAMES } from "../constants/table-name.constant";
// import { Company } from './company.schema';

export type ChillerDocument = Chiller &
  Document & { createdAt: Date; updatedAt: Date };

@Schema({
  collection: TABLE_NAMES.CHILLER,
  timestamps: true,
  versionKey: false,
})
export class Chiller {
  @Prop({ required: true, type: mongoose.Types.ObjectId, ref: "Company" })
  companyId: mongoose.Types.ObjectId;

  @Prop({ required: true, type: mongoose.Types.ObjectId, ref: "Facility" })
  facilityId: mongoose.Types.ObjectId;

  @Prop({ required: false, default: "Electric" })
  type: string;

  @Prop()
  unit: string;

  // @Prop()
  // name: string;

  @Prop()
  ChillerNo: string;

  @Prop()
  weeklyHours: number;

  @Prop()
  weeksPerYear: number;

  @Prop()
  avgLoadProfile: number;

  @Prop()
  desInletWaterTemp: string;

  @Prop()
  make: string;

  @Prop()
  model: string;

  @Prop({ required: false })
  status: string;

  @Prop({ required: true, default: false })
  isDeleted: boolean;

  @Prop()
  serialNumber: string;

  @Prop()
  manufacturedYear: number;

  @Prop()
  tons: number;

  @Prop()
  kwr: number;

  @Prop()
  efficiencyRating: number;

  @Prop()
  energyCost: number;

  @Prop()
  refrigType: string;

  @Prop({ default: false })
  highPressureRefrig: boolean;

  @Prop({ default: false })
  useEvapRefrigTemp: boolean;

  // @Prop()
  // avgLoadProfile: number;

  @Prop()
  designVoltage: number;

  @Prop()
  voltageChoice: string;

  @Prop()
  fullLoadAmps: number;

  @Prop()
  ampChoice: string;

  @Prop()
  condDPDrop: number;

  @Prop()
  condDPDropUnit: string;

  @Prop()
  condPressureUnit: string;

  @Prop()
  condAPDropUnit: string;

  @Prop()
  condApproach: number;

  @Prop()
  evapDPDrop: number;

  @Prop()
  evapDPDropUnit: string;

  @Prop()
  evapPressureUnit: string;

  @Prop()
  evapAPDropUnit: string;

  @Prop()
  evapApproach: number;

  @Prop()
  evapDOWTemp: number;

  @Prop()
  compOPIndicator: string;

  @Prop()
  userNote: string;

  @Prop()
  havePurge: boolean;

  @Prop()
  maxPurgeTime: number;

  @Prop()
  purgeReadingUnit: string;

  @Prop()
  haveBearingTemp: boolean;

  @Prop()
  useRunHours: string;

  @Prop({ type: mongoose.Types.ObjectId, ref: "User" })
  updatedBy: string;

  @Prop()
  oilPresHighUnit: string;

  @Prop()
  oilPresLowUnit: string;

  @Prop()
  oilPresDifUnit: string;

  @Prop()
  condDesignDeltaT: number;

  @Prop()
  condDesignFlow: number;

  @Prop()
  evapDesignDeltaT: number;

  @Prop()
  evapDesignFlow: number;

  @Prop()
  numberOfCompressors: number;

  @Prop()
  useLoad: boolean;
}

export const ChillerSchema = SchemaFactory.createForClass(Chiller);
