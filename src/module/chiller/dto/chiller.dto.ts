import { ApiProperty, PartialType } from "@nestjs/swagger";
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";
// import { Types } from 'mongoose';
import {
  AMPERAGE_CHOICE,
  AVERAGE_EFFICIENCY_LOSS,
  // BEARING_TEMP,
  DES_INLET_WATER_TEMP,
  Make,
  MEASUREMENT_UNITS,
  OIL_PRESSURE_DIFF,
  PURGE_READING_UNIT,
  REFRIGERANT_TYPE,
  VOLTAGE_CHOICE,
} from "src/common/constants/enum.constant";
import { IsValidUnitDropdown } from "src/common/helpers/validators/ValidUnitDropdown.validator";

export class CreateChillerDTO {
  @ApiProperty({ description: "The ID Of the company" })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiProperty({ description: "The ID Of the facility" })
  @IsOptional()
  @IsString()
  facilityId?: string;

  // @ApiProperty({ description: 'Chiller Type' })
  // @IsOptional()
  // @IsString()
  // type?: string;

  @ApiProperty({ description: "Measurement Unit the chiller is set to use." })
  @IsNotEmpty()
  @IsString()
  @IsIn(Object.values(MEASUREMENT_UNITS))
  unit: string;

  // @ApiProperty({ description: 'Chiller name' })
  // @IsNotEmpty()
  // @IsString()
  // name: string;

  @ApiProperty({ description: "Chiller Name/No" })
  @IsNotEmpty()
  @IsString()
  ChillerNo: string;

  @ApiProperty({
    description: "Weekly Hours Of Operation:",
  })
  @IsNotEmpty()
  @IsNumber()
  weeklyHours: number;

  @ApiProperty({ description: "Weeks Per Year" })
  @IsNotEmpty()
  @IsNumber()
  weeksPerYear: number;

  @ApiProperty({ description: "Avg. Load Profile:" })
  @IsNotEmpty()
  @IsNumber()
  avgLoadProfile: number;

  @ApiProperty({ description: "Design Inlet Water Temp." })
  @IsNotEmpty()
  @IsString()
  @IsIn(Object.keys(DES_INLET_WATER_TEMP))
  desInletWaterTemp: string;

  @ApiProperty({ description: "Make" })
  @IsNotEmpty()
  @IsString()
  @IsIn(Object.keys(Make))
  make: string;

  @ApiProperty({ description: "Model" })
  @IsNotEmpty()
  @IsString()
  model: string;

  @ApiProperty({ description: "Serial No." })
  @IsOptional()
  @IsString()
  serialNumber: string;

  @ApiProperty({ description: "Year Manufactured" })
  @IsNotEmpty()
  @IsNumber()
  manufacturedYear: number;

  @ApiProperty({
    description: "Refrigerant Type",
    enum: Object.keys(REFRIGERANT_TYPE),
  })
  @IsNotEmpty()
  @IsString()
  @IsIn(Object.keys(REFRIGERANT_TYPE), {
    message: `Refrigerant type must be one of: ${Object.keys(REFRIGERANT_TYPE).join(", ")}`,
  })
  refrigType: string;

  @ApiProperty({ description: "Tons/KWR" })
  @IsOptional()
  @IsNumber()
  tons: number;

  @ApiProperty({ description: "Tons/KWR" })
  @IsOptional()
  @IsNumber()
  kwr: number;

  @ApiProperty({ description: "Efficiency Rating" })
  @IsNotEmpty()
  @IsNumber()
  efficiencyRating: number;

  @ApiProperty({ description: "Energy Cost (kw. hr.)" })
  @IsNotEmpty()
  @IsNumber()
  energyCost: number;

  @ApiProperty({
    description:
      "Is Optional and the value will be set based on the type of Refrigerant selected for the chiller",
  })
  @IsOptional()
  @IsBoolean()
  highPressureRefrig: boolean;

  @ApiProperty({
    description: "Enter a Saturated Refrig. Temp.?",
  })
  @IsNotEmpty()
  @IsBoolean()
  useEvapRefrigTemp: boolean;

  @ApiProperty({ description: "Design Voltage" })
  @IsNotEmpty()
  @IsNumber()
  designVoltage: number;

  @ApiProperty({ description: "Voltage Choice" })
  @IsNotEmpty()
  @IsString()
  @IsIn(Object.keys(VOLTAGE_CHOICE), {
    message: `Voltage choice must be one of: ${Object.keys(VOLTAGE_CHOICE).join(", ")}`,
  })
  voltageChoice: string;

  @ApiProperty({ description: "Full-Load Amperage" })
  @IsNotEmpty()
  @IsNumber()
  fullLoadAmps: number;

  @ApiProperty({ description: "Amperage Choice" })
  @IsNotEmpty()
  @IsString()
  @IsIn(Object.keys(AMPERAGE_CHOICE), {
    message: `Amperage choice must be one of: ${Object.keys(AMPERAGE_CHOICE).join(", ")}`,
  })
  ampChoice: string;

