import { ApiProperty, PartialType } from "@nestjs/swagger";
import {
  IsArray,
  // IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

export class CreateLogDTO {
  @ApiProperty({ description: "The ID Of the chiller" })
  @IsNotEmpty()
  @IsString()
  chillerId?: string;

  @ApiProperty({ description: "The ID Of the company" })
  @IsNotEmpty()
  @IsString()
  companyId?: string;

  @ApiProperty({ description: "The ID Of the facility" })
  @IsNotEmpty()
  @IsString()
  facilityId?: string;

  @ApiProperty({ description: "The ID Of the user (operator)" })
  @IsNotEmpty()
  // @IsArray()
  userId?: string;

  @ApiProperty({
    description: "The ID Of the user that updated the log  record",
  })
  @IsOptional()
  @IsString()
  updatedBy?: string;

  @ApiProperty({ description: "The date at which the reading was noted" })
  @IsNotEmpty()
  @IsString()
  readingDate: string;

  @ApiProperty({ description: "The time at which the reading was noted" })
  @IsNotEmpty()
  @IsString()
  readingTime: string;

  @ApiProperty({ description: "The time zone in which the reading was noted" })
  @IsNotEmpty()
  @IsString()
  readingTimeZone: string;

  @ApiProperty({ description: "UTC string for the reading date" })
  @IsOptional()
  @IsString()
  readingDateUTC: string;

  @ApiProperty({
    description: "Inlet Water Temp:",
  })
  @IsNotEmpty()
  @IsNumber()
  condInletTemp: number;

  @ApiProperty({
    description: "Outlet Water Temp:",
  })
  @IsNotEmpty()
  @IsNumber()
  condOutletTemp: number;

  @ApiProperty({
    description: "Refrig Temp.:",
  })
  @IsOptional() // Ask saurav to add a validation for this on his end to check if its required or not based on chiller high preassure refrig value
  @IsNumber()
  condRefrigTemp: number;

  @ApiProperty({
    description: "Preassure.:",
  })
  @IsNotEmpty()
  @IsNumber()
  condPressure: number;

  @ApiProperty({
    description: "Actual Preassure Drop:",
  })
  @IsOptional()
  @IsNumber()
  condAPDrop: number;

  @ApiProperty({
    description: "Inlet Water Temp:",
  })
  @IsNotEmpty()
  @IsNumber()
  evapInletTemp: number;

  @ApiProperty({
    description: "Outlet Water Temp:",
  })
  @IsNotEmpty()
  @IsNumber()
  evapOutletTemp: number;

  @ApiProperty({
    description: "Refrig Temp.:",
  })
  @IsOptional() // Ask saurav to add a validation for this on his end to check if its required or not based on chiller evap refrig temp value
  @IsNumber()
  evapRefrigTemp: number;

  @ApiProperty({
    description: "Evap. Pressure:",
  })
  @IsNotEmpty()
  @IsNumber()
  evapPressure: number;

  @ApiProperty({ description: "Actual Preassure Drop" })
  @IsOptional()
  @IsNumber()
  evapAPDrop: number;

  @ApiProperty({ description: "Amps. Phase 1" })
  @IsNotEmpty()
  @IsNumber()
  ampsPhase1: number;

  @ApiProperty({ description: "Amps. Phase 2" })
  @IsOptional() // Ask saurav to add a validation for this on his end to check if its required or not based on chiller getampchoice value
  @IsNumber()
  ampsPhase2: number;

  @ApiProperty({ description: "Amps. Phase 3" })
  @IsOptional() // Ask saurav to add a validation for this on his end to check if its required or not based on chiller getampchoice value
  @IsNumber()
  ampsPhase3: number;

  @ApiProperty({ description: "Volts. Phase 1" })
  @IsOptional() // Ask saurav to add a validation for this on his end to check if its required or not based on chiller getvoltagechoice value
  @IsNumber()
  voltsPhase1: number;

  @ApiProperty({ description: "Volts. Phase 2" })
  @IsOptional() // Ask saurav to add a validation for this on his end to check if its required or not based on chiller getvoltagechoice value
  @IsNumber()
  voltsPhase2: number;

  @ApiProperty({ description: "Volts. Phase 3" })
  @IsOptional() // Ask saurav to add a validation for this on his end to check if its required or not based on chiller getvoltagechoice value
  @IsNumber()
  voltsPhase3: number;

  @ApiProperty({ description: "Oil Pressure (High):" })
  @IsOptional() // Ask saurav to add a validation for this on his end to check if its required or not based on chiller if CompOPIndicator == 0 or 1 value
  @IsNumber()
  oilPresHigh: number;

  @ApiProperty({ description: "Oil Pressure (Low):" })
  @IsOptional() // Ask saurav to add a validation for this on his end to check if its required or not based on chiller if CompOPIndicator == 0 value
  @IsNumber()
  oilPresLow: number;

  @ApiProperty({ description: "Oil Pressure Diff:" })
  @IsOptional() // Ask saurav to add a validation for this on his end to check if its required or not based on chiller if CompOPIndicator == 2 value
  @IsNumber()
  oilPresDif: number;

  @ApiProperty({ description: "Oil Sump Temp.:" })
  @IsOptional() // Ask saurav to add a validation for this on his end to check if its required or not based on chiller if CompOPIndicator != 3 value
  @IsNumber()
  oilSumpTemp: number;

  @ApiProperty({ description: "Oil Level:" })
  @IsOptional() // Ask saurav to add a validation for this on his end to check if its required or not based on chiller if CompOPIndicator != 3 value
  @IsNumber()
  oilLevel: number;

  @ApiProperty({ description: "Bearing Temp.:" })
  @IsOptional() // Ask saurav to add a validation for this on his end to check if its required or not based on chiller if chiller.getHaveBearingTemp() value
  @IsNumber()
  bearingTemp: number;

  @ApiProperty({ description: "Run Hours:" })
  @IsNotEmpty()
  @IsNumber()
  runHours: number;

  @ApiProperty({ description: "Run Hours:" })
  @IsOptional()
  @IsNumber()
  comp1RunHours: number;

  @ApiProperty({ description: "Run Hours:" })
  @IsOptional()
  @IsNumber()
  comp2RunHours: number;

  @ApiProperty({ description: "Last Run Hours: (backend calculated)" })
  @IsOptional()
  @IsNumber()
  lastRunHours: number;

  @ApiProperty({
    description: "Last Run Hours Reading Date: (backend calculated)",
  })
  @IsOptional()
  @IsNumber()
  lastRunHoursReadingDate: number;

  @ApiProperty({
    description: "Next Run Hours: (backend calculated)",
  })
  @IsOptional()
  @IsNumber()
  nextRunHours: number;

  @ApiProperty({
    description: "Next Run Hours Reading Date: (backend calculated)",
  })
  @IsOptional()
  @IsNumber()
  nextRunHoursReadingDate: number;

  @ApiProperty({
    description: "Purge Time in Hours:",
  })
  @IsOptional() // if chiller.getHavePurge()
  @IsNumber()
  purgeTimeHr: number;

  @ApiProperty({
    description: "Purge Time in Minutes:",
  })
  @IsOptional() // if chiller.getHavePurge()
  @IsNumber()
  purgeTimeMin: number;

  @ApiProperty({
    description: "User Notes:",
  })
  @IsOptional()
  @IsString()
  userNote: string;

  @ApiProperty({
    description: "Outside Air Temp.:",
  })
  @IsNotEmpty()
  @IsNumber()
  airTemp: number;

  @IsOptional()
  @IsNumber()
  targetCost: number;

  @IsOptional()
  @IsNumber()
  actualCost: number;

  @IsOptional()
  @IsNumber()
  lossCost: number;

  @IsOptional()
  @IsNumber()
  totalLoss: number;

  @IsOptional()
  @IsNumber()
  condInletLoss: number;

  @IsOptional()
  @IsNumber()
  condInletLossCost: number;

  @IsOptional()
  @IsNumber()
  EFLCondAppLoss: number;

  @IsOptional()
  @IsNumber()
  condApproach: number;

  @IsOptional()
  @IsNumber()
  condAppLoss: number;

  @IsOptional()
  @IsNumber()
  condAppLossCost: number;

  @IsOptional()
  @IsNumber()
  evapTempLoss: number;

  @IsOptional()
  @IsNumber()
  evapTempLossCost: number;

  @IsOptional()
  @IsNumber()
  EFLEvapAppLoss: number;

  @IsOptional()
  @IsNumber()
  evapAppLoss: number;

  @IsOptional()
  @IsNumber()
  evapAppLossCost: number;

  @IsOptional()
  @IsNumber()
  nonCondLoss: number;

  @IsOptional()
  @IsNumber()
  nonCondLossCost: number;

  @IsOptional()
  @IsNumber()
  deltaLoss: number;

  @IsOptional()
  @IsNumber()
  deltaLossCost: number;

  @IsOptional()
  @IsNumber()
  condFlow: number;

  @IsOptional()
  @IsNumber()
  evapFlow: number;

  @IsOptional()
  @IsNumber()
  energyCost: number;

  @IsOptional()
  @IsNumber()
  ampImbalance: number;

  @IsOptional()
  @IsNumber()
  voltImbalance: number;

  @IsOptional()
  @IsNumber()
  actualLoad: number;

  @IsOptional()
  @IsNumber()
  finalOilDiff: number;

  @IsOptional()
  @IsNumber()
  condAppVariance: number;

  @IsOptional()
  @IsNumber()
  nonCondensables: number;

  @IsOptional()
  @IsNumber()
  calculatedEvapRefrigTemp: number;

  @IsOptional()
  @IsNumber()
  calculatedCondRefrigTemp: number;

  @IsOptional()
  @IsNumber()
  evapAppVariance: number;

  @IsOptional()
  @IsNumber()
  evapApproach: number;

  @IsOptional()
  @IsNumber()
  altitudeCorrection: number;

  @IsOptional()
  @IsBoolean()
  validRunHours: boolean;

  @ApiProperty({ description: "Begin recording Run Hours with this reading" })
  @IsOptional()
  @IsBoolean()
  runHourStart: boolean;

  @ApiProperty({ description: "Begin recording Run Hours with this reading" })
  @IsOptional()
  @IsBoolean()
  comp1RunHourStart: boolean;

  @ApiProperty({ description: "Begin recording Run Hours with this reading" })
  @IsOptional()
  @IsBoolean()
  comp2RunHourStart: boolean;

  @IsOptional()
  @IsNumber()
  KWHLoss: number;

  @IsOptional()
  @IsNumber()
  BTULoss: number;

  @IsOptional()
  @IsNumber()
  CO2: number;
}

export class UpdateLogDto extends PartialType(CreateLogDTO) {}

export class LogListDto {
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

  @ApiProperty()
  @IsOptional()
  chillerId: string;

  @ApiProperty()
  @IsOptional()
  peakLoad: boolean;
}
export class ExportLogIds {
  @ApiProperty({ description: "The ID Of the logs (operator)" })
  @IsNotEmpty()
  @IsArray()
  logIds: string[];
}
export class FileUploadLogDto {
  @ApiProperty({ required: true, format: "binary", type: "string" })
  file: {
    buffer(buffer: unknown): unknown;
    type: "file";
    format: "binary";
    // filename: "Csv";
    // path: "/__dirname"
  };
  buffer: Buffer;
}
