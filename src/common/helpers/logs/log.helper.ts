/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { BadRequestException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import mongoose, { Model } from "mongoose";
import {
  CHILLER_STATUS,
  ChillerStatus,
  MEASUREMENT_UNITS,
} from "src/common/constants/enum.constant";
import { AltitudeCorrection } from "src/common/schema/altitudeCorrection.schema";
import { Chiller } from "src/common/schema/chiller.schema";
import {
  Conversion,
  ConversionDocument,
} from "src/common/schema/conversion.schema";
import { Facility } from "src/common/schema/facility.schema";
import { Logs } from "src/common/schema/logs.schema";
import {
  differenceInDays,
  differenceInHours,
  addDays,
  subYears,
  isAfter,
  differenceInCalendarDays,
} from "date-fns";
import { TABLE_NAMES } from "src/common/constants/table-name.constant";
import { Company } from "src/common/schema/company.schema";
import { HistChillerPerformance } from "src/common/schema/hist-chiller-performance.schema";
import { HistFacilityPerformance } from "src/common/schema/hist-location-performance.schema";
import { HistCompanyPerformance } from "src/common/schema/hist-company-performance.schema";
// import dayjs from "dayjs";
// import utc from "dayjs/plugin/utc";
// import timezone from "dayjs/plugin/timezone";
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(utc);
dayjs.extend(timezone);

interface PerfSummary {
  averageLoss: number;
  targetCost: number;
  lossCost: number;
  actualCost: number;
  kwhLoss: number;
  btuLoss: number;
  co2: number;
  AvgExcessCondApp: number;
  AvgExcessEvapApp: number;
  AvgOtherLoss: number;
}

interface DateRange {
  label: string;
  startDate: Date;
  endDate: Date;
}

// Helper to handle unit and locale-specific formatting
export class LogRecordHelper {
  private static readonly englishNumber = "9,999.99";
  private static decimalDelimiter = ".";
  private static alternateDelimiter = ",";

  // Helper to convert non-English number formats to English format
  static reformatNumber(
    input: string,
    inputDelimiter: string | null = null,
    outputDelimiter: string | null = null,
  ): string {
    const delimiter = inputDelimiter ?? this.decimalDelimiter;
    const output = outputDelimiter ?? this.alternateDelimiter;

    const cleanedNumber = input.replace(/[^0-9.-]+/g, ""); // Remove non-numeric characters except decimal point
    return cleanedNumber.replace(delimiter, output);
  }

  // Convert number fields based on locale
  static convertNumericFields(
    fields: string[],
    numbers: Record<string, any>,
    inputDelimiter?: string,
  ) {
    const output: Record<string, string> = {};
    fields.forEach((field) => {
      const value = numbers[field];
      if (value !== undefined) {
        output[field] = this.reformatNumber(
          value.toString(),
          inputDelimiter,
          this.alternateDelimiter,
        );
      }
    });
    return output;
  }

  // Validate if a value is numeric
  static isNumeric(value: any): boolean {
    return !isNaN(parseFloat(value)) && isFinite(value);
  }

  // Date validation helper
  static validateReadingDate(readingDate: string, currentDate: string): void {
    const parsedDate = new Date(readingDate);
    const now = new Date(currentDate);

    if (parsedDate > now) {
      throw new BadRequestException(
        "The Reading Date cannot be in the future.",
      );
    }
  }

  // Run hours validation
  static validateRunHoursv1(
    runHours: number,
    lastRunHours: number,
    nextRunHours: number,
  ): void {
    let lowerLimit = 0;
    let upperLimit = 0;

    if (lastRunHours > 0) {
      upperLimit = lastRunHours + 8;
    }

    if (nextRunHours > 0) {
      lowerLimit = nextRunHours - 8;
    }

    if (
      (upperLimit !== 0 && runHours > upperLimit) ||
      (lowerLimit !== 0 && runHours < lowerLimit)
    ) {
      throw new BadRequestException(
        `Run Hours must be between ${lowerLimit} and ${upperLimit}.`,
      );
    }
  }

  static validateRunHours(
    thisRecordRunHours: number,
    thisRecordReadingDate: Date,
    lastRecordRunHours: number,
    lastRecordReadingDate: Date,
  ): boolean {
    // Calculate difference in hours between the two reading dates
    const hoursBetweenDates =
      (new Date(thisRecordReadingDate).getTime() -
        new Date(lastRecordReadingDate).getTime()) /
      (1000 * 60 * 60);

    // Calculate possible maximum hours (last run hours + elapsed time + buffer)
    const possibleHours = hoursBetweenDates + lastRecordRunHours + 3;

    // Validate run hours based on possible hours and sequence
    const isValid = !(
      thisRecordRunHours > possibleHours ||
      thisRecordRunHours < lastRecordRunHours
    );

    return isValid;
  }

  // Helper to check if a value is between a specific range
  static validateInRange(value: number, min: number, max: number): void {
    if (value < min || value > max) {
      throw new BadRequestException(`Value must be between ${min} and ${max}`);
    }
  }

  // Validate if the value is a valid float
  static validateFloat(value: any): void {
    if (!this.isNumeric(value)) {
      throw new BadRequestException(
        `The value for this field must be numeric.`,
      );
    }
  }

  // Validate the time part (hour and minute) of the log record
  static validateReadingTime(hour: number, minute: number): void {
    if (hour < 1 || hour > 12) {
      throw new BadRequestException(
        "The Hours value of the Reading Time must be between 1 and 12.",
      );
    }
    if (minute < 0 || minute > 59) {
      throw new BadRequestException(
        "The Minutes value of the Reading Time must be between 0 and 59.",
      );
    }
  }

  // Helper to reformat the date before submitting to ensure correct formatting
  static formatDateForSubmission(date: string, locale: string): string {
    const parsedDate = new Date(date);
    if (locale.startsWith("en")) {
      return `${parsedDate.getMonth() + 1}/${parsedDate.getDate()}/${parsedDate.getFullYear()}`;
    } else {
      return `${parsedDate.getDate()}/${parsedDate.getMonth() + 1}/${parsedDate.getFullYear()}`;
    }
  }

  static convertToUTCString(
    readingDate: string,
    readingTime: string,
    readingTimeZone: string,
  ) {
    // // Ensure the input is a valid Date object
    // const date = new Date(dateInput);

    // // Check if the date is valid
    // if (isNaN(date.getTime())) {
    //   throw new Error("Invalid date input");
    // }

    // // Convert to UTC and return the ISO string representation
    // return date.toISOString(); // Returns the date in UTC string format (YYYY-MM-DDTHH:mm:ss.sssZ)
    const timeZoneMap: Record<string, string> = {
      EST: "America/New_York",
      PST: "America/Los_Angeles",
      CST: "America/Chicago",
      MST: "America/Denver",
      AKST: "America/Anchorage",
      HST: "Pacific/Honolulu", // Hawaii
      AST: "America/Halifax", // Atlantic (Canada)
      NST: "America/St_Johns", // Newfoundland
    };

    // const ianaZone = timeZoneMap[readingTimeZone.toUpperCase()];
    const upperZone = readingTimeZone.toUpperCase();
    const ianaZone = timeZoneMap[upperZone];

    if (!ianaZone) {
      throw new Error(`Unsupported time zone abbreviation: ${readingTimeZone}`);
    }

    // Combine and parse the date-time string in the specified timezone
    const localDateTimeStr = `${readingDate} ${readingTime}`; // '07-25-2025 2:17 PM'
    const parsed = dayjs.tz(
      localDateTimeStr,
      ["MM-DD-YYYY h:mm A"],
      ianaZone,
      true, // strict mode
    );
    // const parsed = dayjs.tz(localDateTimeStr, "MM-DD-YYYY h:mm A", ianaZone);

    if (!parsed.isValid()) {
      throw new Error(`Invalid date/time: ${localDateTimeStr}`);
    }

    // Return UTC ISO string
    return parsed.utc().toISOString();
  }

  static calculateTargetCostPerHour(
    chiller: Chiller,
    energyCost?: number,
  ): number {
    const cost = energyCost ?? chiller.energyCost ?? 0;
    const avgLoad = chiller.avgLoadProfile ?? 0;
    const tons = chiller.tons ?? 0;
    const kwr = chiller.kwr ?? 0;
    const efficiency = chiller.efficiencyRating ?? 1;

    if (chiller.unit == MEASUREMENT_UNITS.SIMetric) {
      return (1 / efficiency) * cost * kwr * avgLoad * 0.01;
    } else {
      return efficiency * cost * tons * avgLoad * 0.01;
    }
  }

  static calculateAnnualTargetCost(chiller: Chiller): number {
    const hoursPerWeek = chiller.weeklyHours ?? 0;
    const weeksPerYear = chiller.weeksPerYear ?? 0;
    const costPerHour = this.calculateTargetCostPerHour(chiller);
    console.log("✌️costPerHour for SIMetrics chiller --->", costPerHour);
    console.log(
      "✌️hoursPerWeek * weeksPerYear * costPerHour --->",
      hoursPerWeek * weeksPerYear * costPerHour,
    );
    return hoursPerWeek * weeksPerYear * costPerHour;
  }

  static convertTemp(unitIn: string, unitOut: string, temp: number): number {
    unitIn = unitIn.trim().toUpperCase();
    unitOut = unitOut.trim().toUpperCase();
    let tempF: number;

    if (unitIn === "TEMPC") {
      tempF = (temp + 17.8) * 1.8;
    } else {
      tempF = temp;
    }

    if (unitOut === "TEMPF") return tempF;
    return tempF / 1.8 - 17.8;
  }

  static convertPressure(
    unitIn: string,
    unitOut: string,
    pressure: number,
  ): number {
    unitIn = unitIn.trim().toUpperCase();
    unitOut = unitOut.trim().toUpperCase();

    let psig: number;
    switch (unitIn) {
      case "PSIG":
        psig = pressure;
        break;
      case "PSIA":
        psig = pressure - 14.7;
        break;
      case "INHG":
        psig = pressure / 2.036;
        break;
      case "FEET":
        psig = pressure * 0.4335;
        break;
      case "KPA":
        psig = pressure / 6.985;
        break;
      case "BAR":
        psig = pressure * 14.503;
        break;
      default:
        throw new Error("Unknown input unit: " + unitIn);
    }

    switch (unitOut) {
      case "PSIG":
        return psig;
      case "PSIA":
        return psig + 14.7;
      case "INHG":
        return psig * 2.036;
      case "FEET":
        return psig / 0.4335;
      case "KPA":
        return psig * 6.985;
      case "BAR":
        return psig / 14.503;
      default:
        throw new Error("Unknown output unit: " + unitOut);
    }
  }

  static calcCondInletLoss(log: Logs, isMetric: boolean = false): number {
    let tempConstant = 85;
    let degreeDifferential = 2;

    if (isMetric) {
      tempConstant = this.convertTemp("TempF", "TempC", tempConstant);
      degreeDifferential = this.convertTemp(
        "TempF",
        "TempC",
        degreeDifferential,
      );
    }

    let diff = 0;
    if (log.condInletTemp > tempConstant) {
      diff = log.condInletTemp - tempConstant;
    }

    let condInletLoss = diff * degreeDifferential;
    if (condInletLoss < 2) condInletLoss = 0;

    // log.condInletLoss = condInletLoss;
    return condInletLoss;
  }

  static getCondAppVariance(log: Logs, chiller: Chiller): number {
    const approach = this.getCondenserApproach(log, chiller);
    let variance = 0;

    if (chiller.condApproach != null) {
      if (approach >= chiller.condApproach) {
        variance = approach - chiller.condApproach;
      }
    } else {
      const cda = this.getCDA(chiller);
      if (approach >= cda) {
        variance = approach - cda;
      }
    }

    return variance;
  }

  static calcCondAppLoss(log: Logs, chiller: Chiller): number {
    const condAppVariance = this.getCondAppVariance(log, chiller);
    const tempVariance = condAppVariance * chiller.avgLoadProfile * 0.01;
    let condAppLoss =
      chiller.unit == MEASUREMENT_UNITS.SIMetric
        ? tempVariance * 3.6
        : tempVariance * 2;

    if (condAppLoss < 2) condAppLoss = 0;

    // log.condAppVariance = condAppVariance;
    // log.condAppLoss = condAppLoss;
    return condAppLoss;
  }

  static getMaxAmp(log: Logs): number {
    return Math.max(
      log.ampsPhase1 || 0,
      log.ampsPhase2 || 0,
      log.ampsPhase3 || 0,
    );
  }

  static getCDA(chiller: Chiller): number {
    let cda = 5;
    const year = chiller.manufacturedYear;

    if (year >= 1990) cda = 1;
    else if (year >= 1980 && year <= 1989) cda = 2;

    return chiller.unit == MEASUREMENT_UNITS.SIMetric
      ? this.convertTemp("TempF", "TempC", cda)
      : cda;
  }

  static getLoadFactor(log: Logs, chiller: Chiller, maxAmp: number): number {
    const result = chiller.useLoad
      ? maxAmp / 100
      : maxAmp / chiller.fullLoadAmps;
    console.log("✌️result from getLoadFactor --->", result);
    return result;
  }

  static getCondenserApproach(log: Logs, chiller: Chiller): number {
    const maxAmp = this.getMaxAmp(log);
    console.log("✌️maxAmp --->", maxAmp);
    const loadFactor = this.getLoadFactor(log, chiller, maxAmp);
    console.log("✌️loadFactor --->", loadFactor);

    let approach = 0;
    if (loadFactor) {
      if (loadFactor > 0) {
        const refTemp = chiller?.highPressureRefrig
          ? log.calculatedCondRefrigTemp // from getConversionInfo
          : log.condRefrigTemp;

        approach = (refTemp - log.condOutletTemp) / loadFactor;
      }
    }

    // log.condApproach = approach;
    // log.actualLoad = loadFactor * 100;
    if (approach) {
      return approach;
    } else {
      return 0;
    }
  }

  // static calcEvapTempLoss(log: Logs, chiller: Chiller): number {
  //   let loss = 0;

  //   // Assume 44°F as the benchmark evap outlet temperature
  //   const baseTemp =
  //     chiller.unit == MEASUREMENT_UNITS.SIMetric
  //       ? this.convertTemp('TempF', 'TempC', 44)
  //       : 44;

  //   const diff = log.evapOutletTemp - baseTemp;
  //   const tempLoss = diff > 0 ? diff : 0;

  //   loss =
  //     chiller.unit == MEASUREMENT_UNITS.SIMetric
  //       ? tempLoss * 3.6
  //       : tempLoss * 2;

  //   if (loss < 2) loss = 0;

  //   // log.evapTempLoss = loss;
  //   return loss;
  // }
  static calcEvapTempLoss(log: Logs, chiller: Chiller): number {
    let evapTempVariance = 0;
    let evapTempLoss = 0;

    let finalOutletTemp: number;
    let designOutletTemp: number;

    // Ensure temps are in Fahrenheit
    if (chiller.unit === MEASUREMENT_UNITS.SIMetric) {
      finalOutletTemp = this.convertTemp("TEMPC", "TEMPF", log.evapOutletTemp);
      designOutletTemp = this.convertTemp(
        "TEMPC",
        "TEMPF",
        chiller.evapDOWTemp,
      );
    } else {
      finalOutletTemp = log.evapOutletTemp;
      designOutletTemp = chiller.evapDOWTemp;
    }

    // If actual temp <= design temp → calculate variance
    if (finalOutletTemp <= designOutletTemp) {
      evapTempVariance = designOutletTemp - finalOutletTemp;
    }

    // Loss is 2% per °F of variance
    evapTempLoss = evapTempVariance * 2;

    // Ignore loss if less than 2%
    if (evapTempLoss < 2) {
      evapTempLoss = 0;
    }

    // In CF it sets back to log record, here we just return
    return evapTempLoss;
  }

  // static calcEvapAppLoss(log: Logs, chiller: Chiller): number {
  //   const approach = (log.evapRefrigTemp ?? 0) - (log.evapOutletTemp ?? 0);
  //   const cda = chiller.evapApproach ?? 5;

  //   const variance = approach > cda ? approach - cda : 0;
  //   let loss =
  //     chiller.unit == MEASUREMENT_UNITS.SIMetric
  //       ? variance * 3.6
  //       : variance * 2;

  //   if (loss < 2) loss = 0;

  //   // log.evapAppLoss = loss;
  //   return loss;
  // }

  static async calcEvapAppLoss(
    log: Logs,
    chiller: Chiller,
    conversionModel: Model<Conversion>,
  ): Promise<number> {
    // Step 1: Get variance (full equivalent of CFML getEvapAppVariance)
    const evapAppVariance = await this.getEvapAppVariance(
      log,
      chiller,
      conversionModel,
    );

    // Step 2: Adjust variance for load profile
    const adjustedVariance = evapAppVariance * chiller.avgLoadProfile * 0.01;

    // Step 3: Calculate loss depending on unit system
    let loss =
      chiller.unit === MEASUREMENT_UNITS.SIMetric
        ? adjustedVariance * 3.6
        : adjustedVariance * 2;

    // Step 4: Apply threshold rule
    if (loss < 2) {
      loss = 0;
    }

    // Step 5: Write back into log record (like CFML setEvapAppLoss)
    log.evapAppLoss = loss;

    return loss;
  }

  // Working code do not delete.
  static calcNonCondLoss(log: Logs, chiller: Chiller): number {
    const temp = log.condInletTemp ?? 0;
    const pressure = log.condPressure ?? 0;

    // Arbitrary threshold for abnormal behavior (can be updated)
    const nonCondLoss =
      pressure > 0 && temp > 0 && pressure / temp > 0.9 ? 10 : 0;

    // log.nonCondLoss = nonCondLoss;
    return nonCondLoss;
  }

  // static async calcNonCondLoss(
  //   log: Logs,
  //   chiller: Chiller,
  //   conversionModel: Model<Conversion>,
  //   conversionData: any, // pass in same way ColdFusion does
  // ): Promise<number> {
  //   // Step 1: Get non-condensables value (implement similar to ColdFusion getNonCondensables)
  //   const { nonCondensables } = await this.getNonCondensables(
  //     log,
  //     chiller,
  //     conversionModel,
  //     conversionData,
  //   );

  //   let nonCondLoss = 0;
  //   let multiplierConstant = 5;

  //   // Step 2: If no non-condensables → no loss
  //   if (nonCondensables <= 0) {
  //     nonCondLoss = 0;
  //   } else {
  //     // Step 3: Convert multiplier constant from native unit to PSIG
  //     // (ColdFusion converts FROM chiller unit TO PSIG)
  //     if (chiller.condPressureUnit !== "PSIA") {
  //       multiplierConstant = this.convertPressure(
  //         chiller.condPressureUnit,
  //         "PSIG",
  //         multiplierConstant,
  //       );
  //     }

  //     // Step 4: Multiply by constant
  //     nonCondLoss = nonCondensables * multiplierConstant;
  //   }

  //   // Step 5: Safeguard — ignore small values
  //   if (nonCondLoss < 2) {
  //     nonCondLoss = 0;
  //   }

  //   // Step 6: return (ColdFusion sets on logRecord)
  //   // log.nonCondLoss = nonCondLoss;
  //   return nonCondLoss;
  // }

  static calcDeltaLossOld(log: Logs, chiller: Chiller): number {
    const losses = [
      log.condInletLoss || 0,
      log.condAppLoss || 0,
      log.evapTempLoss || 0,
      log.evapAppLoss || 0,
      log.nonCondLoss || 0,
    ];

    const deltaLoss = losses.reduce((acc, cur) => acc + cur, 0);
    // log.deltaLoss = deltaLoss;
    return deltaLoss;
  }

  static calcDeltaLoss(log: Logs, chiller: Chiller) {
    let designDeltaP = 0;
    let actualDeltaP = 0;
    let deltaVarianceIntermediate = 0;
    let deltaVarianceFinal = 0;
    let condFlow = 0;
    let deltaLoss = 0;
    let finalInletTemp = 0;
    let finalOutletTemp = 0;

    // Convert design condenser delta P to PSIG
    if (
      this.isNumeric(chiller.condDPDrop) &&
      chiller.condDPDrop !== 0 &&
      chiller.condDPDropUnit
    ) {
      designDeltaP = this.convertPressure(
        chiller.condDPDropUnit,
        "PSIG",
        chiller.condDPDrop,
      );
    }

    // Convert actual condenser AP drop to PSIG
    if (this.isNumeric(log.condAPDrop) && chiller.condAPDropUnit) {
      actualDeltaP = this.convertPressure(
        chiller.condAPDropUnit,
        "PSIG",
        log.condAPDrop,
      );
    }

    // If both values exist, calculate loss and flow
    if (designDeltaP !== 0 && actualDeltaP !== 0) {
      deltaVarianceIntermediate = Math.pow(
        Math.abs(actualDeltaP) / Math.abs(designDeltaP),
        2,
      );

      condFlow = (deltaVarianceIntermediate - 1) * 100;

      // Convert temperatures if chiller uses metric
      if (chiller.unit == MEASUREMENT_UNITS.SIMetric) {
        finalInletTemp = this.convertTemp("TempC", "TempF", log.condInletTemp);
        finalOutletTemp = this.convertTemp(
          "TempC",
          "TempF",
          log.condOutletTemp,
        );
      } else {
        finalInletTemp = log.condInletTemp;
        finalOutletTemp = log.condOutletTemp;
      }

      deltaVarianceFinal =
        (1 - deltaVarianceIntermediate) * (finalOutletTemp - finalInletTemp);

      deltaLoss = deltaVarianceFinal * 2;

      // Ignore small loss values
      if (deltaLoss < 2) {
        deltaLoss = 0;
      }
    }

    // log.deltaLoss = deltaLoss;
    // log.condFlow = condFlow;

    return { deltaLoss, condFlow };
  }

  static calcEvapFlow(log: Logs, chiller: Chiller): number {
    let designDeltaP = 0;
    let actualDeltaP = 0;
    let evapFlow = 0;

    // Convert design evaporator delta P to PSIG
    if (
      this.isNumeric1(chiller.evapDPDrop) &&
      chiller.evapDPDrop !== 0 &&
      chiller.evapDPDropUnit
    ) {
      designDeltaP = this.convertPressure(
        chiller.evapDPDropUnit,
        "PSIG",
        chiller.evapDPDrop,
      );
    }

    // Convert actual evaporator AP drop to PSIG
    if (this.isNumeric1(log.evapAPDrop) && chiller.evapAPDropUnit) {
      actualDeltaP = this.convertPressure(
        chiller.evapAPDropUnit,
        "PSIG",
        log.evapAPDrop,
      );
    }

    // If both pressures are valid, calculate evapFlow variance
    if (designDeltaP !== 0 && actualDeltaP !== 0) {
      const evapVariance = Math.pow(
        Math.abs(actualDeltaP) / Math.abs(designDeltaP),
        2,
      );
      evapFlow = (evapVariance - 1) * 100;
    }

    // log.evapFlow = evapFlow;
    return evapFlow;
  }

  // Optional helper (if not already present)
  private static isNumeric1(value: any): boolean {
    return typeof value === "number" && !isNaN(value);
  }

  static async calcEvapRefrigTemp(
    log: Logs,
    chiller: Chiller,
    conversionModel: Model<Conversion>,
  ): Promise<number> {
    const calculatedEvapRefrigTemp = await this.getETemp(
      chiller,
      log,
      conversionModel,
    ); // assumes you have this function
    // log.calculatedEvapRefrigTemp = calculatedEvapRefrigTemp;
    return calculatedEvapRefrigTemp;
  }

  static getFinalRefrigTemp(
    log: Logs,
    chiller: Chiller,
    calculatedEvapRefrigTemp: number,
  ): number {
    if (chiller.useEvapRefrigTemp && this.isNumeric(log.evapRefrigTemp)) {
      return log.evapRefrigTemp;
    }
    return calculatedEvapRefrigTemp;
  }

  static getEvapApproach(
    log: Logs,
    chiller: Chiller,
    refrigTemp: number,
  ): number {
    const maxAmp = this.getMaxAmp(log);
    let evapApproach = 0;

    if (this.isNumeric(maxAmp) && maxAmp !== 0) {
      if (chiller.useLoad) {
        evapApproach = (log.evapOutletTemp - refrigTemp) * (100 / maxAmp);
      } else {
        evapApproach =
          (log.evapOutletTemp - refrigTemp) * (chiller.fullLoadAmps / maxAmp);
      }
    }

    evapApproach = this.roundToFourDecimals(evapApproach);

    // log.evapApproach = evapApproach;
    return evapApproach;
  }

  static getEDA(chiller: Chiller): number {
    let eda = 6;
    const year = chiller.manufacturedYear ?? 0;

    if (year >= 1990) eda = 3;
    else if (year >= 1980 && year <= 1989) eda = 4;

    return chiller.unit === MEASUREMENT_UNITS.SIMetric
      ? this.convertTemp("TempF", "TempC", eda)
      : eda;
  }

  static async getEvapAppVariance(
    log: Logs,
    chiller: Chiller,
    conversionModel: Model<Conversion>,
  ): Promise<number> {
    const calculatedEvapRefrigTemp = await this.calcEvapRefrigTemp(
      log,
      chiller,
      conversionModel,
    );
    const refrigTemp = this.getFinalRefrigTemp(
      log,
      chiller,
      calculatedEvapRefrigTemp,
    );
    const evapApproach = this.getEvapApproach(log, chiller, refrigTemp);
    const eda = this.getEDA(chiller);

    let evapAppVariance = 0;

    if (this.isNumeric(chiller.evapApproach)) {
      if (evapApproach > chiller.evapApproach) {
        evapAppVariance = evapApproach - chiller.evapApproach;
      }
    } else {
      if (evapApproach > eda) {
        evapAppVariance = evapApproach - eda;
      }
    }

    // log.evapAppVariance = evapAppVariance;
    return evapAppVariance;
  }

  static convertDegrees(
    unitIn: string,
    unitOut: string,
    degrees: number,
  ): number {
    let tempF = 0;

    switch (unitIn.trim().toUpperCase()) {
      case "TEMPF":
        tempF = degrees;
        break;
      case "TEMPC":
        tempF = degrees * 1.8;
        break;
    }

    switch (unitOut.trim().toUpperCase()) {
      case "TEMPF":
        return tempF;
      case "TEMPC":
        return tempF / 1.8;
      default:
        throw new Error("Unknown output unit");
    }
  }

  static async getETemp(
    chiller: Chiller,
    log: Logs,
    conversionModel: Model<Conversion>,
  ): Promise<number> {
    // Step 1: Convert the Evaporator Pressure to PSIG
    const evapPSIGPressure = this.convertPressure(
      chiller.evapPressureUnit,
      "PSIG",
      log.evapPressure,
    );

    // Step 2: Correct the pressure for altitude
    console.log("✌️log.altitudeCorrection --->", log.altitudeCorrection);
    const correctedPressure = evapPSIGPressure - (log.altitudeCorrection || 0);

    // Step 3: Get temp from DAO (based on whether original was PSIA or not)
    let eTemp = 0;

    if (chiller.evapPressureUnit === "PSIA") {
      // Use uncorrected pressure if unit is PSIA
      eTemp = await this.getETempConverion(
        chiller,
        evapPSIGPressure,
        conversionModel,
      );
    } else {
      eTemp = await this.getETempConverion(
        chiller,
        correctedPressure,
        conversionModel,
      );
    }

    // Step 4: Convert temperature to Celsius if metconversionModel: Model<ConversionDocument>ric
    if (chiller.unit === MEASUREMENT_UNITS.SIMetric) {
      eTemp = this.convertTemp("TempF", "TempC", eTemp);
    }

    return eTemp;
  }

  static async getETempConverion(
    chiller: Chiller,
    evapPressure: number,
    conversionModel: Model<Conversion>,
  ) {
    const refrigName = chiller.refrigType;

    const record = await conversionModel
      .findOne({
        refrigName,
        psig: { $lte: evapPressure },
      })
      .sort({ psig: -1 })
      .limit(1)
      .lean();

    return record?.tempF ?? 0;
  }

  static getEFLLoss(
    log: Logs,
    chiller: Chiller,
  ): { EFLCondAppLoss: number; EFLEvapAppLoss: number } {
    let EFLCondAppLoss = 0;
    let EFLEvapAppLoss = 0;

    const condAppVariance = log.condAppVariance ?? 0;
    const evapAppVariance = log.evapAppVariance ?? 0;

    if (chiller.unit == MEASUREMENT_UNITS.SIMetric) {
      EFLCondAppLoss = condAppVariance * 3.6;
      EFLEvapAppLoss = evapAppVariance * 3.6;
    } else {
      EFLCondAppLoss = condAppVariance * 2;
      EFLEvapAppLoss = evapAppVariance * 2;
    }

    if (EFLCondAppLoss < 2) {
      EFLCondAppLoss = 0;
    }

    if (EFLEvapAppLoss < 2) {
      EFLEvapAppLoss = 0;
    }

    // log.EFLCondAppLoss = EFLCondAppLoss;
    // log.EFLEvapAppLoss = EFLEvapAppLoss;

    return { EFLCondAppLoss, EFLEvapAppLoss };
  }

  static checkImbalances(logRecord: Logs, chiller: Chiller) {
    let ampImbalance = 0;
    let voltImbalance = 0;

    // If using direct amps input (ampChoice === false)
    if (!chiller.ampChoice) {
      const amps = [
        logRecord.ampsPhase1 ?? 0,
        logRecord.ampsPhase2 ?? 0,
        logRecord.ampsPhase3 ?? 0,
      ];
      const avgAmps = amps.reduce((acc, val) => acc + val, 0) / amps.length;

      const ampDeviation = Math.max(
        ...amps.map((amp) => Math.abs(amp - avgAmps)),
      );

      ampImbalance = avgAmps !== 0 ? (ampDeviation / avgAmps) * 100 : 0;
    }

    // If voltageChoice === 0, compute voltage imbalance
    if (chiller.voltageChoice === "3-Phase") {
      const volts = [
        logRecord.voltsPhase1 ?? 0,
        logRecord.voltsPhase2 ?? 0,
        logRecord.voltsPhase3 ?? 0,
      ];
      const avgVolts = volts.reduce((acc, val) => acc + val, 0) / volts.length;

      const voltDeviation = Math.max(
        ...volts.map((volt) => Math.abs(volt - avgVolts)),
      );

      voltImbalance = avgVolts !== 0 ? (voltDeviation / avgVolts) * 100 : 0;
    }

    // logRecord.ampImbalance = ampImbalance;
    // logRecord.voltImbalance = voltImbalance;

    return { ampImbalance, voltImbalance };
  }

  static getFinalOilDiff(logRecord: Logs, chiller: Chiller) {
    const compOPIndicator = chiller.compOPIndicator;
    let finalOilDiff = 0;
    let intermediateDiff = 0;

    let convertedEvapPressure = 0;
    let convertedHighPressure = 0;
    let convertedLowPressure = 0;

    switch (compOPIndicator) {
      case "Enter Differential Directly":
        if (this.isNumeric(logRecord.oilPresDif)) {
          finalOilDiff = logRecord.oilPresDif!;
        }
        break;

      case "Enter High Pressure Only":
        if (
          this.isNumeric(logRecord.oilPresHigh) &&
          this.isNumeric(logRecord.evapPressure)
        ) {
          convertedEvapPressure = this.convertPressure(
            chiller.evapPressureUnit,
            "PSIG",
            logRecord.evapPressure!,
          );
          convertedHighPressure = this.convertPressure(
            chiller.oilPresHighUnit,
            "PSIG",
            logRecord.oilPresHigh!,
          );
          intermediateDiff = convertedHighPressure - convertedEvapPressure;
          finalOilDiff = this.convertPressure(
            "PSIG",
            chiller.oilPresDifUnit,
            intermediateDiff,
          );
        }
        break;

      case "Enter High and Low Pressures":
        if (
          this.isNumeric(logRecord.oilPresHigh) &&
          this.isNumeric(logRecord.oilPresLow)
        ) {
          convertedLowPressure = this.convertPressure(
            chiller.oilPresLowUnit,
            "PSIG",
            logRecord.oilPresLow!,
          );
          convertedHighPressure = this.convertPressure(
            chiller.oilPresHighUnit,
            "PSIG",
            logRecord.oilPresHigh!,
          );
          intermediateDiff = convertedHighPressure - convertedLowPressure;
          finalOilDiff = this.convertPressure(
            "PSIG",
            chiller.oilPresDifUnit,
            intermediateDiff,
          );
        }
        break;
    }

    // logRecord.finalOilDiff = finalOilDiff;

    return finalOilDiff;
  }

  static async getNonCondensables(
    logRecord: Logs,
    chiller: Chiller,
    conversionModel: Model<Conversion>,
    conversionData?: { psig: number; temp: number },
  ): Promise<{ nonCondensables: number; thisCondRefrigTemp: number }> {
    let nonCondensables = 0;
    let conversionCondPressure = 0;
    let convertedAltCorrection = 0;
    let correctedCondPressure = 0;
    let thisCondRefrigTemp = 0;

    // If no conversion data was passed, get it using the helper
    if (!conversionData) {
      // conversionData = this.getConversionInfo(logRecord, chiller);
      const result = await this.getConversionInfo(
        logRecord,
        chiller,
        conversionModel,
      );
      conversionData = result.conversionData;
      thisCondRefrigTemp = result.thisCondRefrigTemp;
    } else {
      // If conversionData was passed, calculate temp from it
      thisCondRefrigTemp = conversionData.temp;
    }

    // Convert PSIG from conversion data to the chiller's condPressureUnit
    conversionCondPressure = this.convertPressure(
      "PSIG",
      chiller.condPressureUnit,
      conversionData?.psig,
    );

    // Convert Altitude Correction (from PSIG to the chiller’s condPressureUnit)
    convertedAltCorrection = this.convertPressure(
      "PSIG",
      chiller.condPressureUnit,
      logRecord.altitudeCorrection ?? 0,
    );

    // Adjust Condenser Pressure based on altitude correction, only for non-PSIA units
    if (chiller.condPressureUnit === "PSIA") {
      correctedCondPressure = logRecord.condPressure ?? 0;
    } else {
      correctedCondPressure =
        (logRecord.condPressure ?? 0) - convertedAltCorrection;
    }

    nonCondensables = correctedCondPressure - conversionCondPressure;

    // logRecord.nonCondensables = nonCondensables;
    return { nonCondensables, thisCondRefrigTemp };
  }

  static async getConversionInfo(
    logRecord: Logs,
    chiller: Chiller,
    conversionModel: Model<Conversion>,
  ): Promise<{
    conversionData: { psig: number; temp: number };
    thisCondRefrigTemp: number;
  }> {
    const conversionData: { psig: number; temp: number } = {
      psig: 0,
      temp: 0,
    };

    let thisCondRefrigTemp = 0;
    let conversionQuery: { psig: number; tempF: number };
    let currentCondPressure = 0;
    let finalCondPressure = 0;

    if (!chiller.highPressureRefrig) {
      // Low pressure refrigerant handling
      thisCondRefrigTemp =
        chiller.unit == MEASUREMENT_UNITS.SIMetric
          ? this.convertTemp("tempC", "tempF", logRecord.condRefrigTemp)
          : logRecord.condRefrigTemp;

      conversionQuery = await this.getConversionInfoForLowPressure(
        chiller.refrigType,
        thisCondRefrigTemp,
        conversionModel,
      );

      // conversionData.psig = conversionQuery.psig;
      const temp =
        chiller.unit == MEASUREMENT_UNITS.SIMetric
          ? this.convertTemp("tempF", "tempC", conversionQuery.tempF)
          : conversionQuery.tempF;

      return {
        conversionData: {
          psig: conversionQuery.psig,
          temp,
        },
        thisCondRefrigTemp: temp,
      };
    } else {
      // High pressure refrigerant handling
      currentCondPressure = this.convertPressure(
        chiller.condPressureUnit,
        "PSIG",
        logRecord.condPressure ?? 0,
      );

      // Round to 2 decimal places
      currentCondPressure = Math.round(currentCondPressure * 100 + 0.5) / 100;

      finalCondPressure =
        chiller.condPressureUnit === "PSIA"
          ? currentCondPressure
          : currentCondPressure - (logRecord.altitudeCorrection ?? 0);

      conversionQuery = await this.getConversionInfoForHighPressure(
        chiller.refrigType,
        finalCondPressure,
        conversionModel,
      );

      thisCondRefrigTemp =
        chiller.unit == MEASUREMENT_UNITS.SIMetric
          ? this.convertTemp("tempF", "tempC", conversionQuery.tempF)
          : conversionQuery.tempF;

      // logRecord.calculatedCondRefrigTemp = thisCondRefrigTemp;
      // conversionData.psig = conversionQuery.psig;
      // conversionData.temp = thisCondRefrigTemp;
      return { conversionData, thisCondRefrigTemp };
    }
  }

  static async getConversionInfoForLowPressure(
    refrigName: string,
    condRefrigTemp: number,
    conversionModel?: Model<Conversion>,
  ) {
    const formattedTemp = parseFloat(condRefrigTemp?.toFixed(1));

    let result;

    if (formattedTemp) {
      result = await conversionModel
        .findOne({
          refrigName: refrigName,
          tempF: { $lte: formattedTemp },
        })
        .sort({ tempF: -1 }) // DESC
        .select({ tempF: 1, psig: 1 })
        .lean();
    }

    // if (!result) {
    //   throw new Error(
    //     `Conversion data not found for RefrigID=${refrigName} and TempF<=${formattedTemp}`
    //   );
    // }

    if (result) {
      return {
        tempF: result.tempF,
        psig: result.psig,
      };
    } else {
      return {
        tempF: 0,
        psig: 0,
      };
    }
  }

  static async getConversionInfoForHighPressure(
    refrigName: string,
    condPressure: number,
    conversionModel?: Model<Conversion>,
  ) {
    const result = await conversionModel
      .findOne({
        refrigName: refrigName,
        psig: { $lte: condPressure },
      })
      .sort({ tempF: -1 })
      .select({ tempF: 1, psig: 1 })
      .lean();

    if (!result) {
      throw new Error(
        `Conversion data not found for RefrigID=${refrigName} and PSIG<=${condPressure}`,
      );
    }

    return {
      tempF: result.tempF,
      psig: result.psig,
    };
  }

  static async validateRunHoursField(logRecord: Logs, chiller: Chiller) {
    const runHours = logRecord.runHours;
    const isRunHourStart = logRecord.runHourStart;
    const usesRunHours = chiller.useRunHours;

    // If RunHours is required but missing or not numeric
    if (
      runHours === undefined ||
      runHours === null ||
      isNaN(Number(runHours))
    ) {
      logRecord.validRunHours = false;
      return false;
    }

    // If numeric and chiller uses run hours
    if (!isNaN(Number(runHours)) && usesRunHours) {
      const validationResult = this.checkRunHoursValidity(logRecord); // Assume this returns { isValid: boolean, highLow: 'High' | 'Low' }

      if (!validationResult.isValid && !isRunHourStart) {
        logRecord.validRunHours = false;
        return false;
      } else {
        logRecord.validRunHours = true;
        return true;
      }
    }

    // By default, assume valid if no rules apply
    logRecord.validRunHours = true;
    return true;
  }

  static checkRunHoursValidity(logRecord: Logs): {
    isValid: boolean;
    highLow: "High" | "Low";
  } {
    const thisRunHours = Number(logRecord.runHours);
    const thisReadingDate = new Date(logRecord.readingDateUTC);

    const lastRunHours = Number(logRecord.lastRunHours);
    const lastReadingDate = logRecord.lastRunHoursReadingDate
      ? new Date(logRecord.lastRunHoursReadingDate)
      : null;

    const nextRunHours = Number(logRecord.nextRunHours);
    const nextReadingDate = logRecord.nextRunHoursReadingDate
      ? new Date(logRecord.nextRunHoursReadingDate)
      : null;

    const result = { isValid: true, highLow: "High" as "High" | "Low" };

    // --- Check against last record ---
    if (lastReadingDate && this.isValidDate(lastReadingDate)) {
      const hoursBetweenLastDates = this.differenceInHours(
        thisReadingDate,
        lastReadingDate,
      );
      const possibleLastHours = hoursBetweenLastDates + lastRunHours + 8;

      if (thisRunHours > possibleLastHours || thisRunHours < lastRunHours) {
        result.isValid = false;
        if (thisRunHours < lastRunHours) {
          result.highLow = "Low";
        }
      }
    }

    // --- Check against next record ---
    if (
      nextReadingDate &&
      this.isValidDate(nextReadingDate) &&
      !isNaN(nextRunHours)
    ) {
      const hoursBetweenNextDates = this.differenceInHours(
        nextReadingDate,
        thisReadingDate,
      );
      const possibleNextHours = nextRunHours - hoursBetweenNextDates - 8;

      if (thisRunHours < possibleNextHours || thisRunHours > nextRunHours) {
        result.isValid = false;
        if (thisRunHours < possibleNextHours) {
          result.highLow = "Low";
        }
      }
    }

    return result;
  }

  static isValidDate(date: any): boolean {
    return date instanceof Date && !isNaN(date.getTime());
  }

  static differenceInHours(dateLeft: Date, dateRight: Date): number {
    const diffMs = dateLeft.getTime() - dateRight.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60)); // Convert milliseconds to hours
  }

  static calcKWHLoss(logRecord: Logs) {
    const lossCost = logRecord.lossCost;
    const energyCost = logRecord.energyCost;

    let kwhLoss = 0;

    if (
      typeof lossCost === "number" &&
      typeof energyCost === "number" &&
      energyCost > 0
    ) {
      kwhLoss = lossCost / energyCost;
    } else {
      kwhLoss = 0;
    }

    return kwhLoss;
  }

  static calcBTULoss(logRecord: Logs) {
    const kwhLoss = logRecord.KWHLoss;
    let btuLoss = 0;

    if (typeof kwhLoss === "number") {
      btuLoss = kwhLoss * 3412.12;
    } else {
      btuLoss = 0;
    }

    return btuLoss;
  }

  static calcCO2(logRecord: Logs, emissionFactor: number) {
    const kwhLoss = logRecord.KWHLoss;
    let co2 = 0;

    if (typeof kwhLoss === "number") {
      co2 = (kwhLoss * emissionFactor) / 2000;
    } else {
      co2 = 0;
    }

    return co2;
  }

  static convertDistance(
    from: "Meters" | "Feet",
    to: "Meters" | "Feet",
    value: number,
  ): number {
    if (from === to) return value;

    // 1 meter = 3.28084 feet
    return from === "Meters" ? value * 3.28084 : value / 3.28084;
  }

  static async getAltitudeCorrection(
    feet: number,
    altitudeCorrectionModel?: Model<AltitudeCorrection>,
  ) {
    if (feet === 0) return 0;

    const [correctionTop] = await altitudeCorrectionModel
      .find({ feet: { $gte: feet } })
      .sort({ feet: 1 })
      .limit(1)
      .lean();

    const [correctionBottom] = await altitudeCorrectionModel
      .find({ feet: { $lte: feet } })
      .sort({ feet: -1 })
      .limit(1)
      .lean();

    if (!correctionTop && !correctionBottom) return 0;
    if (!correctionTop) return correctionBottom.correction;
    if (!correctionBottom) return correctionTop.correction;

    const diffTop = Math.abs(correctionTop.feet - feet);
    const diffBottom = Math.abs(correctionBottom.feet - feet);

    return diffTop <= diffBottom
      ? correctionTop.correction
      : correctionBottom.correction;
  }

  // utils.service.ts or altitude.service.ts

  static async getAltitudeCorrectionByLocation(
    location: Facility,
    altCorrectionModel: Model<AltitudeCorrection>,
  ) {
    let altitudeInFeet = 0;

    if (location.altitudeUnit === "feet") {
      altitudeInFeet = location.altitude;
    } else {
      altitudeInFeet = this.convertDistance(
        "Meters",
        "Feet",
        location.altitude,
      );
    }

    return await this.getAltitudeCorrection(altitudeInFeet, altCorrectionModel);
  }

  static roundToFourDecimals(value: number): number {
    return Number(value.toFixed(4));
  }

  static sanitizeLogData(logData: Logs, chiller: Chiller) {
    // Remove condRefrigTemp if not high pressure
    if (!chiller.highPressureRefrig) delete logData.condRefrigTemp;

    // Remove evapRefrigTemp if not using it
    if (!chiller.useEvapRefrigTemp) delete logData.evapRefrigTemp;

    // Handle Amps based on ampChoice
    switch (chiller.ampChoice) {
      case "3-Phase":
        // keep all
        break;
      case "1-Phase":
      case "Enter % Load":
        delete logData.ampsPhase2;
        delete logData.ampsPhase3;
        break;
      default:
        delete logData.ampsPhase2;
        delete logData.ampsPhase3;
    }

    // Handle Volts based on voltageChoice
    switch (chiller.voltageChoice) {
      case "1-Phase":
        delete logData.voltsPhase2;
        delete logData.voltsPhase3;
        break;
      case "Do Not Log Voltage":
        delete logData.voltsPhase1;
        delete logData.voltsPhase2;
        delete logData.voltsPhase3;
        break;
      case "3-Phase":
        // keep all
        break;
    }

    // Handle oil pressure-related fields based on CompOPIndicator
    const op = chiller.compOPIndicator;
    if (
      op !== "Enter High and Low Pressures" &&
      op !== "Enter High Pressure Only"
    ) {
      delete logData.oilPresHigh;
    }
    if (op !== "Enter High and Low Pressures") {
      delete logData.oilPresLow;
    }
    if (op !== "Enter Differential Directly") {
      delete logData.oilPresDif;
    }
    if (op === "Do Not Log Lube System") {
      delete logData.oilSumpTemp;
      delete logData.oilLevel;
    }

    // Remove bearingTemp if not available
    if (!chiller.haveBearingTemp) delete logData.bearingTemp;

    // Remove purge fields if not used
    if (!chiller.havePurge) {
      delete logData.purgeTimeHr;
      delete logData.purgeTimeMin;
    }

    // Remove derived/calculated fields if base fields were removed
    const dependentFields = [
      "targetCost",
      "actualCost",
      "lossCost",
      "totalLoss",
      "condInletLoss",
      "condInletLossCost",
      "EFLCondAppLoss",
      "condApproach",
      "condAppLoss",
      "condAppLossCost",
      "evapTempLoss",
      "evapTempLossCost",
      "EFLEvapAppLoss",
      "evapAppLoss",
      "evapAppLossCost",
      "nonCondLoss",
      "nonCondLossCost",
      "deltaLoss",
      "deltaLossCost",
      "condFlow",
      "evapFlow",
      "energyCost",
      "ampImbalance",
      "voltImbalance",
      "actualLoad",
      "finalOilDiff",
      "condAppVariance",
      "nonCondensables",
      "calculatedEvapRefrigTemp",
      "calculatedCondRefrigTemp",
      "evapAppVariance",
      "evapApproach",
      "altitudeCorrection",
      "validRunHours",
      "runHourStart",
      "KWHLoss",
      "BTULoss",
      "CO2",
    ];

    dependentFields.forEach((field) => delete logData[field]);

    return logData;
  }

  static async createPerformanceSummaryForChiller(
    chillerID: string,
    logsModel: Model<Logs>,
    chillerModel: Model<Chiller>,
  ) {
    const rangeTypes = [1, 2, 3];
    // const thisYear = new Date().getFullYear();
    const today = new Date();

    const results: any = {};
    let perfSummary = {
      avgLoss: 0,
      targetCost: 0,
      lossCost: 0,
      actualCost: 0,
      kwhLoss: 0,
      BTULoss: 0,
      CO2: 0,
      avgExcessCondApp: 0,
      avgExcessEvapApp: 0,
      avgOtherLoss: 0,
    };

    for (const rangeType of rangeTypes) {
      let startDate: Date;
      let endDate: Date;
      // const endDate = new Date(); // today
      // const startDate = new Date();

      // if (i === 1) {
      //   startDate = new Date(thisYear, 0, 1);
      //   endDate = new Date();
      // } else if (i === 2) {
      //   startDate = new Date(thisYear - 1, 0, 1);
      //   endDate = subYears(new Date(), 1);
      // } else if (i === 3) {
      //   startDate = subYears(new Date(), 1);
      //   endDate = new Date();
      // }
      if (rangeType === 1) {
        // startDate.setFullYear(endDate.getFullYear() - 1);
        // This YTD → Jan 1 current year → today
        // old logic
        // startDate = new Date(Date.UTC(today.getFullYear(), 0, 1, 0, 0, 0, 0));
        // endDate = new Date(today); // today (keeps actual now timestamp)
        startDate = new Date(new Date().getFullYear(), 0, 1);
        endDate = new Date(); // today
      } else if (rangeType === 2) {
        // startDate.setFullYear(endDate.getFullYear() - 2);
        // Last YTD → Jan 1 last year → today
        // old logic
        // startDate = new Date(
        //   Date.UTC(today.getFullYear() - 1, 0, 1, 0, 0, 0, 0)
        // );
        // endDate = new Date(today); // today
        const lastYear = new Date().getFullYear() - 1;
        startDate = new Date(lastYear, 0, 1); // Jan 1 last year

        endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() - 1); // today - 1 year
      } else if (rangeType === 3) {
        // startDate.setFullYear(endDate.getFullYear() - 3);
        // Last 12 months → Full last year
        // old logic
        // startDate = new Date(
        //   Date.UTC(today.getFullYear() - 1, 0, 1, 0, 0, 0, 0)
        // );
        // endDate = new Date(
        //   Date.UTC(today.getFullYear() - 1, 11, 31, 23, 59, 59, 999)
        // );
        endDate = new Date(); // today
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1); // today - 1 year
      }

      const logRecords = await this.getLogRecordsInRange(
        startDate,
        endDate,
        chillerID,
        logsModel,
      );
      console.log("✌️logRecords from helper --->", logRecords);

      let useRunHours = false;
      let runHoursForRange = 0;

      if (logRecords.length > 0) {
        // Replace with actual chiller.getUseRunHours() logic
        // const chillerUsesRunHours = true;
        const chiller = await chillerModel.findById({
          _id: new mongoose.Types.ObjectId(chillerID),
        });

        if (!chiller.useRunHours) {
          // useRunHours = true;
          useRunHours = false;
        } else {
          useRunHours = this.checkRunHoursForRange(logRecords);
        }
        console.log("✌️useRunHours --->", useRunHours);

        if (useRunHours) {
          runHoursForRange = await this.getRunHoursForRange(
            logRecords,
            chillerID,
            startDate,
            logsModel,
          );
        }
        console.log(
          "✌️runHoursForRange from chiller performance --->",
          runHoursForRange,
        );

        perfSummary = await this.getPerformanceForRange(
          logRecords,
          useRunHours,
          startDate,
          logsModel,
          chillerModel,
        );
      } else {
        perfSummary = {
          avgLoss: 0,
          targetCost: 0,
          lossCost: 0,
          actualCost: 0,
          kwhLoss: 0,
          BTULoss: 0,
          CO2: 0,
          avgExcessCondApp: 0,
          avgExcessEvapApp: 0,
          avgOtherLoss: 0,
        };
        runHoursForRange = 0;
      }

      // if (i === 1) {
      //   myStruct = {
      //     perfSummary,
      //     // logRecords,
      //     startDate,
      //     endDate,
      //     useRunHours,
      //   };
      // }
      results[rangeType] = {
        perfSummary,
        startDate,
        endDate,
        useRunHours,
        runHours: runHoursForRange,
      };

      // await this.saveRunHoursForRange(chillerID, i, runHoursForRange);
      // await this.savePerformanceSummary(chillerID, i, perfSummary);
    }

    // console.log('✌️results --->', results);

    const roundedResponse = LogRecordHelper.applyRounding(results);

    return roundedResponse;
  }

  static applyRounding(response: Record<string, any>) {
    const results: Record<string, any> = {};

    for (const [key, entry] of Object.entries(response)) {
      const perfSummary = (entry as any).perfSummary || {};
      const roundedPerfSummary: Record<string, any> = {};

      for (const [field, value] of Object.entries(perfSummary)) {
        if (typeof value === "number") {
          roundedPerfSummary[field] =
            LogRecordHelper.roundToFourDecimals(value);
        } else {
          roundedPerfSummary[field] = value;
        }
      }

      results[key] = {
        ...(entry as any),
        perfSummary: roundedPerfSummary,
      };
    }

    return results;
  }

  static async getLogRecordsInRange(
    startDate: Date,
    endDate: Date,
    chillerID: string,
    logsModel: Model<Logs>,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    console.log("✌️startDate (UTC) --->", start.toISOString());
    console.log("✌️endDate (UTC) --->", end.toISOString());
    console.log("✌️chillerID --->", chillerID);

    // const existingLog = await logsModel.find({ chillerId: chillerID });
    // console.log('✌️existingLog --->', existingLog);

    const result = await logsModel
      .find({
        chillerId: mongoose.isValidObjectId(chillerID)
          ? new mongoose.Types.ObjectId(chillerID)
          : chillerID,
        isDeleted: false,
        // readingDateUTC: {
        //   $gte: start,
        //   $lt: addDays(end, 1), // makes the end date inclusive
        // },
        $expr: {
          $and: [
            { $gte: [{ $toDate: "$readingDateUTC" }, start] },
            { $lt: [{ $toDate: "$readingDateUTC" }, addDays(end, 1)] },
          ],
        },
      })
      .sort({ readingDateUTC: -1 }) // DESC
      .lean();
    console.log("✌️result --->", result);

    return result;
  }

  static checkRunHoursForRange(logRecords: any[]): boolean {
    let useRunHours = true;

    if (logRecords.length === 1 && isNaN(logRecords[0].runHours)) {
      return false;
    }

    for (let idx = 0; idx < logRecords.length - 1; idx++) {
      const current = logRecords[idx];
      const next = logRecords[idx + 1];

      if (isNaN(current.runHours) || isNaN(next.runHours)) {
        useRunHours = false;
        break;
      }

      const validRunHours = this.validateRunHours(
        current.runHours,
        current.readingDateUTC,
        next.runHours,
        next.readingDateUTC,
      );

      if (!validRunHours) {
        useRunHours = false;
        // variables.logRecordBO.setInvalidRunHoursFlag(next.LogID, false) → implement if needed
      }
    }

    return useRunHours;
  }

  static async getRunHoursForRange(
    logRecords: any[],
    chillerID: string,
    startDate: Date,
    logsModel: Model<Logs>,
  ) {
    let runHours = 0;
    const daysBetween = differenceInDays(
      new Date(logRecords[logRecords.length - 1].readingDateUTC),
      new Date(logRecords[0].readingDateUTC),
    );

    const nextEarliestRecord = await this.getNextEarliestRecord(
      startDate,
      chillerID,
      logsModel,
    );
    console.log("✌️nextEarliestRecord --->", nextEarliestRecord);

    if (
      !isNaN(logRecords[0].runHours) &&
      !isNaN(logRecords[logRecords.length - 1].runHours)
    ) {
      if (
        differenceInDays(
          startDate,
          new Date(logRecords[logRecords.length - 1].readingDateUTC),
        ) > 7 ||
        logRecords.length === 1
      ) {
        if (nextEarliestRecord && !isNaN(nextEarliestRecord.runHours)) {
          const daysTillStart = differenceInDays(
            new Date(nextEarliestRecord.readingDateUTC),
            startDate,
          );
          const daysToFirstRecord = differenceInDays(
            new Date(nextEarliestRecord.readingDateUTC),
            new Date(logRecords[logRecords.length - 1].readingDateUTC),
          );
          const dateRatio =
            daysToFirstRecord !== 0 ? daysTillStart / daysToFirstRecord : 0;
          const startRunHours =
            (logRecords[logRecords.length - 1].runHours -
              nextEarliestRecord.runHours) *
              dateRatio +
            nextEarliestRecord.runHours;
          runHours = Math.abs(logRecords[0].runHours - startRunHours);
        } else {
          const avgRunHoursPerDay =
            daysBetween !== 0
              ? Math.abs(
                  logRecords[logRecords.length - 1].runHours -
                    logRecords[0].runHours,
                ) / daysBetween
              : 0;
          let startRunHours =
            logRecords[logRecords.length - 1].runHours -
            differenceInDays(
              startDate,
              new Date(logRecords[logRecords.length - 1].readingDateUTC),
            ) *
              avgRunHoursPerDay;
          if (startRunHours < 0) startRunHours = 0;
          runHours = Math.abs(logRecords[0].runHours - startRunHours);
        }
      } else {
        runHours = Math.abs(
          logRecords[logRecords.length - 1].runHours - logRecords[0].runHours,
        );
      }
    }

    return runHours;
  }

  static async getNextEarliestRecord(
    endDate: Date,
    chillerID: string,
    logsModel: Model<Logs>,
  ) {
    const endDateISO = new Date(endDate).toISOString();

    const result = await logsModel
      .findOne({
        chillerId: new mongoose.Types.ObjectId(chillerID),
        readingDateUTC: { $lte: endDateISO },
      })
      .sort({ readingDateUTC: -1 }) // DESC to get the most recent before or equal to endDate
      .lean();

    return result || null;
  }

  static async getPerformanceForRange(
    logRecords: Logs[],
    useRunHours: boolean,
    startDate: Date,
    logsModel: Model<Logs>,
    chillerModel: Model<Chiller>,
  ) {
    const avgEnergyCost = this.getAverageEnergyCostForRange(logRecords);
    console.log("✌️avgEnergyCost --->", avgEnergyCost);
    const chiller = await chillerModel.findOne({
      _id: new mongoose.Types.ObjectId(logRecords[0].chillerId),
    });

    let averages;
    // = this.getAveragesForRange(logRecords, useRunHours);
    if (chiller.unit == MEASUREMENT_UNITS.English) {
      averages = this.getAveragesForRange(logRecords, useRunHours);
    } else if (chiller.unit == MEASUREMENT_UNITS.SIMetric) {
      averages = this.getAveragesForRange(logRecords, useRunHours, {
        metricMode: true,
      });
    }
    console.log("✌️averages --->", averages);

    // const chiller = { isMetric: false, isSteam: false }; // Replace with actual chiller object
    // console.log('✌️chiller --->', chiller);

    const performance: any = {
      avgLoss: averages.avgLoss,
      avgOtherLoss: averages.avgOtherLoss,
      avgExcessCondApp: averages.avgExcessCondApp,
      avgExcessEvapApp: averages.avgExcessEvapApp,
      targetCost: await this.getTargetCostForRange(
        chiller,
        logRecords,
        useRunHours,
        startDate,
        logsModel,
      ),
    };

    const targetCost = await performance.targetCost;

    performance.lossCost = performance.avgLoss * targetCost * 0.01;
    performance.actualCost = targetCost + performance.lossCost;

    if (chiller.unit != MEASUREMENT_UNITS.SIMetric && avgEnergyCost !== 0) {
      performance.kwhLoss = performance.lossCost / avgEnergyCost;
      performance.BTULoss = performance.kwhLoss * 3412.12;
      performance.CO2 = (performance.kwhLoss * chiller?.emissionFactor) / 2000;
    } else {
      performance.kwhLoss = 0;
      performance.BTULoss = 0;
      performance.CO2 = 0;
    }

    return performance;
  }

  static getAverageEnergyCostForRange(logRecords: any[]): number {
    if (!logRecords.length) return 0;
    const sum = logRecords.reduce((acc, r) => acc + (r.energyCost || 0), 0);
    return sum / logRecords.length;
  }

  // static getAveragesForRange(logRecords: any[], useRunHours: boolean) {
  //   let totalLoss = 0,
  //     totalOtherLoss = 0,
  //     totalExcessCondApp = 0,
  //     totalExcessEvapApp = 0;

  //   if (!logRecords || logRecords.length === 0) {
  //     return {
  //       avgLoss: 0,
  //       avgOtherLoss: 0,
  //       avgExcessCondApp: 0,
  //       avgExcessEvapApp: 0,
  //     };
  //   }

  //   if (logRecords.length === 1) {
  //     return {
  //       avgLoss: logRecords[0].totalLoss,
  //       avgOtherLoss:
  //         logRecords[0].condInletLoss +
  //         logRecords[0].deltaLoss +
  //         logRecords[0].evapTempLoss,
  //       avgExcessCondApp: logRecords[0].condAppVariance,
  //       avgExcessEvapApp: logRecords[0].evapAppVariance,
  //     };
  //   }

  //   for (let idx = 0; idx < logRecords.length - 1; idx++) {
  //     const current = logRecords[idx];
  //     const next = logRecords[idx + 1];

  //     let intervalBetweenReadings;
  //     console.log('✌️current?.runHours --->', current?.runHours);
  //     console.log('✌️next?.runHours --->', next?.runHours);
  //     if (useRunHours) {
  //       intervalBetweenReadings = Math.abs(
  //         // logRecords[idx + 1].runHours - logRecords[idx].runHours
  //         (next?.runHours ?? 0) - (current?.runHours ?? 0)
  //       );
  //     } else {
  //       intervalBetweenReadings = Math.abs(
  //         differenceInHours(
  //           // logRecords[idx + 1].readingDateUTC,
  //           // logRecords[idx].readingDateUTC
  //           new Date(next?.readingDateUTC),
  //           new Date(current?.readingDateUTC)
  //         )
  //       );
  //     }

  //     console.log('✌️intervalBetweenReadings --->', intervalBetweenReadings);
  //     if (intervalBetweenReadings === 0) continue;

  //     // const lossVals = [
  //     //   logRecords[idx].totalLoss,
  //     //   logRecords[idx + 1].totalLoss,
  //     // ].sort();
  //     const lossVals = [current?.totalLoss || 0, next?.totalLoss || 0].sort();
  //     totalLoss +=
  //       this.trapezoidArea(lossVals, intervalBetweenReadings) /
  //       intervalBetweenReadings;

  //     // const otherLossVals = [
  //     //   logRecords[idx].deltaLoss +
  //     //     logRecords[idx].evapTempLoss +
  //     //     logRecords[idx].condInletLoss,
  //     //   logRecords[idx + 1].deltaLoss +
  //     //     logRecords[idx + 1].evapTempLoss +
  //     //     logRecords[idx + 1].condInletLoss,
  //     // ].sort();
  //     const otherLossVals = [
  //       (current?.deltaLoss || 0) +
  //         (current?.evapTempLoss || 0) +
  //         (current?.condInletLoss || 0),
  //       (next?.deltaLoss || 0) +
  //         (next?.evapTempLoss || 0) +
  //         (next?.condInletLoss || 0),
  //     ].sort();
  //     totalOtherLoss +=
  //       this.trapezoidArea(otherLossVals, intervalBetweenReadings) /
  //       intervalBetweenReadings;

  //     // const condAppVals = [
  //     //   logRecords[idx].condAppVariance,
  //     //   logRecords[idx + 1].condAppVariance,
  //     // ].sort();
  //     const condAppVals = [
  //       current?.condAppVariance || 0,
  //       next?.condAppVariance || 0,
  //     ].sort();
  //     totalExcessCondApp +=
  //       this.trapezoidArea(condAppVals, intervalBetweenReadings) /
  //       intervalBetweenReadings;

  //     // const evapAppVals = [
  //     //   logRecords[idx].evapAppVariance,
  //     //   logRecords[idx + 1].evapAppVariance,
  //     // ].sort();
  //     const evapAppVals = [
  //       current?.evapAppVariance || 0,
  //       next?.evapAppVariance || 0,
  //     ].sort();
  //     totalExcessEvapApp +=
  //       this.trapezoidArea(evapAppVals, intervalBetweenReadings) /
  //       intervalBetweenReadings;
  //   }

  //   const divisor = logRecords.length - 1;
  //   return {
  //     avgLoss: totalLoss / divisor,
  //     avgOtherLoss: totalOtherLoss / divisor,
  //     avgExcessCondApp: totalExcessCondApp / divisor,
  //     avgExcessEvapApp: totalExcessEvapApp / divisor,
  //   };
  // }

  // Working function do not delete.
  // static getAveragesForRange(logRecords: any[], useRunHours: boolean) {
  //   let totalLoss = 0;
  //   let totalOtherLoss = 0;
  //   let totalExcessCondApp = 0;
  //   let totalExcessEvapApp = 0;

  //   if (!logRecords || logRecords.length === 0) {
  //     return {
  //       avgLoss: 0,
  //       avgOtherLoss: 0,
  //       avgExcessCondApp: 0,
  //       avgExcessEvapApp: 0,
  //     };
  //   }

  //   if (logRecords.length === 1) {
  //     const r = logRecords[0];
  //     return {
  //       avgLoss: r.totalLoss ?? 0,
  //       avgOtherLoss:
  //         (r.condInletLoss ?? 0) + (r.deltaLoss ?? 0) + (r.evapTempLoss ?? 0),
  //       avgExcessCondApp: r.condAppVariance ?? 0,
  //       avgExcessEvapApp: r.evapAppVariance ?? 0,
  //     };
  //   }

  //   const intervals = logRecords.length - 1;

  //   for (let idx = 0; idx < logRecords.length - 1; idx++) {
  //     const current = logRecords[idx];
  //     const next = logRecords[idx + 1];

  //     let intervalBetweenReadings = 1;

  //     if (useRunHours) {
  //       intervalBetweenReadings = Math.abs(
  //         (next?.runHours ?? 0) - (current?.runHours ?? 0),
  //       );
  //     } else {
  //       const dCurr = dayjs(current?.readingDateUTC);
  //       const dNext = dayjs(next?.readingDateUTC);

  //       intervalBetweenReadings = Math.abs(dNext.diff(dCurr, "hour"));

  //       // ✅ ColdFusion safeguard: if still 0, treat as 1
  //       if (intervalBetweenReadings === 0) {
  //         intervalBetweenReadings = 1;
  //       }
  //     }

  //     // --- avg total loss ---
  //     const a = current?.totalLoss ?? 0;
  //     const b = next?.totalLoss ?? 0;
  //     const avgLossForInterval = (Math.min(a, b) + Math.max(a, b)) / 2;
  //     totalLoss += avgLossForInterval;

  //     // --- avg other loss ---
  //     const currentOther =
  //       (current?.deltaLoss ?? 0) +
  //       (current?.evapTempLoss ?? 0) +
  //       (current?.condInletLoss ?? 0);
  //     const nextOther =
  //       (next?.deltaLoss ?? 0) +
  //       (next?.evapTempLoss ?? 0) +
  //       (next?.condInletLoss ?? 0);
  //     const avgOtherForInterval =
  //       (Math.min(currentOther, nextOther) +
  //         Math.max(currentOther, nextOther)) /
  //       2;
  //     totalOtherLoss += avgOtherForInterval;

  //     // --- avg cond variance ---
  //     const avgCondForInterval =
  //       (Math.min(current?.condAppVariance ?? 0, next?.condAppVariance ?? 0) +
  //         Math.max(current?.condAppVariance ?? 0, next?.condAppVariance ?? 0)) /
  //       2;
  //     totalExcessCondApp += avgCondForInterval;

  //     // --- avg evap variance ---
  //     const avgEvapForInterval =
  //       (Math.min(current?.evapAppVariance ?? 0, next?.evapAppVariance ?? 0) +
  //         Math.max(current?.evapAppVariance ?? 0, next?.evapAppVariance ?? 0)) /
  //       2;
  //     totalExcessEvapApp += avgEvapForInterval;
  //   }

  //   return {
  //     avgLoss: intervals > 0 ? totalLoss / intervals : 0,
  //     avgOtherLoss: intervals > 0 ? totalOtherLoss / intervals : 0,
  //     avgExcessCondApp: intervals > 0 ? totalExcessCondApp / intervals : 0,
  //     avgExcessEvapApp: intervals > 0 ? totalExcessEvapApp / intervals : 0,
  //   };
  // }

  static getAveragesForRange(
    logRecords: any[],
    useRunHours: boolean,
    options?: { metricMode?: boolean }, // ← pass {metricMode: true} for SI/Metric chillers
  ) {
    const metricMode = options?.metricMode === true;

    if (!logRecords || logRecords.length === 0) {
      return {
        avgLoss: 0,
        avgOtherLoss: 0,
        avgExcessCondApp: 0,
        avgExcessEvapApp: 0,
      };
    }

    // For metric mode: with a single reading, there’s no interval, so return zeros.
    // For English mode: preserve your original single-record behaviour.
    if (logRecords.length === 1) {
      if (metricMode) {
        return {
          avgLoss: 0,
          avgOtherLoss: 0,
          avgExcessCondApp: 0,
          avgExcessEvapApp: 0,
        };
      }
      const r = logRecords[0];
      return {
        avgLoss: r.totalLoss ?? 0,
        avgOtherLoss:
          (r.condInletLoss ?? 0) + (r.deltaLoss ?? 0) + (r.evapTempLoss ?? 0),
        avgExcessCondApp: r.condAppVariance ?? 0,
        avgExcessEvapApp: r.evapAppVariance ?? 0,
      };
    }

    const intervals = logRecords.length - 1;

    // --- English (original) path: DO NOT TOUCH EXISTING LOGIC ---
    if (!metricMode) {
      let totalLoss = 0;
      let totalOtherLoss = 0;
      let totalExcessCondApp = 0;
      let totalExcessEvapApp = 0;

      for (let idx = 0; idx < logRecords.length - 1; idx++) {
        const current = logRecords[idx];
        const next = logRecords[idx + 1];

        let intervalBetweenReadings = 1;

        if (useRunHours) {
          intervalBetweenReadings = Math.abs(
            (next?.runHours ?? 0) - (current?.runHours ?? 0),
          );
        } else {
          const dCurr = dayjs(current?.readingDateUTC);
          const dNext = dayjs(next?.readingDateUTC);
          intervalBetweenReadings = Math.abs(dNext.diff(dCurr, "hour"));

          // ColdFusion safeguard kept: never allow 0
          if (intervalBetweenReadings === 0) intervalBetweenReadings = 1;
        }

        // avg total loss (original midpoint)
        const a = current?.totalLoss ?? 0;
        const b = next?.totalLoss ?? 0;
        const avgLossForInterval = (Math.min(a, b) + Math.max(a, b)) / 2;
        totalLoss += avgLossForInterval;

        // avg other loss (original midpoint)
        const currentOther =
          (current?.deltaLoss ?? 0) +
          (current?.evapTempLoss ?? 0) +
          (current?.condInletLoss ?? 0);
        const nextOther =
          (next?.deltaLoss ?? 0) +
          (next?.evapTempLoss ?? 0) +
          (next?.condInletLoss ?? 0);
        const avgOtherForInterval =
          (Math.min(currentOther, nextOther) +
            Math.max(currentOther, nextOther)) /
          2;
        totalOtherLoss += avgOtherForInterval;

        // avg cond variance (original midpoint)
        const avgCondForInterval =
          (Math.min(current?.condAppVariance ?? 0, next?.condAppVariance ?? 0) +
            Math.max(
              current?.condAppVariance ?? 0,
              next?.condAppVariance ?? 0,
            )) /
          2;
        totalExcessCondApp += avgCondForInterval;

        // avg evap variance (original midpoint)
        const avgEvapForInterval =
          (Math.min(current?.evapAppVariance ?? 0, next?.evapAppVariance ?? 0) +
            Math.max(
              current?.evapAppVariance ?? 0,
              next?.evapAppVariance ?? 0,
            )) /
          2;
        totalExcessEvapApp += avgEvapForInterval;
      }

      return {
        avgLoss: intervals > 0 ? totalLoss / intervals : 0,
        avgOtherLoss: intervals > 0 ? totalOtherLoss / intervals : 0,
        avgExcessCondApp: intervals > 0 ? totalExcessCondApp / intervals : 0,
        avgExcessEvapApp: intervals > 0 ? totalExcessEvapApp / intervals : 0,
      };
    }

    // --- SI/Metric path: average of CHANGES between points ---
    let sumDeltaLoss = 0;
    let sumDeltaOtherLoss = 0;
    let sumDeltaCondVar = 0;
    let sumDeltaEvapVar = 0;

    for (let idx = 0; idx < logRecords.length - 1; idx++) {
      const current = logRecords[idx];
      const next = logRecords[idx + 1];

      // Keep the same interval calc/guard as original (for compatibility)
      let intervalBetweenReadings = 1;
      if (useRunHours) {
        intervalBetweenReadings = Math.abs(
          (next?.runHours ?? 0) - (current?.runHours ?? 0),
        );
      } else {
        const dCurr = dayjs(current?.readingDateUTC);
        const dNext = dayjs(next?.readingDateUTC);
        intervalBetweenReadings = Math.abs(dNext.diff(dCurr, "hour"));
        if (intervalBetweenReadings === 0) intervalBetweenReadings = 1;
      }

      // totalLoss: use change, so constant values ⇒ 0 contribution
      const a = current?.totalLoss ?? 0;
      const b = next?.totalLoss ?? 0;
      const deltaLoss = b - a;
      sumDeltaLoss += deltaLoss;

      // other loss (condInlet + delta + evapTemp): also use change
      const currOther =
        (current?.deltaLoss ?? 0) +
        (current?.evapTempLoss ?? 0) +
        (current?.condInletLoss ?? 0);
      const nextOther =
        (next?.deltaLoss ?? 0) +
        (next?.evapTempLoss ?? 0) +
        (next?.condInletLoss ?? 0);
      sumDeltaOtherLoss += nextOther - currOther;

      // condenser approach variance: change
      const currCondVar = current?.condAppVariance ?? 0;
      const nextCondVar = next?.condAppVariance ?? 0;
      sumDeltaCondVar += nextCondVar - currCondVar;

      // evaporator approach variance: change
      const currEvapVar = current?.evapAppVariance ?? 0;
      const nextEvapVar = next?.evapAppVariance ?? 0;
      sumDeltaEvapVar += nextEvapVar - currEvapVar;
    }

    // Average across intervals
    return {
      avgLoss: intervals > 0 ? sumDeltaLoss / intervals : 0,
      avgOtherLoss: intervals > 0 ? sumDeltaOtherLoss / intervals : 0,
      avgExcessCondApp: intervals > 0 ? sumDeltaCondVar / intervals : 0,
      avgExcessEvapApp: intervals > 0 ? sumDeltaEvapVar / intervals : 0,
    };
  }

  static trapezoidArea(vals: number[], interval: number) {
    const [lesserY, greaterY] = vals;
    const rectArea = interval * lesserY;
    const triangleArea = (interval * (greaterY - lesserY)) / 2;
    return rectArea + triangleArea;
  }

  static async getTargetCostForRange(
    chiller: any, // object with getChillerID(), getHoursPerWeek(), getWeeksPerYear()
    logRecords: any[], // array of log entries with ReadingDate
    useRunHours: boolean,
    startDate: Date,
    logsModel: Model<Logs>,
  ): Promise<number> {
    let avgEnergyCost = 0;
    let hourlyTargetCost = 0;
    let targetCost = 0;
    let daysInRange = 0;
    let runHours = 0;

    // Equivalent to CF getAverageEnergyCostForRange
    avgEnergyCost = this.getAverageEnergyCostForRange(logRecords);

    // Equivalent to variables.logCalc.getTargetCostPerHour
    hourlyTargetCost = this.getTargetCostPerHour(chiller, avgEnergyCost);

    if (useRunHours) {
      runHours = await this.getRunHoursForRange(
        logRecords,
        chiller._id,
        startDate,
        logsModel,
      );
      targetCost = runHours * hourlyTargetCost;
    }

    if (!useRunHours || runHours === 0) {
      if (!logRecords.length) return 0;

      // logRecords[0] is CF's logRecords.ReadingDate[1]
      daysInRange = Math.abs(
        differenceInCalendarDays(
          new Date(logRecords[0].readingDateUTC),
          startDate,
        ),
      );

      targetCost =
        hourlyTargetCost *
        chiller.weeklyHours *
        chiller.weeksPerYear *
        (daysInRange / 365);
    }

    return targetCost;
  }

  /**
   * Calculate the target cost per hour for a chiller
   */
  static getTargetCostPerHour(chiller: any, energyCost = 0): number {
    let targetCost = 0;

    if (energyCost) {
      if (chiller.unit == MEASUREMENT_UNITS.SIMetric) {
        targetCost =
          (1 / chiller.efficiencyRating) *
          energyCost *
          chiller.tons *
          chiller.avgLoadProfile *
          0.01;
      } else {
        targetCost =
          chiller.efficiencyRating *
          energyCost *
          chiller.tons *
          chiller.avgLoadProfile *
          0.01;
      }
    } else {
      if (chiller.unit == MEASUREMENT_UNITS.SIMetric) {
        targetCost =
          (1 / chiller.efficiencyRating) *
          chiller.energyCost *
          chiller.tons *
          chiller.avgLoadProfile *
          0.01;
      } else {
        targetCost =
          chiller.efficiencyRating *
          chiller.energyCost *
          chiller.tons *
          chiller.avgLoadProfile *
          0.01;
      }
    }

    return targetCost;
  }

  /**
   * Get Purge Time Summary for a given Chiller
   */
  static async getPurgeTimeSummaryForChiller(
    chillerId: number,
    logsModel: Model<Logs>,
  ) {
    const purgeTimeSummary: { "7DayAvg": number; "30DayAvg": number } = {
      "7DayAvg": 0,
      "30DayAvg": 0,
    };

    const mostRecentPurgeRecord = await this.getLastPurgeTimeBeforeDate(
      chillerId,
      new Date(),
      logsModel,
    );
    // console.log("✌️mostRecentPurgeRecord --->", mostRecentPurgeRecord);

    if (mostRecentPurgeRecord?.purgeTimeMin > 0) {
      // --- 7 Day Average
      const weekComparisonRecord = await this.getPurgeComparisonRecord(
        chillerId,
        new Date(mostRecentPurgeRecord.readingDateUTC),
        7,
        2,
        logsModel,
      );

      if (weekComparisonRecord?.purgeTimeMin > 0) {
        const formattedMostRecentPurgeRecord = {
          ...mostRecentPurgeRecord,
          readingDateUTC: new Date(mostRecentPurgeRecord.readingDateUTC),
        };

        purgeTimeSummary["7DayAvg"] = this.getPurgeTimeAverage(
          weekComparisonRecord,
          formattedMostRecentPurgeRecord,
        );
      }

      // --- 30 Day Average
      const monthComparisonRecord = await this.getPurgeComparisonRecord(
        chillerId,
        new Date(mostRecentPurgeRecord.readingDateUTC),
        30,
        10,
        logsModel,
      );

      if (monthComparisonRecord?.purgeTimeMin > 0) {
        const formattedMostRecentPurgeRecord = {
          ...mostRecentPurgeRecord,
          readingDateUTC: new Date(mostRecentPurgeRecord.readingDateUTC),
        };
        purgeTimeSummary["30DayAvg"] = this.getPurgeTimeAverage(
          monthComparisonRecord,
          formattedMostRecentPurgeRecord,
        );
      }
    }

    return purgeTimeSummary;
  }

  /**
   * Get last purge time before marker date
   */
  static async getLastPurgeTimeBeforeDate(
    chillerId: number,
    markerDate: Date,
    logsModel: Model<Logs>,
  ) {
    const record = await logsModel
      .findOne({
        chillerId: chillerId,
        purgeTimeMin: { $gt: 0 },
        readingDateUTC: { $lte: markerDate },
      })
      .sort({ readingDateUTC: -1 })
      .select("readingDateUTC purgeTimeMin")
      .lean();

    return (
      record || {
        readingDateUTC: new Date(),
        purgeTimeMin: 0,
      }
    );
  }

  /**
   * Get purge comparison record around a time window
   */
  static async getPurgeComparisonRecord(
    chillerId: number,
    mostRecentDate: Date,
    daysBack: number,
    variance: number,
    logsModel: Model<Logs>,
  ) {
    const medianDate = new Date(mostRecentDate);
    medianDate.setDate(medianDate.getDate() - daysBack);

    const startDate = new Date(mostRecentDate);
    startDate.setDate(startDate.getDate() - (daysBack + variance));

    const endDate = new Date(mostRecentDate);
    endDate.setDate(endDate.getDate() - (daysBack - variance));

    const purgeRecords = await this.getPurgeRecordsInRange(
      chillerId,
      startDate,
      endDate,
      logsModel,
    );

    let purgeComparisonRecord = {
      readingDateUTC: new Date(),
      purgeTimeMin: 0,
    };

    if (purgeRecords.length > 0) {
      let stop = false;

      for (let i = 0; i <= variance; i++) {
        if (stop) break;

        for (const rec of purgeRecords) {
          const dateDiffDays = Math.abs(
            Math.floor(
              (new Date(rec.readingDateUTC).getTime() - medianDate.getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          );

          if (dateDiffDays <= i) {
            purgeComparisonRecord = {
              readingDateUTC: new Date(rec.readingDateUTC),
              purgeTimeMin: rec.purgeTimeMin,
            };
            stop = true;
            break;
          }
        }
      }
    }

    return purgeComparisonRecord;
  }

  /**
   * Get purge records in a date range
   */
  static async getPurgeRecordsInRange(
    chillerId: number,
    startDate: Date,
    endDate: Date,
    logsModel: Model<Logs>,
  ) {
    return logsModel
      .find({
        chillerId: chillerId,
        readingDateUTC: { $gte: startDate, $lte: endDate },
        purgeTimeMin: { $gt: 0 },
      })
      .sort({ readingDateUTC: -1 })
      .select("readingDateUTC purgeTimeMin")
      .lean();
  }

  /**
   * Calculate purge time average
   */
  static getPurgeTimeAverage(
    startStruct: { purgeTimeMin: number; readingDateUTC: Date },
    recentStruct: { purgeTimeMin: number; readingDateUTC: Date },
  ): number {
    const purgeTimeDiff = recentStruct.purgeTimeMin - startStruct.purgeTimeMin;

    const hourDiff =
      (recentStruct.readingDateUTC.getTime() -
        startStruct.readingDateUTC.getTime()) /
      (1000 * 60 * 60);

    if (hourDiff <= 0) return 0;

    return Math.round((purgeTimeDiff / hourDiff) * 24);
  }

  /**
   * Get Approach Alerts (condApproach & evapApproach variances >= 2 in last 7 days)
   */
  static async getApproachAlerts(
    chillerList: any[],
    logsModel: Model<Logs>,
  ): Promise<{
    condAlerts: any[];
    evapAlerts: any[];
  }> {
    if (!chillerList || chillerList.length === 0) {
      return { condAlerts: [], evapAlerts: [] };
    }

    const sevenDaysAgoUTC = new Date();
    sevenDaysAgoUTC.setUTCDate(sevenDaysAgoUTC.getUTCDate() - 30);
    console.log("✌️sevenDaysAgoUTC --->", sevenDaysAgoUTC);

    const chillerIds = chillerList.map((c) =>
      typeof c._id === "string" ? new mongoose.Types.ObjectId(c._id) : c._id,
    );
    console.log("✌️chillerIds --->", chillerIds);

    // Step 1: Get alerts from MongoDB (similar to the SQL query)
    const alerts = await logsModel.aggregate([
      {
        $addFields: {
          readingDateUTC: { $toDate: "$readingDateUTC" },
        },
      },
      {
        $match: {
          chillerId: {
            $in: chillerIds,
          },
          $or: [
            { condAppVariance: { $gte: 2 } },
            { evapAppVariance: { $gte: 2 } },
          ],
          readingDateUTC: {
            $gte: sevenDaysAgoUTC,
          },
        },
      },
      {
        $lookup: {
          from: TABLE_NAMES.CHILLER,
          localField: "chillerId",
          foreignField: "_id",
          as: "chiller",
        },
      },
      { $unwind: "$chiller" },
      {
        $lookup: {
          from: TABLE_NAMES.FACILITY,
          localField: "chiller.facilityId",
          foreignField: "_id",
          as: "facility",
        },
      },
      { $unwind: "$facility" },
      {
        $project: {
          logId: "$_id",
          condAppVariance: 1,
          evapAppVariance: 1,
          evapApproach: 1,
          calculatedEvapRefrigTemp: 1,
          condApproach: 1,
          calculatedCondRefrigTemp: 1,
          actualLoad: 1,
          readingDate: 1,
          readingDateUTC: 1,
          chillerId: 1,
          facilityName: "$facility.name",
          ChillerNo: "$chiller.ChillerNo",
          ChillerNumber: "$chiller.ChillerNumber",
        },
      },
      {
        $sort: {
          facilityName: 1,
          chillerId: 1,
          ChillerNo: 1,
          ChillerNumber: 1,
          condAppVariance: -1,
          evapAppVariance: -1,
        },
      },
    ]);
    console.log("✌️alerts --->", alerts);

    // Step 2: Process alerts similar to CF loops
    const finalAlerts = { condAlerts: [], evapAlerts: [] };

    const grouped = alerts.reduce(
      (acc, a) => {
        (acc[a.chillerId] = acc[a.chillerId] || []).push(a);
        return acc;
      },
      {} as Record<string, any[]>,
    );
    console.log("✌️grouped --->", grouped);

    for (const chillerId of Object.keys(grouped)) {
      const chillerAlerts = grouped[chillerId];

      let condAlert = null;
      let evapAlert = null;

      for (const alert of chillerAlerts) {
        // Initialize condAlert & evapAlert
        if (!condAlert) condAlert = { ...alert };
        if (!evapAlert) evapAlert = { ...alert };

        // Update condAlert if stronger variance
        if (
          alert.condAppVariance > condAlert.condAppVariance &&
          alert.condAppVariance >= 2
        ) {
          condAlert = { ...alert };
        }

        // Update evapAlert if stronger variance
        if (
          alert.evapAppVariance > evapAlert.evapAppVariance &&
          alert.evapAppVariance >= 2
        ) {
          evapAlert = { ...alert };
        }
      }

      if (condAlert?.condAppVariance >= 2) {
        finalAlerts.condAlerts.push(condAlert);
      }
      if (evapAlert?.evapAppVariance >= 2) {
        finalAlerts.evapAlerts.push(evapAlert);
      }
    }

    return finalAlerts;
  }

  static async createHistPerformanceSummaryForCompany(
    companyId: string,
    year: number,
    quarter = 0,
    month = 0,
    chillerModel: Model<Chiller>,
    logsModel: Model<Logs>,
    histChillerModel: Model<HistChillerPerformance>,
    histCompanyPerformanceModel: Model<HistCompanyPerformance>,
    histFacilityPerformanceModel: Model<HistFacilityPerformance>,
  ): Promise<void> {
    const companyChillers = await this.getCompanyChillers(
      companyId,
      chillerModel,
    );

    const allFacilityIds = [];
    companyChillers.map((c) => {
      allFacilityIds.push(c.facilityId);
    });

    const locationIdList = this.removeDuplicateFacilityIds(allFacilityIds);

    let companySuccess = false;

    const perfSummary: any = {
      averageLoss: 0,
      targetCost: 0,
      lossCost: 0,
      actualCost: 0,
      kwhLoss: 0,
      btuLoss: 0,
      co2: 0,
      avgExcessCondApp: 0,
      avgExcessEvapApp: 0,
      avgOtherLoss: 0,
    };

    if (locationIdList.length > 0) {
      let tempLossTotal = 0;
      let tempExcessCondAppTotal = 0;
      let tempExcessEvapAppTotal = 0;
      let tempOtherLossTotal = 0;

      for (const locId of locationIdList) {
        const locationSuccess =
          await this.createHistPerformanceSummaryForLocation(
            locId,
            year,
            quarter,
            month,
            chillerModel,
            logsModel,
            histChillerModel,
            histFacilityPerformanceModel,
            histChillerModel,
          );

        if (locationSuccess) {
          companySuccess = true;
          const locPerfSummary =
            await this.retrieveHistPerformanceSummaryForLocation(
              locId,
              year,
              quarter,
              month,
              histFacilityPerformanceModel,
            );

          tempLossTotal += locPerfSummary.averageLoss;
          tempOtherLossTotal += locPerfSummary.avgOtherLoss;
          tempExcessCondAppTotal += locPerfSummary.avgExcessCondApp;
          tempExcessEvapAppTotal += locPerfSummary.avgExcessEvapApp;

          perfSummary.targetCost += locPerfSummary.targetCost;
          perfSummary.lossCost += locPerfSummary.lossCost;
          perfSummary.actualCost += locPerfSummary.actualCost;
          perfSummary.kwhLoss += locPerfSummary.kwhLoss;
          perfSummary.btuLoss += locPerfSummary.btuLoss;
          perfSummary.co2 += locPerfSummary.co2;

          perfSummary.averageLoss = tempLossTotal / locationIdList.length;
          perfSummary.avgExcessCondApp =
            tempExcessCondAppTotal / locationIdList.length;
          perfSummary.avgExcessEvapApp =
            tempExcessEvapAppTotal / locationIdList.length;
          perfSummary.avgOtherLoss = tempOtherLossTotal / locationIdList.length;
        }
      }

      if (companySuccess) {
        await this.saveHistCompanyPerfSummary(
          companyId,
          year,
          quarter,
          month,
          perfSummary,
          histCompanyPerformanceModel,
        );
      }
    }
  }

  /** === Equivalent of getCompanyChillers === */
  static async getCompanyChillers(
    companyId: string,
    chillerModel: Model<Chiller>,
  ) {
    return chillerModel
      .find({
        status: ChillerStatus.Active,
        companyId: new mongoose.Types.ObjectId(companyId),
      })
      .populate({
        path: "facilityId",
        match: {
          companyId: new mongoose.Types.ObjectId(companyId),
          isActive: true,
        },
      })
      .sort({ facilityId: 1, _id: 1 })
      .exec();
  }

  /** === Equivalent of createHistPerformanceSummaryForLocation === */
  static async createHistPerformanceSummaryForLocation(
    locationId: string,
    year: number,
    quarter = 0,
    month = 0,
    chillerModel: Model<Chiller>,
    logsModel: Model<Logs>,
    histChillerModel: Model<HistChillerPerformance>,
    histFacilityPerformanceModel: Model<HistFacilityPerformance>,
    histChillerPerformanceModel: Model<HistChillerPerformance>,
  ): Promise<boolean> {
    const locChillers = await this.getLocationChillers(
      locationId,
      chillerModel,
    );
    if (!locChillers.length) return false;

    const chillerList = locChillers.map((c) => c._id.toString());
    let locationSuccess = false;

    const perfSummary: any = {
      avgLoss: 0,
      targetCost: 0,
      lossCost: 0,
      actualCost: 0,
      kwhLoss: 0,
      btuLoss: 0,
      co2: 0,
      avgExcessCondApp: 0,
      avgExcessEvapApp: 0,
      avgOtherLoss: 0,
    };

    let tempLossTotal = 0,
      tempOtherLossTotal = 0,
      tempExcessCondAppTotal = 0,
      tempExcessEvapAppTotal = 0;

    for (const chillerId of chillerList) {
      const chillerSuccess = await this.createHistPerformanceSummaryForChiller(
        chillerId,
        year,
        quarter,
        month,
        logsModel,
        chillerModel,
        histChillerModel,
      );

      if (chillerSuccess) {
        locationSuccess = true;
        const chillerPerfSummary =
          await this.retrieveHistPerformanceSummaryForChiller(
            chillerId,
            year,
            quarter,
            month,
            histChillerPerformanceModel,
          );

        tempLossTotal += chillerPerfSummary.averageLoss;
        tempOtherLossTotal += chillerPerfSummary.avgOtherLoss;
        tempExcessCondAppTotal += chillerPerfSummary.avgExcessCondApp;
        tempExcessEvapAppTotal += chillerPerfSummary.avgExcessEvapApp;

        perfSummary.targetCost += chillerPerfSummary.targetCost;
        perfSummary.lossCost += chillerPerfSummary.lossCost;
        perfSummary.actualCost += chillerPerfSummary.actualCost;
        perfSummary.kwhLoss += chillerPerfSummary.kwhLoss;
        perfSummary.btuLoss += chillerPerfSummary.btuLoss;
        perfSummary.co2 += chillerPerfSummary.co2;

        perfSummary.avgLoss = tempLossTotal / chillerList.length;
        perfSummary.avgExcessCondApp =
          tempExcessCondAppTotal / chillerList.length;
        perfSummary.avgExcessEvapApp =
          tempExcessEvapAppTotal / chillerList.length;
        perfSummary.avgOtherLoss = tempOtherLossTotal / chillerList.length;
      }
    }

    if (locationSuccess) {
      await this.saveHistLocationPerfSummary(
        locationId,
        year,
        quarter,
        month,
        perfSummary,
        histFacilityPerformanceModel,
      );
    }

    return locationSuccess;
  }

  /** === Equivalent of getLocationChillers === */
  static async getLocationChillers(
    locationId: string,
    chillerModel: Model<Chiller>,
  ) {
    return chillerModel
      .find({
        facilityId: new mongoose.Types.ObjectId(locationId),
        status: ChillerStatus.Active,
      })
      .exec();
  }

  /** === Equivalent of createHistPerformanceSummaryForChiller === */
  static async createHistPerformanceSummaryForChiller(
    chillerId: string,
    year: number,
    quarter = 0,
    month = 0,
    logsModel: Model<Logs>,
    chillerModel: Model<Chiller>,
    histChillerModel: Model<HistChillerPerformance>,
  ): Promise<boolean> {
    const dateRange = this.buildDateRange(year, quarter, month);
    const logRecords = await this.getLogRecordsInRange(
      dateRange.startDate,
      dateRange.endDate,
      chillerId,
      logsModel,
    );
    console.log("✌️logRecords --->", logRecords);

    if (!logRecords.length) return false;

    let useRunHours = true;
    const chiller = await chillerModel.findById(chillerId).exec();

    if (!chiller.useRunHours) {
      useRunHours = false;
    } else {
      useRunHours = this.checkRunHoursForRange(logRecords);
    }
    console.log("✌️useRunHours --->", useRunHours);

    const perfSummary = await this.getPerformanceForRange(
      logRecords,
      useRunHours,
      dateRange.startDate,
      logsModel,
      chillerModel,
    );

    await this.saveHistPerformanceSummary(
      chillerId,
      year,
      quarter,
      month,
      perfSummary,
      histChillerModel,
    );

    return true;
  }

  /** === Equivalent of saveHistPerformanceSummary === */
  static async saveHistPerformanceSummary(
    chillerId: string,
    year: number,
    quarter: number,
    month: number,
    perfSummary: any,
    histChillerModel: Model<HistChillerPerformance>,
  ) {
    await histChillerModel.create({
      chillerId,
      year,
      quarter,
      month,
      ...perfSummary,
    });
  }

  static async saveHistLocationPerfSummary(
    locationId: string,
    year: number,
    quarter: number,
    month: number,
    perfSummary: any,
    histFacilityPerformanceModel: Model<HistFacilityPerformance>,
  ) {
    await histFacilityPerformanceModel.create({
      locationId,
      year,
      quarter,
      month,
      ...perfSummary,
    });
  }

  static async saveHistCompanyPerfSummary(
    companyId: string,
    year: number,
    quarter: number,
    month: number,
    perfSummary: any,
    histCompanyPerformanceModel: Model<HistCompanyPerformance>,
  ) {
    await histCompanyPerformanceModel.create({
      companyId,
      year,
      quarter,
      month,
      ...perfSummary,
    });
  }

  /** === Retrieval equivalent of retrieveHistPerformanceSummaryForLocation === */
  static async retrieveHistPerformanceSummaryForLocation(
    locationId: string,
    year: number,
    quarter: number,
    month: number,
    histFacilityPerformanceModel: Model<HistFacilityPerformance>,
  ) {
    return histFacilityPerformanceModel
      .findOne({ locationId, year, quarter, month })
      .sort({ _id: -1 })
      .lean()
      .exec();
  }

  static async retrieveHistPerformanceSummaryForChiller(
    chillerId: string,
    year: number,
    quarter: number,
    month: number,
    histChillerPerformanceModel: Model<HistChillerPerformance>,
  ) {
    return histChillerPerformanceModel
      .findOne({ chillerId, year, quarter, month })
      .sort({ _id: -1 })
      .lean()
      .exec();
  }

  static removeDuplicateFacilityIds<T extends string | number>(
    facilityIds: T[],
  ): T[] {
    if (!facilityIds || facilityIds.length === 0) return [];

    const seen = new Set<string>();
    const result: T[] = [];

    for (const id of facilityIds) {
      const key = id.toString(); // works for ObjectId, string, number
      if (!seen.has(key)) {
        seen.add(key);
        result.push(id);
      }
    }

    return result;
  }

  /**
   * Build a date range based on year, quarter, and month
   * - quarter = 0 → full year
   * - month = 0 → full quarter
   */
  static buildDateRange(
    year: number,
    quarter = 0,
    month = 0,
  ): { startDate: Date; endDate: Date } {
    const startDay = 1;
    let startMonth = 1;
    let endDay = 31;
    let endMonth = 12;

    // Default start/end time (like ColdFusion)
    const startHour = 0;
    const startMinute = 0;
    const startSecond = 0;
    const endHour = 0;
    const endMinute = 0;
    const endSecond = 0;

    const isLeapYear = (y: number): boolean =>
      (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

    switch (quarter) {
      case 1:
        switch (month) {
          case 0:
            endMonth = 3;
            break;
          case 1:
            endMonth = 1;
            break;
          case 2:
            startMonth = 2;
            endMonth = 2;
            endDay = isLeapYear(year) ? 29 : 28;
            break;
          case 3:
            startMonth = 3;
            endMonth = 3;
            break;
        }
        break;

      case 2:
        switch (month) {
          case 0:
            startMonth = 4;
            endMonth = 6;
            endDay = 30;
            break;
          case 4:
            startMonth = 4;
            endMonth = 4;
            endDay = 30;
            break;
          case 5:
            startMonth = 5;
            endMonth = 5;
            break;
          case 6:
            startMonth = 6;
            endMonth = 6;
            endDay = 30;
            break;
        }
        break;

      case 3:
        switch (month) {
          case 0:
            startMonth = 7;
            endMonth = 9;
            endDay = 30;
            break;
          case 7:
            startMonth = 7;
            endMonth = 7;
            break;
          case 8:
            startMonth = 8;
            endMonth = 8;
            break;
          case 9:
            startMonth = 9;
            endMonth = 9;
            endDay = 30;
            break;
        }
        break;

      case 4:
        switch (month) {
          case 0:
            startMonth = 10;
            endMonth = 12;
            break;
          case 10:
            startMonth = 10;
            endMonth = 10;
            break;
          case 11:
            startMonth = 11;
            endMonth = 11;
            endDay = 30;
            break;
          case 12:
            startMonth = 12;
            endMonth = 12;
            break;
        }
        break;
    }

    const startDate = new Date(
      year,
      startMonth - 1, // JS months are 0-based
      startDay,
      startHour,
      startMinute,
      startSecond,
    );

    const endDate = new Date(
      year,
      endMonth - 1,
      endDay,
      endHour,
      endMinute,
      endSecond,
    );

    return { startDate, endDate };
  }

  // static getFixedRanges(
  //   today: Date = new Date(),
  // ): Record<string, { startDate: Date; endDate: Date }> {
  //   const year = today.getFullYear();

  //   return {
  //     thisYTD: {
  //       startDate: new Date(year, 0, 1, 0, 0, 0),
  //       endDate: today,
  //     },
  //     lastYTD: {
  //       startDate: new Date(year - 1, 0, 1, 0, 0, 0),
  //       // endDate: today,
  //       endDate: new Date(
  //         year - 1,
  //         today.getMonth(),
  //         today.getDate(),
  //         23,
  //         59,
  //         59,
  //       ),
  //     },
  //     last12Months: {
  //       startDate: new Date(year - 1, 0, 1, 0, 0, 0),
  //       endDate: new Date(year - 1, 11, 31, 23, 59, 59),
  //     },
  //     [String(year - 2)]: {
  //       startDate: new Date(year - 2, 0, 1, 0, 0, 0),
  //       endDate: new Date(year - 2, 11, 31, 23, 59, 59),
  //     },
  //     [String(year - 3)]: {
  //       startDate: new Date(year - 3, 0, 1, 0, 0, 0),
  //       endDate: new Date(year - 3, 11, 31, 23, 59, 59),
  //     },
  //   };
  // }
  static getFixedRanges(
    today: Date = new Date(),
  ): Record<string, { startDate: Date; endDate: Date }> {
    const year = today.getFullYear();
    const rangeTypes = [1, 2, 3]; // rangeTypes array as provided

    const results: any = {};

    for (const rangeType of rangeTypes) {
      let startDate: Date;
      let endDate: Date;

      if (rangeType === 1) {
        console.log("✌️rangeType === 1 --->");
        // This YTD → Jan 1 current year → today
        startDate = new Date(year, 0, 1); // Jan 1 current year
        endDate = today; // today
        console.log("✌️startDate --->", startDate);
        console.log("✌️endDate --->", endDate);
      } else if (rangeType === 2) {
        console.log("✌️rangeType === 2 --->");
        // Last YTD → Jan 1 last year → today
        const lastYear = year - 1;
        startDate = new Date(lastYear, 0, 1); // Jan 1 last year
        console.log("✌️startDate --->", startDate);

        endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() - 1); // today - 1 year
        console.log("✌️endDate --->", endDate);
      } else if (rangeType === 3) {
        console.log("✌️rangeType === 3 --->");
        // Last 12 months → Full last year
        endDate = today; // today
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1); // today - 1 year
        console.log("✌️startDate --->", startDate);
        console.log("✌️endDate --->", endDate);
      }

      // Adding the calculated date range to results
      results[String(rangeType)] = { startDate, endDate };
    }
    console.log("results: ", results);

    return {
      thisYTD: results[1],
      lastYTD: results[2],
      last12Months: results[3],
      [String(year - 1)]: {
        startDate: new Date(year - 2, 0, 1, 0, 0, 0),
        endDate: new Date(year - 2, 11, 31, 23, 59, 59),
      },
      [String(year - 2)]: {
        startDate: new Date(year - 3, 0, 1, 0, 0, 0),
        endDate: new Date(year - 3, 11, 31, 23, 59, 59),
      },
    };
  }

  static getEfficiencyAlerts(mostRecentRecords) {
    if (!mostRecentRecords || mostRecentRecords.length === 0) {
      return [];
    }

    // Step 1: collect alert LogIDs
    const alertList: string[] = [];
    for (const record of mostRecentRecords) {
      const totalLoss =
        (record.condInletLoss || 0) +
        (record.condAppLoss || 0) +
        (record.evapTempLoss || 0) +
        (record.evapAppLoss || 0) +
        (record.nonCondLoss || 0) +
        (record.deltaLoss || 0);

      if (totalLoss >= 10) {
        alertList.push(record._id);
      }
    }

    // Step 2: filter records by alert LogIDs
    if (alertList.length > 0) {
      return mostRecentRecords.filter((record) =>
        alertList.includes(record._id),
      );
    }

    return [];
  }
  static async getDashboardPerformanceSummary(
    companyId: unknown,
    histCompanyPerformanceModel: Model<HistCompanyPerformance>,
  ) {
    const ranges = this.getFixedRanges(new Date());

    const result: Record<string, any> = {};

    for (const [label, range] of Object.entries(ranges)) {
      const year = range.startDate.getFullYear();
      const quarter = 0;
      const month = 0;

      const summary = await histCompanyPerformanceModel
        .findOne({ companyId, year, quarter, month })
        .sort({ _id: -1 })
        .lean()
        .exec();

      result[label] = summary || {
        averageLoss: 0,
        targetCost: 0,
        lossCost: 0,
        actualCost: 0,
        kwhLoss: 0,
        btuLoss: 0,
        co2: 0,
      };
    }

    return result;
  }
  static async getCompanyPerformanceSummary(
    companyId: string,
    chillerModel: Model<Chiller>,
    logsModel: Model<Logs>,
  ): Promise<{ performanceSummary: Record<string, PerfSummary> }> {
    const chillers = await chillerModel.find({
      companyId: new mongoose.Types.ObjectId(companyId),
    });

    const ranges = this.getFixedRanges(); // Already provides { startDate, endDate }
    const performanceSummary: Record<string, PerfSummary> = {};

    for (const [rangeKey, { startDate, endDate }] of Object.entries(ranges)) {
      const combined: PerfSummary = {
        averageLoss: 0,
        targetCost: 0,
        lossCost: 0,
        actualCost: 0,
        kwhLoss: 0,
        btuLoss: 0,
        co2: 0,
        AvgExcessCondApp: 0,
        AvgExcessEvapApp: 0,
        AvgOtherLoss: 0,
      };

      let chillerCount = 0;

      for (const chiller of chillers) {
        const logRecords = await this.getLogRecordsInRange(
          startDate,
          endDate,
          chiller._id.toString(),
          logsModel,
        );

        console.log("logRecords: ", logRecords);
        if (!logRecords.length) continue;

        const useRunHours = chiller.useRunHours
          ? this.checkRunHoursForRange(logRecords)
          : false;

        const perf = await this.getPerformanceForRange(
          logRecords,
          useRunHours,
          startDate,
          logsModel,
          chillerModel,
        );

        console.log("perf: ", perf);
        combined.averageLoss += perf.avgLoss || 0;
        combined.targetCost += perf.targetCost || 0;
        combined.lossCost += perf.lossCost || 0;
        combined.actualCost += perf.actualCost || 0;
        combined.kwhLoss += perf.kwhLoss || 0;
        combined.btuLoss += perf.BTULoss || 0;
        combined.co2 += perf.CO2 || 0;

        chillerCount++;
      }

      if (chillerCount > 0) {
        combined.averageLoss = +(combined.averageLoss / chillerCount).toFixed(
          2,
        );
      }

      performanceSummary[rangeKey] = {
        averageLoss: +combined.averageLoss.toFixed(2),
        targetCost: +combined.targetCost.toFixed(2),
        lossCost: +combined.lossCost.toFixed(2),
        actualCost: +combined.actualCost.toFixed(2),
        kwhLoss: +combined.kwhLoss.toFixed(2),
        btuLoss: +combined.btuLoss.toFixed(2),
        // co2: +combined.co2.toFixed(2),
        co2: Math.round(combined.co2),
        AvgExcessCondApp: 0,
        AvgExcessEvapApp: 0,
        AvgOtherLoss: 0,
      };
    }

    return { performanceSummary };
  }
  // old functions. Do not delete
  // async createCustomPerformanceSummaryForLocation(
  //   locationId: number,
  //   chillerList: number[],
  //   startDate: Date,
  //   endDate: Date,
  // ) {
  //   const perfSummary: any = {
  //     AvgLoss: 0,
  //     TargetCost: 0,
  //     LossCost: 0,
  //     ActualCost: 0,
  //     KWHLoss: 0,
  //     BTULoss: 0,
  //     CO2: 0,
  //     AvgExcessCondApp: 0,
  //     AvgExcessEvapApp: 0,
  //     AvgOtherLoss: 0,
  //   };

  //   let tempLossTotal = 0;
  //   let tempOtherLossTotal = 0;
  //   let tempExcessCondAppTotal = 0;
  //   let tempExcessEvapAppTotal = 0;

  //   const location = await this.locationService.findById(locationId);
  //   const company = await this.companyService.findById(location.companyId);

  //   if (chillerList && chillerList.length > 0) {
  //     for (const chillerId of chillerList) {
  //       const chillerPerfSummary =
  //         await this.createCustomPerformanceSummaryForChiller(
  //           chillerId,
  //           startDate,
  //           endDate,
  //         );

  //       tempLossTotal += chillerPerfSummary.AvgLoss;
  //       tempOtherLossTotal += chillerPerfSummary.AvgOtherLoss;
  //       tempExcessCondAppTotal += chillerPerfSummary.AvgExcessCondApp;
  //       tempExcessEvapAppTotal += chillerPerfSummary.AvgExcessEvapApp;

  //       perfSummary.TargetCost += chillerPerfSummary.TargetCost;
  //       perfSummary.LossCost += chillerPerfSummary.LossCost;
  //       perfSummary.ActualCost += chillerPerfSummary.ActualCost;
  //       perfSummary.KWHLoss += chillerPerfSummary.KWHLoss;
  //       perfSummary.BTULoss += chillerPerfSummary.BTULoss;
  //       perfSummary.CO2 += chillerPerfSummary.CO2;
  //     }

  //     const divisor = chillerList.length;
  //     perfSummary.AvgLoss = tempLossTotal / divisor;
  //     perfSummary.AvgExcessCondApp = tempExcessCondAppTotal / divisor;
  //     perfSummary.AvgExcessEvapApp = tempExcessEvapAppTotal / divisor;
  //     perfSummary.AvgOtherLoss = tempOtherLossTotal / divisor;
  //   }

  //   perfSummary.LocationName = `${company.name} - ${location.name}`;
  //   return perfSummary;
  // }

  // async createCustomPerformanceSummaryForChiller(
  //   chillerId: number,
  //   startDate: Date,
  //   endDate: Date,
  // ) {
  //   const chiller = await this.chillerService.findById(chillerId);

  //   let perfSummary: any = {
  //     AvgLoss: 0,
  //     TargetCost: 0,
  //     LossCost: 0,
  //     ActualCost: 0,
  //     KWHLoss: 0,
  //     BTULoss: 0,
  //     CO2: 0,
  //     AvgExcessCondApp: 0,
  //     AvgExcessEvapApp: 0,
  //     AvgOtherLoss: 0,
  //   };

  //   const logRecords = await this.logRecordService.getLogRecordsInRange(
  //     startDate,
  //     endDate,
  //     chillerId,
  //   );

  //   let useRunHours = true;
  //   let runHoursForRange = 0;

  //   if (logRecords && logRecords.length > 0) {
  //     if (!chiller.useRunHours) {
  //       useRunHours = false;
  //     } else {
  //       useRunHours = this.checkRunHoursForRange(logRecords);
  //     }

  //     if (useRunHours) {
  //       runHoursForRange = this.getRunHoursForRange(
  //         logRecords,
  //         chillerId,
  //         startDate,
  //       );
  //     }

  //     perfSummary = this.getPerformanceForRange(
  //       logRecords,
  //       useRunHours,
  //       startDate,
  //     );
  //   } else {
  //     runHoursForRange = 0;
  //   }

  //   perfSummary.ChillerNo = chiller.chillerNo;
  //   return perfSummary;
  // }
}
