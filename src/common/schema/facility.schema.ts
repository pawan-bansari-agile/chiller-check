import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { Document } from "mongoose";

import { TABLE_NAMES } from "../constants/table-name.constant";
// import { Company } from './company.schema';

export type FacilityDocument = Facility &
  Document & { createdAt: Date; updatedAt: Date };

@Schema({ collection: TABLE_NAMES.FACILITY, timestamps: true })
export class Facility {
  @Prop({ required: true, type: mongoose.Types.ObjectId, ref: "Company" })
  companyId: mongoose.Types.ObjectId;

  @Prop({ required: true })
  facilityCode: number;

  @Prop({ required: true })
  name: string;

  @Prop()
  address1: string;

  @Prop()
  address2: string;

  @Prop()
  city: string;

  @Prop()
  state: string;

  @Prop()
  country: string;

  @Prop()
  zipcode: string;

  @Prop()
  timezone: string;

  @Prop({ required: true, default: false })
  isActive: boolean;

  @Prop({ required: true, default: false })
  isDeleted: boolean;

  @Prop({ default: 0 })
  totalChiller: number;

  @Prop({ default: 0 })
  totalOperators: number;
}

export const FacilitySchema = SchemaFactory.createForClass(Facility);
