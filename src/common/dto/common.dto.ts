import { ApiProperty, PartialType } from "@nestjs/swagger";
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Matches,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { DeviceType, Role, STATES } from "../constants/enum.constant";
import { AUTHENTICATION } from "../constants/response.constant";
import { PASSWORD_REGEX } from "../services/common.service";
import { Type } from "class-transformer";

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

  @ApiProperty({
    description: "User phone number",
    example: "+911234567890",
    required: false,
  })
  @IsOptional()
  @IsPhoneNumber()
  readonly phoneNumber?: string;

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
}

export class CreateFacilityDTO {
  @ApiProperty({ description: "The name of the facility" })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: "Address line 1 of the facility" })
  @IsOptional()
  @IsString()
  address1?: string;

  @ApiProperty({ description: "Address line 2 of the facility" })
  @IsOptional()
  @IsString()
  address2?: string;

  @ApiProperty({ description: "City where the facility is located" })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ description: "State where the facility is located" })
  @IsOptional()
  @IsString()
  @IsIn(Object.keys(STATES))
  state?: string;

  @ApiProperty({ description: "Country where the facility is located" })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ description: "Zipcode of the facility" })
  @IsOptional()
  @IsString()
  zipcode?: string;

  @ApiProperty({ description: "Timezone of the facility" })
  @IsNotEmpty()
  @IsString()
  timezone: string;
}

export class CreateCompanyDto {
  @ApiProperty({ description: "The name of the company" })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: "Address line 1 of the company" })
  @IsNotEmpty()
  @IsString()
  address1: string;

  @ApiProperty({ description: "Address line 2 of the company" })
  @IsNotEmpty()
  @IsString()
  address2: string;

  @ApiProperty({ description: "City where the company is located" })
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty({ description: "State where the company is located" })
  @IsNotEmpty()
  @IsString()
  @IsIn(Object.keys(STATES))
  state: string;

  @ApiProperty({ description: "Country where the company is located" })
  @IsNotEmpty()
  @IsString()
  country: string;

  @ApiProperty({ description: "Zipcode of the company" })
  @IsNotEmpty()
  @IsString()
  zipcode: string;

  @ApiProperty({ description: "Company's website" })
  @IsNotEmpty()
  @IsString()
  website: string;

  @ApiProperty({
    description: "An array of facilities linked to the company (optional)",
    type: [CreateFacilityDTO],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFacilityDTO)
  facilities?: CreateFacilityDTO[];
}

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {}
