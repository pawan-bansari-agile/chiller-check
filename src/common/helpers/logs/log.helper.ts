/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { BadRequestException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  CHILLER_STATUS,
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
// import dayjs from "dayjs";
// import utc from "dayjs/plugin/utc";
// import timezone from "dayjs/plugin/timezone";
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(utc);
dayjs.extend(timezone);

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
  static validateRunHours(
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
      IST: "Asia/Kolkata",
      MST: "America/Denver",
      AKST: "America/Anchorage",
      HAST: "Pacific/Honolulu",
    };

    // const ianaZone = timeZoneMap[readingTimeZone.toUpperCase()];
    const upperZone = readingTimeZone.toUpperCase();
    const ianaZone = timeZoneMap[upperZone];

    if (!ianaZone) {
      throw new Error(`Unsupported time zone abbreviation: ${readingTimeZone}`);
    }

    // Combine and parse the date-time string in the specified timezone
    const localDateTimeStr = `${readingDate} ${readingTime}`; // '07-25-2025 2:17 PM'
    const parsed = dayjs.tz(localDateTimeStr, "MM-DD-YYYY h:mm A", ianaZone);

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
    const efficiency = chiller.efficiencyRating ?? 1;

    if (chiller.unit == MEASUREMENT_UNITS.SIMetric) {
      return (1 / efficiency) * cost * tons * avgLoad * 0.01;
    } else {
      return efficiency * cost * tons * avgLoad * 0.01;
    }
  }

  static calculateAnnualTargetCost(chiller: Chiller): number {
    const hoursPerWeek = chiller.weeklyHours ?? 0;
    const weeksPerYear = chiller.weeksPerYear ?? 0;
    const costPerHour = this.calculateTargetCostPerHour(chiller);
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
    return chiller.useLoad ? maxAmp / 100 : maxAmp / chiller.fullLoadAmps;
  }

  static getCondenserApproach(log: Logs, chiller: Chiller): number {
    const maxAmp = this.getMaxAmp(log);
    const loadFactor = this.getLoadFactor(log, chiller, maxAmp);

    let approach = 0;
    if (loadFactor > 0) {
      const refTemp = chiller.highPressureRefrig
        ? log.calculatedCondRefrigTemp // from getConversionInfo
        : log.condRefrigTemp;

      approach = (refTemp - log.condOutletTemp) / loadFactor;
    }

    // log.condApproach = approach;
    // log.actualLoad = loadFactor * 100;
    return approach;
  }

  static calcEvapTempLoss(log: Logs, chiller: Chiller): number {
    let loss = 0;

    // Assume 44°F as the benchmark evap outlet temperature
    const baseTemp =
      chiller.unit == MEASUREMENT_UNITS.SIMetric
        ? this.convertTemp("TempF", "TempC", 44)
        : 44;

    const diff = log.evapOutletTemp - baseTemp;
    const tempLoss = diff > 0 ? diff : 0;

    loss =
      chiller.unit == MEASUREMENT_UNITS.SIMetric
        ? tempLoss * 3.6
        : tempLoss * 2;

    if (loss < 2) loss = 0;

    // log.evapTempLoss = loss;
    return loss;
  }

  static calcEvapAppLoss(log: Logs, chiller: Chiller): number {
    const approach = (log.evapRefrigTemp ?? 0) - (log.evapOutletTemp ?? 0);
    const cda = chiller.evapApproach ?? 5;

    const variance = approach > cda ? approach - cda : 0;
    let loss =
      chiller.unit == MEASUREMENT_UNITS.SIMetric
        ? variance * 3.6
        : variance * 2;

    if (loss < 2) loss = 0;

    // log.evapAppLoss = loss;
    return loss;
  }

  static calcNonCondLoss(log: Logs, chiller: Chiller): number {
    const temp = log.condInletTemp ?? 0;
    const pressure = log.condPressure ?? 0;

    // Arbitrary threshold for abnormal behavior (can be updated)
    const nonCondLoss =
      pressure > 0 && temp > 0 && pressure / temp > 0.9 ? 10 : 0;

    // log.nonCondLoss = nonCondLoss;
    return nonCondLoss;
  }

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
    const formattedTemp = parseFloat(condRefrigTemp.toFixed(1));

    const result = await conversionModel
      .findOne({
        refrigName: refrigName,
        tempF: { $lte: formattedTemp },
      })
      .sort({ tempF: -1 }) // DESC
      .select({ tempF: 1, psig: 1 })
      .lean();

    if (!result) {
      throw new Error(
        `Conversion data not found for RefrigID=${refrigName} and TempF<=${formattedTemp}`,
      );
    }

    return {
      tempF: result.tempF,
      psig: result.psig,
    };
  }

  static async getConversionInfoForHighPressure(
    refrigName: string,
    condPressure: number,
    conversionModel?: Model<ConversionDocument>,
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

  static calcCO2(logRecord: Logs) {
    const kwhLoss = logRecord.KWHLoss;
    let co2 = 0;

    if (typeof kwhLoss === "number") {
      co2 = (kwhLoss * 1.1835) / 2000;
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
}
