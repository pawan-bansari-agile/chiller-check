import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { Document } from "mongoose";
import { Schema as MongooseSchema } from "mongoose";
import { TABLE_NAMES } from "../constants/table-name.constant";

export type BadLogDocument = BadLog &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

@Schema({
  collection: TABLE_NAMES.BAD_LOGS,
  timestamps: true,
  versionKey: false,
})
export class BadLog {
  @Prop({ required: true })
  chillerID: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, type: MongooseSchema.Types.ObjectId })
  updatedBy: mongoose.Types.ObjectId;

  @Prop({ required: true })
  readingDate: string;

  @Prop({ required: true })
  readingDateUTC: string;

  @Prop() condInletTemp: number;
  @Prop() condOutletTemp: number;
  @Prop() condRefrigTemp: number;
  @Prop() condPressure: number;
  @Prop() condAPDrop: number;

  @Prop() evapInletTemp: number;
  @Prop() evapOutletTemp: number;
  @Prop() evapRefrigTemp: number;
  @Prop() evapPressure: number;
  @Prop() evapAPDrop: number;

  @Prop() ampsPhase1: number;
  @Prop() ampsPhase2: number;
  @Prop() ampsPhase3: number;

  @Prop() voltsPhase1: number;
  @Prop() voltsPhase2: number;
  @Prop() voltsPhase3: number;

  @Prop() oilPresHigh: number;
  @Prop() oilPresLow: number;
  @Prop() oilPresDif: number;
  @Prop() oilSumpTemp: number;
  @Prop() oilLevel: number;

  @Prop() bearingTemp: number;
  @Prop() runHours: number;

  @Prop() purgeTimeHr: number;
  @Prop() purgeTimeMin: number;

  @Prop() userNote: string;
  @Prop() airTemp: number;
}

export const BadLogSchema = SchemaFactory.createForClass(BadLog);
