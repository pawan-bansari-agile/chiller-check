import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { TABLE_NAMES } from "../constants/table-name.constant";
import mongoose from "mongoose";

export type LogsDocument = Logs &
  Document & { createdAt: Date; updatedAt: Date };

@Schema({
  collection: TABLE_NAMES.LOGS,
  timestamps: true,
  versionKey: false,
})
export class Logs {
  @Prop({ required: true, type: mongoose.Types.ObjectId, ref: "Chiller" })
  chillerId: mongoose.Types.ObjectId;

  @Prop({ required: true, type: mongoose.Types.ObjectId, ref: "Company" })
  companyId: mongoose.Types.ObjectId;

  @Prop({ required: true, type: mongoose.Types.ObjectId, ref: "Facility" })
  facilityId: mongoose.Types.ObjectId;

  @Prop({ required: true, type: mongoose.Types.ObjectId, ref: "User" })
  userId: mongoose.Types.ObjectId;

  @Prop({ required: true, type: mongoose.Types.ObjectId, ref: "User" })
  updatedBy: mongoose.Types.ObjectId;

  @Prop()
  readingDate: string;

  @Prop()
  readingDateUTC: string;

  @Prop()
  condInletTemp: number;

  @Prop()
  condOutletTemp: number;

  @Prop()
  condRefrigTemp: number;

  @Prop()
  condPressure: number;

  @Prop()
  condAPDrop: number;

  @Prop()
  evapInletTemp: number;

  @Prop()
  evapOutletTemp: number;

  @Prop()
  evapRefrigTemp: number;

  @Prop()
  evapPressure: number;

  @Prop()
  evapAPDrop: number;

  @Prop()
  ampsPhase1: number;

  @Prop()
  ampsPhase2: number;

  @Prop()
  ampsPhase3: number;

  @Prop()
  voltsPhase1: number;

  @Prop()
  voltsPhase2: number;

  @Prop()
  voltsPhase3: number;

  @Prop()
  oilPresHigh: number;

  @Prop()
  oilPresLow: number;

  @Prop()
  oilPresDif: number;

  @Prop()
  oilSumpTemp: number;

  @Prop()
  oilLevel: number;

  @Prop()
  bearingTemp: number;

  @Prop()
  runHours: number;

  @Prop()
  comp1RunHours: number;

  @Prop()
  comp2RunHours: number;

  @Prop()
  lastRunHours: number;

  @Prop()
  lastRunHoursReadingDate: number;

  @Prop()
  nextRunHours: number;

  @Prop()
  nextRunHoursReadingDate: number;

  @Prop({ required: false })
  purgeTimeHr: number;

  @Prop({ required: false })
  purgeTimeMin: number;

  @Prop({ required: false })
  userNote: string;

  @Prop()
  airTemp: number;

  @Prop()
  targetCost: number;

  @Prop()
  actualCost: number;

  @Prop()
  lossCost: number;

  @Prop()
  totalLoss: number;

  @Prop()
  effLoss: number;

  @Prop()
  condInletLoss: number;

  @Prop()
  condInletLossCost: number;

  @Prop()
  EFLCondAppLoss: number;

  @Prop()
  condApproach: number;

  @Prop()
  condAppLoss: number;

  @Prop()
  condAppLossCost: number;

  @Prop()
  evapTempLoss: number;

  @Prop()
  evapTempLossCost: number;

  @Prop()
  EFLEvapAppLoss: number;

  @Prop()
  evapAppLoss: number;

  @Prop()
  evapAppLossCost: number;

  @Prop()
  nonCondLoss: number;

  @Prop()
  nonCondLossCost: number;

  @Prop()
  deltaLoss: number;

  @Prop()
  deltaLossCost: number;

  @Prop()
  otherLoss: number;

  @Prop()
  condFlow: number;

  @Prop()
  evapFlow: number;

  @Prop()
  energyCost: number;

  @Prop()
  ampImbalance: number;

  @Prop()
  voltImbalance: number;

  @Prop()
  actualLoad: number;

  @Prop()
  finalOilDiff: number;

  @Prop()
  condAppVariance: number;

  @Prop()
  nonCondensables: number;

  @Prop()
  calculatedEvapRefrigTemp: number;

  @Prop()
  calculatedCondRefrigTemp: number;

  @Prop()
  evapAppVariance: number;

  @Prop()
  evapApproach: number;

  @Prop()
  altitudeCorrection: number;

  @Prop()
  validRunHours: boolean;

  @Prop()
  runHourStart: boolean;

  @Prop()
  comp1RunHourStart: boolean;

  @Prop()
  comp2RunHourStart: boolean;

  @Prop()
  KWHLoss: number;

  @Prop()
  BTULoss: number;

  @Prop()
  CO2: number;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  effLossAtFullLoad: number;

  @Prop({ required: true, default: false })
  isLogManual: boolean;
}

export const LogsSchema = SchemaFactory.createForClass(Logs);
