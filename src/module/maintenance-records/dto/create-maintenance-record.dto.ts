import { ApiProperty, PartialType } from "@nestjs/swagger";
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

export class CreateMaintenanceRecordDto {
  @ApiProperty({ description: "The ID Of the chiller" })
  @IsNotEmpty()
  @IsString()
  companyId?: string;

  @ApiProperty({ description: "The ID Of the chiller" })
  @IsNotEmpty()
  @IsString()
  facilityId?: string;

  @ApiProperty({ description: "The ID Of the chiller" })
  @IsNotEmpty()
  @IsString()
  chillerId?: string;

  @ApiProperty({ description: "Maintenance Type" })
  @IsNotEmpty()
  maintenanceType: string;

  @ApiProperty({ description: "Maintenance Category" })
  @IsNotEmpty()
  maintenanceCategory: string;

  @ApiProperty({
    description: "The ID Of the user that updated the log  record",
  })
  @IsOptional()
  @IsString()
  updatedBy?: string;

  @ApiProperty({ description: "The date at which the reading was noted" })
  @IsNotEmpty()
  @IsString()
  maintenanceDate: string;

  @ApiProperty({ description: "The date at which the reading was noted" })
  @IsNotEmpty()
  @IsString()
  maintenanceTime: string;

  @ApiProperty({ description: "The date at which the reading was noted" })
  @IsNotEmpty()
  @IsString()
  maintenanceTimeZone: string;

  @ApiProperty({
    description: "The description to maintain major repair pointers",
  })
  @IsOptional()
  @IsString()
  maintDescription?: string;

  @ApiProperty({
    description: "The quantity of parts used",
  })
  @IsOptional()
  @IsNumber()
  maintQuantity?: number;

  @ApiProperty({
    description: "The Purge time reading.",
  })
  @IsOptional()
  @IsNumber()
  purgeReading?: number;

  @ApiProperty({
    description: "Any comments",
  })
  @IsOptional()
  @IsString()
  comments?: string;

  @ApiProperty({
    description: "Any comments",
  })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiProperty({
    description: "Any comments",
  })
  @IsOptional()
  @IsString()
  fileRealName?: string;

  @ApiProperty({
    description: "Any comments",
  })
  @IsOptional()
  @IsNumber()
  fileSize?: number;
}

export class MaintenanceListDto {
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
  chillerId: string;
}
export class ExportMaintenanceIds {
  @ApiProperty({ description: "The ID Of the logs (operator)" })
  @IsNotEmpty()
  @IsArray()
  maintenanceIds: string[];
}

export class UpdateMaintenanceRecordDto extends PartialType(
  CreateMaintenanceRecordDto,
) {}