  @ApiProperty({ description: "Design Condenser Water Pressure Drop" })
  @IsOptional()
  @IsNumber()
  condDPDrop: number;

  @ApiProperty({ description: "Unit for Design Condenser Water Pressure Drop" })
  @IsOptional()
  @IsString()
  @IsValidUnitDropdown("unit", "commonPressureUnits")
  condDPDropUnit: string;

  @ApiProperty({ description: "Condenser Pressure Unit:" })
  @IsNotEmpty()
  @IsString()
  @IsValidUnitDropdown("unit", "condPressureUnits")
  condPressureUnit: string;

  @ApiProperty({ description: "Actual Condenser Water Pressure Drop Unit:" })
  @IsNotEmpty()
  @IsString()
  @IsValidUnitDropdown("unit", "commonPressureUnits")
  condAPDropUnit: string;

  @ApiProperty({ description: "Design Condenser Approach Temp:" })
  @IsNotEmpty()
  @IsNumber()
  condApproach: number;

  @ApiProperty({ description: "Design Chill Water Pressure Drop:" })
  @IsOptional()
  @IsNumber()
  evapDPDrop: number;

  @ApiProperty({ description: "Unit for Design Chill Water Pressure Drop:" })
  @IsOptional()
  @IsString()
  @IsValidUnitDropdown("unit", "commonPressureUnits")
  evapDPDropUnit: string;

  @ApiProperty({ description: "Evaporator Pressure Unit:" })
  @IsNotEmpty()
  @IsString()
  @IsValidUnitDropdown("unit", "condPressureUnits")
  evapPressureUnit: string;

  @ApiProperty({ description: "Actual Chill Water Pressure Drop Unit:" })
  @IsNotEmpty()
  @IsString()
  @IsValidUnitDropdown("unit", "commonPressureUnits")
  evapAPDropUnit: string;

  @ApiProperty({ description: "Design Evaporator Approach Temp:" })
  @IsOptional()
  @IsNumber()
  evapApproach: number;

  @ApiProperty({ description: "Evaporator Design Outlet Water Temp:" })
  @IsNotEmpty()
  @IsNumber()
  evapDOWTemp: number;

  @ApiProperty({ description: "Oil Pressure Differential" })
  @IsNotEmpty()
  @IsString()
  @IsIn(Object.keys(OIL_PRESSURE_DIFF))
  compOPIndicator: string;

  @ApiProperty({ description: "User Notes" })
  @IsOptional()
  @IsString()
  userNote: string;

  @ApiProperty({
    description: "Purge Total Pumpout Time Readout on Chiller?:",
  })
  @IsNotEmpty()
  @IsBoolean()
  havePurge: boolean;

  @ApiProperty({
    description: "Max. Daily Purge Total Pumpout Time before Alert:",
  })
  @IsOptional()
  @IsNumber()
  maxPurgeTime: number;

  @ApiProperty({
    description: "Purge Total Pumpout Time measured in what units?:",
  })
  @IsOptional()
  @IsString()
  @IsIn(Object.keys(PURGE_READING_UNIT))
  purgeReadingUnit: string;

  @ApiProperty({
    description: "Readout for Bearing Temp.?:",
  })
  @IsNotEmpty()
  @IsBoolean()
  // @IsIn(Object.keys(BEARING_TEMP))
  haveBearingTemp: boolean;

  @ApiProperty({
    description: "Calculate Efficiency Using:",
  })
  @IsNotEmpty()
  @IsString()
  @IsIn(Object.keys(AVERAGE_EFFICIENCY_LOSS))
  useRunHours: string;

  @ApiProperty({
    description: "Design Condenser &Delta; T:",
  })
  @IsOptional()
  @IsNumber()
  condDesignDeltaT: number;

  @ApiProperty({
    description: "Design Condenser Flow:",
  })
  @IsOptional()
  @IsNumber()
  condDesignFlow: number;

  @ApiProperty({
    description: "Evaporator Design ∆ T",
  })
  @IsOptional()
  @IsNumber()
  evapDesignDeltaT: number;

  @ApiProperty({
    description: "Evaporator Design Flow:",
  })
  @IsOptional()
  @IsNumber()
  evapDesignFlow: number;

  @ApiProperty({
    description: "Number Of Compressors",
  })
  @IsNotEmpty()
  @IsNumber()
  numberOfCompressors: number;

  @ApiProperty({
    description: "Number Of Compressors",
  })
  @IsOptional()
  @IsString()
  oilPresHighUnit: string;

  @ApiProperty({
    description: "Number Of Compressors",
  })
  @IsOptional()
  @IsString()
  oilPresLowUnit: string;

  @ApiProperty({
    description: "Number Of Compressors",
  })
  @IsOptional()
  @IsString()
  oilPresDifUnit: string;

  @ApiProperty({
    description: "Number Of Compressors",
  })
  @IsOptional()
  @IsBoolean()
  useLoad: boolean;

