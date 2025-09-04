const fieldDisplayNames: Record<string, string> = {
  ChillerNo: "Chiller Name/No",
  weeklyHours: "Weekly Hours Of Operation",
  weeksPerYear: "Weeks Per Year",
  avgLoadProfile: "Avg. Load Profile",
  desInletWaterTemp: "Design Inlet Water Temp.",
  make: "Make",
  model: "Model",
  serialNumber: "Serial No.",
  manufacturedYear: "Year Manufactured",
  refrigType: "Refrigerant Type",
  tons: "Tons/KWR",
  efficiencyRating: "Efficiency Rating",
  energyCost: "Energy Cost (kw. hr.)",
  condDPDrop: "Design Condenser Water Pressure Drop",
  condDPDropUnit: "Unit for Design Condenser Water Pressure Drop",
  condAPDropUnit: "Actual Condenser Water Pressure Drop Unit",
  condPressureUnit: "Condenser Pressure Unit",
  condApproach: "Design Condenser Approach Temp",
  condDesignDeltaT: "Design Condenser ∆ T",
  condDesignFlow: "Design Condenser Flow",
  evapDPDrop: "Design Chill Water Pressure Drop",
  evapDPDropUnit: "Unit for Design Chill Water Pressure Drop",
  evapAPDropUnit: "Actual Chill Water Pressure Drop Unit",
  evapPressureUnit: "Evaporator Pressure Unit",
  useEvapRefrigTemp: "Enter a Saturated Refrig. Temp.?",
  evapApproach: "Design Evaporator Approach Temp",
  evapDOWTemp: "Evaporator Design Outlet Water Temp",
  evapDesignDeltaT: "Evaporator Design ∆ T",
  evapDesignFlow: "Evaporator Design Flow",
  designVoltage: "Design Voltage",
  voltageChoice: "Voltage Choice",
  fullLoadAmps: "Full-Load Amperage",
  ampChoice: "Amperage Choice",
  havePurge: "Purge Total Pumpout Time Readout on Chiller?",
  purgeReadingUnit: "Purge Total Pumpout Time measured in what units?",
  maxPurgeTime: "Max. Daily Purge Total Pumpout Time before Alert",
  haveBearingTemp: "Readout for Bearing Temp.?",
  compOPIndicator: "Oil Pressure Differential",
  useRunHours: "Calculate Efficiency Using",
  numberOfCompressors: "Number Of Compressors",
  userNote: "User Notes",
};
export function generateTimelineDescription(
  title: string,
  params: {
    updatedBy: string;
    updatedFields?: string[];
    logId?: string;
    logCreatedAt?: Date;
    updatedAt?: Date;
    entryNotes?: string;
    maintenanceLogId?: string;
  },
): string {
  console.log("✌️updatedFields --->");
  switch (title) {
    case "Chiller Updated": {
      const updatedFieldNames =
        params.updatedFields
          ?.map((field) => fieldDisplayNames[field] || field)
          .join(", ") || "None";
      // return `The chiller configuration was updated. Param updated are: ${params.updatedFields?.join(', ') || 'None'}. Updated By: ${params.updatedBy}`;
      return `The chiller configuration was updated. Param updated are: ${updatedFieldNames}. Updated By: ${params.updatedBy}`;
    }

    case "New Log Entry":
      return `Log ID ${params.logId}. Entry Notes: ${params.entryNotes || ""}. Updated By: ${params.updatedBy}`;

    case "Log Edited":
      return `Log ID ${params.logId} at ${params.logCreatedAt} was edited with entry notes: "${params.entryNotes || ""}". Updated By: ${params.updatedBy}`;

    case "Maintenance Entry Edited":
      return `Entry Notes: "${params.entryNotes || ""}". Updated By: ${params.updatedBy}`;

    case "New Maintenance Entry":
      return `Maintenance Entry ${params.maintenanceLogId} at ${params.logCreatedAt} was edited with Entry Notes: "${params.entryNotes || ""}". Updated By: ${params.updatedBy}`;

    case "Chiller Activated":
      return `Activated By: ${params.updatedBy}`;

    case "Chiller Inactivated":
      return `Inactivated By: ${params.updatedBy}`;

    case "New Bad Log Entry":
      return `Bad Log ID ${params.logId} was created. Entry Notes: "${params.entryNotes || ""}". Updated By: ${params.updatedBy}`;

    case "Bad Log Entry Edited":
      return `Bad Log ID ${params.logId} was edited. Entry Notes: "${params.entryNotes || ""}". Updated By: ${params.updatedBy}`;

    case "Chiller Bulk Updated":
      return `The chiller configuration was updated. Param updated are: ${fieldDisplayNames["energyCost"]}. Updated By: ${params.updatedBy}`;

    default:
      return `Updated By: ${params.updatedBy}`;
  }
}
