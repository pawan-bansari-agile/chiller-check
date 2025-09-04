import { ApiProperty, PartialType } from "@nestjs/swagger";
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";
import { Role } from "src/common/constants/enum.constant";
import { ChartType, DateType, ParameterType } from "src/common/dto/common.dto";
import { NotificationType } from "src/module/user/dto/user.dto";

export class CreateReportDto {
  @ApiProperty({ description: "Name of the report" })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: "Start date" })
  @IsNotEmpty()
  @IsString()
  startDate: string;

  @ApiProperty({ description: "End date" })
  @IsNotEmpty()
  @IsString()
  endDate: string;

  @ApiProperty({ description: "date type" })
  @IsNotEmpty()
  @IsEnum(DateType, {
    message: `${Object.values(DateType).join(", ")}`,
  })
  @IsString()
  dateType: DateType;

  @ApiProperty({ description: "notification" })
  @IsNotEmpty()
  @IsEnum(NotificationType, {
    message: `notifyBy must be one of: ${Object.values(NotificationType).join(", ")}`,
  })
  notification: NotificationType;

  @ApiProperty({ description: "parameter" })
  @IsNotEmpty()
  @IsEnum(ParameterType, {
    message: `Parameter must be one of: ${Object.values(ParameterType).join(", ")}`,
  })
  parameter: ParameterType;

  @ApiProperty({ description: "parameter" })
  @IsNotEmpty()
  @IsEnum(ChartType, {
    message: `Chart Type must be one of: ${Object.values(ChartType).join(", ")}`,
  })
  chartType: ChartType;

  @ApiProperty({ description: "The ID Of the Company" })
  @IsNotEmpty()
  @IsString()
  companyId?: string;

  @ApiProperty({ type: [String], description: "Array of Facility IDs" })
  @IsArray()
  @IsNotEmpty()
  // @IsMongoId({ each: true })
  facilityIds: string[];

  @ApiProperty({ description: "Description" })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ description: "Header" })
  @IsNotEmpty()
  @IsString()
  header: string;

  @ApiProperty({ description: "Footer" })
  @IsNotEmpty()
  @IsString()
  footer: string;

  @ApiProperty({ type: [String], description: "Array of User IDs" })
  // @IsArray()
  // @IsNotEmpty()
  // @IsMongoId({ each: true })
  sharedTo: string[];

  @ApiProperty({ description: "The ID Of the Creator User" })
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiProperty({ description: "The ID Of the updater User" })
  @IsOptional()
  @IsString()
  updatedBy?: string;
}

export class UpdateReportDto extends PartialType(CreateReportDto) {}

export class ReportsListDto {
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
  search: string;

  @ApiProperty({ required: false, enum: ["ASC", "DESC"] })
  @IsOptional()
  @IsString()
  sort_order: "ASC" | "DESC";

  @ApiProperty()
  @IsOptional()
  @IsString()
  sort_by: string;

  @ApiProperty()
  @IsOptional()
  companyId: string;

  @ApiProperty()
  @IsOptional()
  facilityId: string;

  @ApiProperty()
  @IsOptional()
  parameter: string;
}
export class ReportUserList {
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
  sort_order?: "ASC" | "DESC";

  @ApiProperty()
  @IsOptional()
  @IsString()
  sort_by?: string;

  @ApiProperty()
  @IsOptional()
  companyId?: string;

  @ApiProperty()
  @IsOptional()
  facilityIds?: string[];

  @ApiProperty()
  @IsOptional()
  // @IsEnum(Role)
  role?: Role;
}
export class GraphDto {
  @ApiProperty()
  @IsNotEmpty()
  id: string;

  @ApiProperty()
  @IsNotEmpty()
  isFacility: boolean;
}