  @ApiProperty({
    description: "Number Of Compressors",
  })
  @IsOptional()
  @IsString()
  status: string;
}

// <cfif variables.isMetric>
// 	 	<input type="hidden" name="OilPresHighUnitID" id="OilPresHighUnitID" value="5">
// 	 	<input type="hidden" name="OilPresLowUnitID" id="OilPresLowUnitID" value="5">
// 	 	<input type="hidden" name="OilPresDifUnitID" id="OilPresDifUnitID" value="5">
// 	 	<cfelse>
// 	 	<input type="hidden" name="OilPresHighUnitID" id="OilPresHighUnitID" value="1">
// 	 	<input type="hidden" name="OilPresLowUnitID" id="OilPresLowUnitID" value="3">
// 	 	<input type="hidden" name="OilPresDifUnitID" id="OilPresDifUnitID" value="1">
// 	 	</cfif>
// ======================================
// for us we need to check the field type and based on the value set the below fields accordingly
// oilPresHighUnit
// oilPresLowUnit
// oilPresDifUnit
// if type == simetric
// oilPresHighUnit=Bar
// oilPresLowUnit=Bar
// oilPresDifUnit=Bar
// else
// oilPresHighUnit=PSIG
// oilPresLowUnit=InHg
// oilPresDifUnit=PSIG
// important note:- handel these while creating the chiller and not included in the input DTO
// Values will come from the units table

export class UpdateChillerDto extends PartialType(CreateChillerDTO) {}

export class CreateChillerWithFacilityDTO {
  // @ApiProperty({ description: 'The ID Of the company' })
  @IsOptional()
  @IsString()
  companyId?: string;

  // @ApiProperty({ description: 'Chiller Type' })
  // @IsOptional()
  // @IsString()
  // type?: string;

  @ApiProperty({ description: "Measurement Unit the chiller is set to use." })
  @IsNotEmpty()
  @IsString()
  @IsIn(Object.values(MEASUREMENT_UNITS))
  unit: string;

  @ApiProperty({ description: "Chiller name or number" })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: "Number of hours in a week the chiller will be working",
  })
  @IsNotEmpty()
  @IsNumber()
  weeklyHours: number;

  @ApiProperty({ description: "Number of weeks per year" })
  @IsNotEmpty()
  @IsNumber()
  weeksPerYear: number;

  @ApiProperty({ description: "Average load profile of a chiller" })
  @IsNotEmpty()
  @IsNumber()
  avgLoadProfile: number;

  // @ApiProperty({ description: "Design Inlet Water Temperature" })
  // @IsNotEmpty()
  // @IsString()
  // @IsIn(Object.keys(DES_INLET_WATER_TEMP))
  // desInletWaterTemp: string;

  @ApiProperty({ description: "Make of Chiller" })
  @IsNotEmpty()
  @IsString()
  make: string;

  @ApiProperty({ description: "Chiller Model" })
  @IsNotEmpty()
  @IsString()
  model: string;

  @ApiProperty({ description: "Chiller Serial Number" })
  @IsNotEmpty()
  @IsString()
  serialNumber: string;

  @ApiProperty({ description: "Chiller Manufactured Year" })
  @IsNotEmpty()
  @IsNumber()
  manufacturedYear: number;

  @ApiProperty({ description: "Chiller Refrigerant Type" })
  @IsNotEmpty()
  @IsString()
  refrigType: string;

  @ApiProperty({ description: "Chiller capacity in Tons" })
  @IsOptional()
  @IsNumber()
  tons: number;

  @ApiProperty({ description: "Chiller capacity in KWR" })
  @IsOptional()
  @IsNumber()
  kwr: number;

  // @ApiProperty({ description: "Chiller Efficiency Rating" })
  // @IsNotEmpty()
  // @IsNumber()
  // efficiencyRating: number;

  @ApiProperty({ description: "Chiller Energy Cost" })
  @IsNotEmpty()
  @IsNumber()
  energyCost: number;
}

export class ChillerListDto {
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

  @ApiProperty()
  @IsOptional()
  facilityId: string;
}

export class ChillerByFacilityDto {
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

  @ApiProperty({ type: [String], description: "Array of Facility IDs" })
  @IsArray()
  @ArrayNotEmpty()
  // @IsMongoId({ each: true })
  facilityIds: string[];
}

export class ActiveChillers {
  @ApiProperty({ type: String, description: "Array of Facility IDs" })
  // @IsMongoId({ each: true })
  facilityId: string;
}

export class BulkUpdateChillerCostDto {
  @ApiProperty({ type: [String], description: "Array of Chiller IDs" })
  @IsArray()
  // @IsMongoId({ each: true })
  @IsNotEmpty()
  chillerIds: string[];

  @ApiProperty({ description: "New Energy Cost value" })
  @IsNotEmpty()
  @IsNumber()
  energyCost: number;
}

export class ChillerStatusUpdateDto {
  @ApiProperty({ type: String, description: "Chiller status to update with." })
  @IsString()
  @IsNotEmpty()
  status: string;
}
