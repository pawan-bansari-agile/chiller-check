import { ApiProperty } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  // IsDateString,
} from "class-validator";

export class TimelineListDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  chillerId: string;

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
  // @IsDateString()
  startDate: string;

  @ApiProperty()
  @IsOptional()
  // @IsDateString()
  endDate: string;

  @ApiProperty()
  @IsOptional()
  // @IsDateString()
  timezone: string;
}
