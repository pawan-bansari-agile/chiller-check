import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  // IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  // IsPhoneNumber,
  IsString,
  Matches,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { DeviceType, Role } from "../constants/enum.constant";
import { AUTHENTICATION } from "../constants/response.constant";
import { PASSWORD_REGEX } from "../services/common.service";
import { Type } from "class-transformer";
import {
  AlertSettings,
  IsModulePermissionObject,
  // Responsibility,
} from "src/module/user/dto/user.dto";
import { ModuleName, ModulePermission } from "src/module/user/types/user.types";

export class LoginDto {
  @ApiProperty({ default: "chiller.check@yopmail.com" })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ default: "Admin@123" })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  deviceId: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  fcmToken: string;

  @ApiProperty({ enum: DeviceType })
  @IsNotEmpty()
  @IsEnum(DeviceType)
  deviceType: DeviceType;
}
export class ResendOtp {
  @ApiProperty({})
  @IsNotEmpty()
  userId: string;
}
export class VerifyOtp {
  @ApiProperty({})
  @IsNotEmpty()
  otp: string;

  @ApiProperty({})
  @IsNotEmpty()
  userId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  deviceId: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  fcmToken: string;

  @ApiProperty({ enum: DeviceType })
  @IsNotEmpty()
  @IsEnum(DeviceType)
  deviceType: DeviceType;
}
export class ForgotPasswordDto {
  @ApiProperty({ default: "chiller.check@yopmail.com" })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @ApiProperty()
  @IsNotEmpty()
  resetPasswordToken: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @Matches(PASSWORD_REGEX, {
    message: AUTHENTICATION.PASSWORD_PATTERN_NOT_MATCHED,
  })
  password: string;
}

export class DateRangeDto {
  @ApiProperty({ type: Date, format: "date" })
  @ValidateIf((r) => r.endDate)
  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @ApiProperty({ type: Date, format: "date" })
  @ValidateIf((r) => r.startDate)
  @IsNotEmpty()
  @IsDateString()
  endDate: string;
}

export class UserIdDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  _id: string;
}

export class EmailDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  email: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty()
  @IsNotEmpty()
  newPassword: string;
}

export class PaginationDto {
  @ApiProperty({ required: false, description: "Search", default: "" })
  @IsString()
  @IsOptional()
  search: string;

  @ApiProperty({ required: false, default: 1 })
  @IsNumber()
  @IsOptional()
  page: number;

  @ApiProperty({ required: false, default: 10 })
  @IsNumber()
  @IsOptional()
  limit: number;

  @ApiProperty({ name: "sort", required: false, example: "column name" })
  @IsString()
  @IsOptional()
  sort: string;

  @ApiProperty({ name: "dir", required: false, example: "asc or desc" })
  @IsString()
  @IsOptional()
  dir: string;
}
export class UpdateUserDto {
  @ApiProperty({
    description: "User first name",
    example: "John",
    required: false,
  })
  @IsString()
  @IsOptional()
  readonly firstName?: string;

  @ApiProperty({
    description: "User last name",
    example: "Doe",
    required: false,
  })
  @IsString()
  @IsOptional()
  readonly lastName?: string;

  // @ApiProperty({
  //   description: "User phone number",
  //   example: "+911234567890",
  //   required: false,
  // })
  // @IsOptional()
  // @IsPhoneNumber()
  // readonly phoneNumber?: string;
  @ApiProperty({
    description: "Phone number (US only)",
    example: "+12025550123",
  })
  @Matches(/^\+1\d{10}$/, {
    message:
      "Phone number must be a valid US number in the format +1XXXXXXXXXX",
  })
  phoneNumber: string;

  @ApiProperty({
    description:
      "User role (admin, sub-admin, corporate manager, facility manager, operator.)",
    example: "admin",
    required: false,
    enum: Role,
  })
  @IsOptional()
  @IsEnum(Role)
  readonly role?: Role;

  @ApiProperty({
    description: "User profile image URL",
    example: "profile.jpg",
    required: false,
  })
  @IsOptional()
  @IsString()
  profileImage?: string;

  @ApiProperty({
    description: "Company Id of the assigned company",
    example: "123asd123asd123asd123asd",
    required: false,
  })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiProperty({
    description: "Facility Ids of the assigned facility",
    example: "[123asd123asd123asd123asd,456qwe456qwe456qwe456qwe]",
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  facilityIds?: string[];

  @ApiProperty({
    description: "Chiller Ids of the assigned chillers.",
    example: "[123asd123asd123asd123asd,456qwe456qwe456qwe456qwe]",
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  chillerIds?: string[];

  @ApiPropertyOptional({
    type: Object,
    example: {
      facility: { view: true, add: true, edit: true, toggleStatus: true },
      users: { view: true, add: false, edit: true, toggleStatus: false },
    },
  })
  @IsOptional()
  @IsObject()
  @IsModulePermissionObject()
  permissions?: Record<
    ModuleName,
    // { view?: boolean; add?: boolean; edit?: boolean; toggleStatus?: boolean }
    ModulePermission
  >;

  // @ApiPropertyOptional({
  //   type: [Responsibility],
  // })
  // @IsOptional()
  // @IsArray()
  // @ValidateNested({ each: true })
  // @Type(() => Responsibility)
  // responsibilities?: Responsibility[];

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
