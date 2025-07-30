import { Prop, raw, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { Document } from "mongoose";

import { TABLE_NAMES } from "../constants/table-name.constant";
import { Role } from "../constants/enum.constant";
import {
  // AlertCondition,

  ModulePermission,
} from "src/module/user/types/user.types";
import {
  AlertCondition,
  LogEntryAlert,
  NotificationType,
} from "src/module/user/dto/user.dto";

export type UserDocument = User &
  Document & { createdAt: Date; updatedAt: Date };

@Schema({ collection: TABLE_NAMES.USERS, timestamps: true, versionKey: false })
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

  @Prop({ default: false })
  isActive: boolean;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ default: false })
  isProfileUpdated: boolean;

  @Prop()
  resetPasswordToken: string;

  @Prop()
  resetPasswordExpires: Date;

  @Prop({ required: false, type: mongoose.Types.ObjectId })
  companyId: mongoose.Types.ObjectId;

  @Prop({
    required: false,
    type: [mongoose.Types.ObjectId],
    // ref: Departments.name,
  })
  facilityIds: mongoose.Types.ObjectId[];

  @Prop({
    required: false,
    type: [mongoose.Types.ObjectId],
    // ref: Departments.name,
  })
  chillerIds: mongoose.Types.ObjectId[];

  @Prop({ default: 0 })
  failedLoginAttempts: number;

  @Prop()
  lastFailedLoginAttempt: Date;

  @Prop()
  lastLoginTime: Date;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  permissions?: Record<string, ModulePermission>;

  // @Prop({ type: [Object] })
  // responsibilities?: Responsibility[];

  // @Prop({ type: [Object] })
  // alerts?: {
  //   general?: AlertGroup;
  //   logs?: LogEntryAlert[];
  // };
  // @Prop({
  //   type: {
  //     general: {
  //       conditions: [{ type: Object }],
  //       notifyBy: {
  //         type: String,
  //         enum: Object.values(NotificationType),
  //         required: false,
  //       },
  //     },
  //     logs: [{ type: Object }],
  //   },
  //   default: undefined,
  // })
  // alerts?: {
  //   general?: {
  //     conditions: AlertCondition[];
  //     notifyBy?: NotificationType;
  //   };
  //   logs?: LogEntryAlert[];
  // };
  @Prop(
    raw({
      general: {
        conditions: [
          {
            _id: false,
            metric: String,
            warning: { operator: String, threshold: Number },
            alert: { operator: String, threshold: Number },
          },
        ],
        notifyBy: {
          type: String,
          enum: Object.values(NotificationType),
          required: false,
        },
      },
      logs: [
        {
          _id: false,
          type: {
            type: String,
            enum: ["manual", "maintenance", "csv", "program"],
            required: true,
          },
          daysSince: { type: Number, required: true },
          notifyBy: {
            type: String,
            enum: Object.values(NotificationType),
            required: false,
          },
          facilityIds: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: "Facility",
            default: undefined,
          },
          operatorIds: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: "User",
            default: undefined,
          },
        },
      ],
    }),
  )
  alerts?: {
    general?: {
      conditions: AlertCondition[];
      notifyBy?: NotificationType;
    };
    logs?: LogEntryAlert[];
  };
}

export const UserSchema = SchemaFactory.createForClass(User);
