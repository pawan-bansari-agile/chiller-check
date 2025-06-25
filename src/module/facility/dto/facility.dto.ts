import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsOptional,
  IsString,
  IsNotEmpty,
  IsIn,
  IsNumber,
  IsArray,
  ValidateNested,
  IsBoolean,
} from "class-validator";
import { STATES } from "../../../common/constants/enum.constant";
import { ALTITUDE_UNITS } from "src/common/constants/enum.constant";
import {
  // CreateChillerDTO,
  CreateChillerWithFacilityDTO,
} from "src/common/dto/common.dto";
import { Types } from "mongoose";

export class CreateFacilityWithCompanyDTO {
  @ApiProperty({
    description: "The Company ID to create the facility under it.",
  })
  @IsOptional()
  @IsString()
  companyId?: string;

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

  @ApiProperty({ description: "Altitude of the facility" })
  @IsNotEmpty()
  @IsNumber()
  altitude: number;

  @ApiProperty({ description: "Unit of altitude measurement" })
  @IsNotEmpty()
  @IsString()
  @IsIn(Object.keys(ALTITUDE_UNITS))
  altitudeUnit: string;
}

export class CreateFacilityDTO {
  @ApiProperty({
    description: "The Company ID to create the facility under it.",
  })
  @IsOptional()
  @IsString()
  companyId?: string;

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

  @ApiProperty({ description: "Altitude of the facility" })
  @IsNotEmpty()
  @IsNumber()
  altitude: number;

  @ApiProperty({ description: "Unit of altitude measurement" })
  @IsNotEmpty()
  @IsString()
  @IsIn(Object.keys(ALTITUDE_UNITS))
  altitudeUnit: string;

  @ApiProperty({
    description: "An array of chillers linked to the facility (optional)",
    type: [CreateChillerWithFacilityDTO],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateChillerWithFacilityDTO)
  chillers?: CreateChillerWithFacilityDTO[];
}

export class UpdateFacilityDto {
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

  @ApiProperty({ description: "Altitude of the facility" })
  @IsNotEmpty()
  @IsNumber()
  altitude: number;

  @ApiProperty({ description: "Unit of altitude measurement" })
  @IsNotEmpty()
  @IsString()
  @IsIn(Object.keys(ALTITUDE_UNITS))
  altitudeUnit: string;

  @ApiProperty({
    description: "An array of chillers linked to the facility (optional)",
    type: [CreateChillerWithFacilityDTO],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateChillerWithFacilityDTO)
  chillers?: CreateChillerWithFacilityDTO[];

  @ApiProperty({
    description: "The Company ID to create the facility under it.",
  })
  @IsOptional()
  @IsString()
  companyId?: string | Types.ObjectId;
}

export class FacilityListDto {
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

  // @ApiProperty({ required: false, enum: ['ASC', 'DESC'] })
  // @IsOptional()
  // @IsString()
  // // @IsIn(['ASC', 'DESC'])
  // sort_order?: 'ASC' | 'DESC';
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
}

export class UpdateFacilityStatusDto {
  @ApiProperty({
    description: "The new status of the facility (isActive)",
    example: true,
  })
  @IsBoolean()
  isActive: boolean;
}
