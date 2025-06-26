import { ApiProperty, PartialType } from "@nestjs/swagger";
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";
import {
  DES_INLET_WATER_TEMP,
  MEASUREMENT_UNITS,
} from "src/common/constants/enum.constant";

export class CreateChillerDTO {
  @ApiProperty({ description: "The ID Of the company" })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiProperty({ description: "Chiller Type" })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ description: "Measurement Unit the chiller is set to use." })
  @IsNotEmpty()
  @IsString()
  @IsIn(Object.keys(MEASUREMENT_UNITS))
  unit: string;

  @ApiProperty({ description: "Chiller name" })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: "Chiller number" })
  @IsNotEmpty()
  @IsNumber()
  ChillerNo: number;

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

  @ApiProperty({ description: "Design Inlet Water Temperature" })
  @IsNotEmpty()
  @IsString()
  @IsIn(Object.keys(DES_INLET_WATER_TEMP))
  desInletWaterTemp: string;

  @ApiProperty({ description: "Make of Chiller" })
  @IsNotEmpty()
  @IsNumber()
  make: number;

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
  @IsNotEmpty()
  @IsNumber()
  tons: number;

  @ApiProperty({ description: "Efficiency Rating" })
  @IsNotEmpty()
  @IsNumber()
  efficiencyRating: number;

  @ApiProperty({ description: "Energy Cost(cost/kw. hr.)" })
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
  @IsNumber()
  voltageChoice: number;

  @ApiProperty({ description: "Full-Load Amperage" })
  @IsNotEmpty()
  @IsNumber()
  fullLoadAmps: number;

  @ApiProperty({ description: "Amperage Choice" })
  @IsNotEmpty()
  @IsNumber()
  ampChoice: number;

  @ApiProperty({ description: "Design Condenser Water Pressure Drop" })
  @IsNotEmpty()
  @IsString()
  condDPDrop: string;

  @ApiProperty({ description: "Unit for Design Condenser Water Pressure Drop" })
  @IsNotEmpty()
  @IsString()
  condDPDropUnit: string;

  @ApiProperty({ description: "Condenser Pressure Unit:" })
  @IsNotEmpty()
  @IsString()
  condPressureUnit: string;

  @ApiProperty({ description: "Actual Condenser Water Pressure Drop Unit:" })
  @IsNotEmpty()
  @IsString()
  condAPDropUnit: string;

  @ApiProperty({ description: "Design Condenser Approach Temp:" })
  @IsNotEmpty()
  @IsNumber()
  condApproach: number;

  @ApiProperty({ description: "Design Chill Water Pressure Drop:" })
  @IsNotEmpty()
  @IsString()
  evapDPDrop: string;

  @ApiProperty({ description: "Unit for Design Chill Water Pressure Drop:" })
  @IsNotEmpty()
  @IsString()
  evapDPDropUnit: string;

  @ApiProperty({ description: "Evaporator Pressure Unit:" })
  @IsNotEmpty()
  @IsString()
  evapPressureUnit: string;

  @ApiProperty({ description: "Actual Chill Water Pressure Drop Unit:" })
  @IsNotEmpty()
  @IsString()
  evapAPDropUnit: string;

  @ApiProperty({ description: "Design Evaporator Approach Temp:" })
  @IsNotEmpty()
  @IsNumber()
  evapApproach: number;

  @ApiProperty({ description: "Evap. Design Outlet Water Temp.:" })
  @IsNotEmpty()
  @IsNumber()
  evapDOWTemp: number;

  @ApiProperty({ description: "Oil Pressure Differential" })
  @IsNotEmpty()
  @IsString()
  compOPIndicator: string;

  @ApiProperty({ description: "Is Optional and used for storing User Notes" })
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
  @IsNotEmpty()
  @IsNumber()
  maxPurgeTime: number;

  @ApiProperty({
    description: "Purge Total Pumpout Time measured in what units?:",
  })
  @IsOptional()
  @IsString()
  purgeReadingUnit: string;

  @ApiProperty({
    description: "Readout for Bearing Temp.?:",
  })
  @IsOptional()
  @IsString()
  haveBearingTemp: string;

  @ApiProperty({
    description: "Calculate Average Efficiency Loss using:",
  })
  @IsOptional()
  @IsString()
  useRunHours: string;

  @ApiProperty({
    description: "Design Condenser &Delta; T:",
  })
  @IsNotEmpty()
  @IsNumber()
  condDesignDeltaT: number;

  @ApiProperty({
    description: "Design Condenser Flow:",
  })
  @IsNotEmpty()
  @IsNumber()
  condDesignFlow: number;

  @ApiProperty({
    description: "Evap. Design &Delta; T:",
  })
  @IsNotEmpty()
  @IsNumber()
  evapDesignDeltaT: number;

  @ApiProperty({
    description: "Evap. Design Flow:",
  })
  @IsNotEmpty()
  @IsNumber()
  evapDesignFlow: number;

  @ApiProperty({
    description: "Evap. Design Flow:",
  })
  @IsNotEmpty()
  @IsNumber()
  numberOfCompressors: number;
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
// oilPresHighUnit=5
// oilPresLowUnit=5
// oilPresDifUnit=5
// else
// oilPresHighUnit=1
// oilPresLowUnit=3
// oilPresDifUnit=1
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
  @IsIn(Object.keys(MEASUREMENT_UNITS))
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
  @IsNumber()
  make: number;

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
