import { ApiProperty, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from "class-validator";
import { CompanyStatus, STATES } from "../../../common/constants/enum.constant";
import {
  CreateFacilityDTO,
  CreateFacilityWithCompanyDTO,
} from "src/module/facility/dto/facility.dto";

export class UnassignedCompanyListDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  page: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  limit: number;

  @ApiProperty({ required: false, enum: ["ASC", "DESC"] })
  @IsOptional()
  // @IsIn(["ASC", "DESC"])
  sort_order?: "ASC" | "DESC";

  @ApiProperty()
  @IsOptional()
  @IsString()
  sort_by?: string;
}

export class CompanyListDto {
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
  @IsOptional()
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
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: "Website must be a valid URL" })
  website: string;

  @ApiProperty({
    description: "An array of facilities linked to the company (optional)",
    type: [CreateFacilityWithCompanyDTO],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFacilityDTO)
  facilities?: CreateFacilityDTO[];
}
export class EditCompanyDto {
  @ApiProperty({ description: "The name of the company" })
  name: string;

  @ApiProperty({ description: "Address line 1 of the company" })
  address1: string;

  @ApiProperty({ description: "Address line 2 of the company" })
  @IsOptional()
  address2: string;

  @ApiProperty({ description: "City where the company is located" })
  city: string;

  @ApiProperty({ description: "State where the company is located" })
  @IsIn(Object.keys(STATES))
  state: string;

  @ApiProperty({ description: "Country where the company is located" })
  country: string;

  @ApiProperty({ description: "Zipcode of the company" })
  zipcode: string;

  @ApiProperty({ description: "Company's website" })
  website: string;

  @ApiProperty({
    description: "An array of facilities linked to the company (optional)",
    type: [CreateFacilityWithCompanyDTO],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFacilityDTO)
  facilities?: CreateFacilityDTO[];
}

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {}

export class UpdateCompanyStatusDto {
  @ApiProperty({
    description: "The new status of the company",
    example: "active",
  })
  @IsIn([CompanyStatus.ACTIVE, CompanyStatus.IN_ACTIVE])
  status: CompanyStatus; // The status must be either "active" or "inactive"
}
export class ActiveInactiveCompany {
  @ApiProperty({ description: "active/inactive" })
  status: string;
}
