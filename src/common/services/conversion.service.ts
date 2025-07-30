/* eslint-disable @typescript-eslint/no-explicit-any */
// src/conversion/conversion.service.ts
import { Injectable } from "@nestjs/common";
import * as XLSX from "xlsx";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Conversion, ConversionDocument } from "../schema/conversion.schema";
import { LoggerService } from "../logger/logger.service";
import {
  AltitudeCorrection,
  AltitudeCorrectionDocument,
} from "../schema/altitudeCorrection.schema";

@Injectable()
export class ConversionService {
  constructor(
    @InjectModel(Conversion.name)
    private readonly conversionModel: Model<ConversionDocument>,
    @InjectModel(AltitudeCorrection.name)
    private readonly altCorrectionModel: Model<AltitudeCorrectionDocument>,
    private readonly myLogger: LoggerService,
  ) {}

  async loadConversionDataIfNeeded(): Promise<void> {
    const existingCount = await this.conversionModel.countDocuments();
    if (existingCount > 0) {
      //   console.log('✅ Conversion data already exists. Skipping import.');
      // const count = await this.conversionModel.countDocuments();
      this.myLogger.customLog(
        "✅ Conversion data already exists. Skipping import.",
      );
      return;
    }

    const filePath = "src/common/resources/LogEntriesFindings.xlsx";
    const workbook = XLSX.readFile(filePath);
    const sheet =
      workbook.Sheets["Conversion"] || workbook.Sheets[workbook.SheetNames[1]];

    const rawData = XLSX.utils.sheet_to_json(sheet, { defval: null });

    const cleanedData = rawData.map((row: any) => ({
      conversionId: row["ConversionID"],
      refrigName: row["RefrigName"],
      tempF: row["TempF"],
      psia: row["PSIA"],
      psig: row["PSIG"],
      inHg: row["InHg"],
    }));

    await this.conversionModel.insertMany(cleanedData);
    const count = await this.conversionModel.countDocuments();

    // console.log('✅ Conversion data imported successfully.');
    this.myLogger.customLog("✅ Conversion data imported successfully.");
    console.log("✅ Total number of imported records is:", count);
  }

  async loadAltitudeCorrectionIfNeeded(): Promise<void> {
    const existingCount = await this.altCorrectionModel.countDocuments();
    if (existingCount > 0) {
      this.myLogger.customLog(
        "✅ Altitude correction data already exists. Skipping import.",
      );
      return;
    }

    const filePath = "src/common/resources/altitudeCorrection.xlsx";
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const rawData = XLSX.utils.sheet_to_json(sheet, { defval: null });

    const cleanedData = rawData.map((row: any) => ({
      meters: row["Meters"],
      feet: row["Feet"],
      psi: row["PSI"],
      correction: row["Correction"],
    }));

    await this.altCorrectionModel.insertMany(cleanedData);
    const count = await this.altCorrectionModel.countDocuments();
    this.myLogger.customLog(
      "✅ Altitude correction data imported successfully.",
    );
    console.log(
      "✅ Total number of imported altitude correction records:",
      count,
    );
  }
}
