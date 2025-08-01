import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  // IsPhoneNumber,
  IsString,
  IsBoolean,
  IsObject,
  ValidateNested,
  IsArray,
  IsNumber,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  // IsIn,
  IsMongoId,
  ValidateIf,
  Matches,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Role } from "src/common/constants/enum.constant";
import { ModuleName, ModulePermission } from "../types/user.types";

export enum NotificationType {
  WEB = "web",
  EMAIL = "email",
  BOTH = "both",
}

export enum ComparisonOperator {
  LTE = "<=",
  EQ = "=",
  GTE = ">=",
  LT = "<",
  GT = ">",
}

const validModuleKeys = Object.values(ModuleName);

// --- Custom Validation for permissions ---
export function IsModulePermissionObject(
  validationOptions?: ValidationOptions,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: "isModulePermissionObject",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
        validate(value: any, _args: ValidationArguments) {
          if (typeof value !== "object" || Array.isArray(value)) return false;
          for (const module in value) {
            if (!validModuleKeys.includes(module as ModuleName)) {
              return false;
            }
            const perm = value[module];
            if (
              typeof perm !== "object" ||
              Array.isArray(perm) ||
              Object.keys(perm).some(
                (key) =>
                  !["view", "add", "edit", "toggleStatus"].includes(key) ||
                  typeof perm[key] !== "boolean",
              )
            ) {
              return false;
            }
          }
          return true;
        },
        defaultMessage() {
          return `permissions must be a valid object with boolean fields (view, add, edit, toggleStatus)`;
        },
      },
    });
  };
}

// --- Threshold DTO ---
export class Threshold {
  @IsEnum(ComparisonOperator)
  operator: ComparisonOperator;

  @IsNumber()
  threshold: number;
}

// --- AlertCondition DTO ---
export class AlertCondition {
  @IsString()
  metric: string;

  @ValidateNested()
  @Type(() => Threshold)
  warning: Threshold;

  @ValidateNested()
  @Type(() => Threshold)
  alert: Threshold;

  // @IsEnum(NotificationType, {
  //   message: `notifyBy must be one of: ${Object.values(NotificationType).join(', ')}`,
  // })
  // notifyBy: NotificationType;
}

export class AlertGroup {
  // @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AlertCondition)
  conditions: AlertCondition[];

  @IsOptional()
  @IsEnum(NotificationType, {
    message: `notifyBy must be one of: ${Object.values(NotificationType).join(", ")}`,
  })
  notifyBy: NotificationType;
}

// --- LogEntryAlert DTO ---
export class LogEntryAlert {
  @IsEnum(["manual", "maintenance", "csv", "program"], {
    message: `type must be one of: manual, maintenance, csv, program`,
  })
  type: "manual" | "maintenance" | "csv" | "program";

  @IsNumber()
  daysSince: number;

  @IsOptional()
  @IsEnum(NotificationType)
  notifyBy: NotificationType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  facilityIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  operatorIds?: string[];
}

// --- Responsibility DTO ---
export class Responsibility {
  @IsString()
  description: string;

  @IsBoolean()
  isMandatory: boolean;
}

// --- AlertSettings wrapper ---
export class AlertSettings {
  @IsOptional()
  // @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AlertGroup)
  general?: AlertGroup;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LogEntryAlert)
  logs?: LogEntryAlert[];
}

// --- CreateUserDto ---
export class CreateUserDto {
  @ApiProperty({ description: "First name of the user" })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: "Last name of the user" })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ description: "Email address" })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  // @ApiProperty({ description: 'Phone number', example: '+911234567890' })
  // @IsPhoneNumber(null)
  // phoneNumber: string;
  @ApiProperty({
    description: "Phone number (US only)",
    example: "+12025550123",
  })
  @Matches(/^\+1\d{10}$/, {
    message:
      "Phone number must be a valid US number in the format +1XXXXXXXXXX",
  })
  phoneNumber: string;

  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role: Role;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  profileImage?: string;

  @ApiPropertyOptional({
    type: Object,
    example: {
      facility: { view: true, add: true, edit: true, toggleStatus: true },
      users: { view: true, add: true, edit: true, toggleStatus: true },
    },
  })
  @IsOptional()
  @IsObject()
  @IsModulePermissionObject()
  permissions?: Record<ModuleName, ModulePermission>;

  @ApiProperty({ description: "company id" })
  @ValidateIf(
    (r) =>
      r.role == Role.CORPORATE_MANAGER ||
      r.role == Role.FACILITY_MANAGER ||
      r.role == Role.OPERATOR,
  )
  // @IsNotEmpty()
  companyId: string;

  @ApiProperty({ description: "facility ids" })
  @ValidateIf((r) => r.role == Role.FACILITY_MANAGER || r.role == Role.OPERATOR)
  // @IsNotEmpty()
  facilityIds: string[];

  @ApiProperty({ description: "chiller ids" })
  @ValidateIf((r) => r.role == Role.OPERATOR)
  // @IsNotEmpty()
  chillerIds: string[];

  @ApiPropertyOptional({
    description: "Alert configuration",
    example: {
      general: {
        notifyBy: "email",
        conditions: [
          {
            metric: "Outside Air Temp",
            warning: { operator: ">=", threshold: 30 },
            alert: { operator: ">=", threshold: 40 },
          },
        ],
      },
      logs: [
        {
          type: "manual",
          daysSince: 5,
          notifyBy: "both",
        },
      ],
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AlertSettings)
  alerts?: AlertSettings;
}

export class UserListDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  page: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  limit: number;

  @ApiProperty()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, enum: ["ASC", "DESC"] })
  @IsOptional()
  // @IsIn(['ASC', 'DESC'])
  // @Transform(({ value }) => value?.toUpperCase())
  sort_order?: "ASC" | "DESC";

  @ApiProperty()
  @IsOptional()
  @IsString()
  sort_by?: string;

  @ApiProperty()
  @IsOptional()
  // @IsMongoId()
  companyId?: string;

  @ApiProperty()
  @IsOptional()
  // @IsMongoId()
  facilityId?: string;

  @ApiProperty()
  @IsOptional()
  // @IsEnum(Role)
  role?: Role;
}

export class UpdateUserStatusDto {
  @ApiProperty({ description: "User ID" })
  @IsMongoId()
  userId: string;

  @ApiProperty({ description: "Set true to activate, false to inactivate" })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({
    description: "Unassign user from company and facility if inactivating",
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  shouldUnassign?: boolean;
}

export class OperatorByFacilitiesDto {
  @ApiProperty({ type: [String], description: "Array of Facility IDs" })
  @IsArray()
  @IsOptional()
  // @IsMongoId({ each: true })
  facilityIds: string[];

  @ApiProperty({ type: String, description: "Company ID" })
  @IsOptional()
  // @IsMongoId({ each: true })
  companyId: string;
}
