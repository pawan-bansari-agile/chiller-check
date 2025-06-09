import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { Document } from "mongoose";
import { Schema as MongooseSchema } from "mongoose";

import { TABLE_NAMES } from "../constants/table-name.constant";
import { Role } from "../constants/enum.constant";

export type UserDocument = User &
  Document & { createdAt: Date; updatedAt: Date };

@Schema({ collection: TABLE_NAMES.USERS, timestamps: true })
export class User {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop()
  email: string;

  @Prop()
  password: string;

  @Prop({})
  phoneNumber: string;

  @Prop({ required: true, enum: Role })
  role: Role;

  @Prop({})
  profileImage: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  resetPasswordToken: string;

  @Prop()
  resetPasswordExpires: Date;

  @Prop({ required: false, type: mongoose.Types.ObjectId })
  companyId: mongoose.Types.ObjectId;

  @Prop({
    required: false,
    type: [MongooseSchema.Types.ObjectId],
    // ref: Departments.name,
  })
  facilityIds: MongooseSchema.Types.ObjectId[];

  @Prop({ default: 0 })
  failedLoginAttempts: number;

  @Prop()
  lastFailedLoginAttempt: Date;

  @Prop()
  lastLoginTime: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
