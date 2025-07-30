import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { Document } from "mongoose";

import { TABLE_NAMES } from "../constants/table-name.constant";
import { Facility } from "./facility.schema";
import { CompanyStatus } from "../constants/enum.constant";

export type CompanyDocument = Company &
  Document & { createdAt: Date; updatedAt: Date };

@Schema({
  collection: TABLE_NAMES.COMPANY,
  timestamps: true,
  versionKey: false,
})
export class Company {
  @Prop({ required: true })
  companyCode: number;

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
  website: string;

  @Prop({ default: 0 })
  totalFacilities: number;

  @Prop({
    required: false,
    type: [mongoose.Types.ObjectId],
    ref: Facility.name,
  })
  facilities: mongoose.Types.ObjectId[];

  @Prop({ default: 0 })
  totalChiller: number;

  @Prop({ default: false })
  isAssign: boolean;

  @Prop({ required: true, enum: CompanyStatus })
  status: string;

  // @Prop({ required: true })
  // isActive: boolean;

  @Prop({ required: true, default: false })
  isDeleted: boolean;

  @Prop({ required: false })
  freeTrialStartDate: Date;

  @Prop({ required: false })
  freeTrialEndDate: Date;

  @Prop({ required: false, default: false })
  trialReminderSent: boolean;
}

export const CompanySchema = SchemaFactory.createForClass(Company);
