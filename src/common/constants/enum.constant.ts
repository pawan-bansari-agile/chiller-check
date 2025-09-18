export enum AppEnvironment {
  DEVELOPMENT = "development",
  STAGING = "staging",
  PRODUCTION = "production",
  LOCAL = "local",
}

export enum Role {
  ADMIN = "admin",
  SUB_ADMIN = "subAdmin",
  CORPORATE_MANAGER = "corporateManager",
  FACILITY_MANAGER = "facilityManager",
  OPERATOR = "operator",
}

export enum CompanyStatus {
  DEMO = "demo",
  PROSPECT = "prospect",
  ACTIVE = "active",
  IN_ACTIVE = "inactive",
}

export enum ChillerStatus {
  // PENDING = "pending",
  // ACTIVE = "active",
  // IN_ACTIVE = "inactive",
  Pending = "Pending",
  Active = "Active",
  InActive = "Inactive",
}

export enum DeviceType {
  WEB = "web",
  IOS = "ios",
  ANDROID = "android",
}

export enum CommonFolderEnum {
  "tmp" = "tmp-chiller-check",
}

export enum CMS {
  TERMS_AND_CONDITIONS = "termsAndCond",
  PRIVACY_POLICY = "privacyPolicy",
}

export enum UserActivity {
  LOGGED_IN = "Logged In",
  LOGGED_OUT = "Logged Out",
  CHANGE_PASSWORD = "Change Password",
  PROFILE_UPDATED = "Profile Updated",
  APPOINTMENT_NOT_ADD = "Added a Note",
}
export const tmpFolderName = "tmp-chiller-check";
export const folderName = "chiller-check";
export enum UploadFolderEnum {
  PROFILE_PIC = "profilePic",
  MAINTENANCE_FILES = "maintenanceFiles",
}

export const ALTITUDE_UNITS = {
  feet: "Feet",
  meter: "Meter",
};

export const MEASUREMENT_UNITS = {
  English: "English",
  SIMetric: "SI Metric",
};

export const UNIT_DEPENDENT_OPTIONS = {
  [MEASUREMENT_UNITS.English]: {
    commonPressureUnits: ["PSIG", "Feet"],
    condPressureUnits: ["PSIG", "PSIA", "InHg"],
  },
  [MEASUREMENT_UNITS.SIMetric]: {
    commonPressureUnits: ["KPA", "Bar"],
    condPressureUnits: ["KPA", "Bar"],
  },
};

export const BEARING_TEMP = {
  Yes: "Yes",
  No: "No",
};

export const DES_INLET_WATER_TEMP = {
  "85°F / 29.44°C": "85°F / 29.44°C",
  "86°F / 30°C": "85°F / 29.44°C",
};

export const Make = {
  Trane: "Trane",
  Carrier: "Carrier",
  York: "York",
  McQuay: "McQuay",
  Westinghouse: "Westinghouse",
  "Dunham-Bush": "Dunham-Bush",
  FES: "FES",
  Sullair: "Sullair",
  "Arctic Cool": "Arctic Cool",
  Multistack: "Multistack",
  Daikin: "Daikin",
};

export const CHILLER_STATUS = {
  Pending: "Pending",
  Active: "Active",
  InActive: "Inactive",
};

export const REFRIGERANT_TYPE = {
  "R-11": { label: "R-11", isHighPressure: false },
  "R-113": { label: "R-113", isHighPressure: false },
  "R-12": { label: "R-12", isHighPressure: true },
  "R-123": { label: "R-123", isHighPressure: false },
  "R-134a": { label: "R-134a", isHighPressure: true },
  "R-22": { label: "R-22", isHighPressure: true },
  "R-500": { label: "R-500", isHighPressure: true },
  "R-114": { label: "R-114", isHighPressure: false },
  "R-514A": { label: "R-514A", isHighPressure: false },
};

export const VOLTAGE_CHOICE = {
  "3-Phase": "3-Phase",
  "1-Phase": "1-Phase",
  "Do Not Log Voltage": "Do Not Log Voltage",
};

export const AMPERAGE_CHOICE = {
  "3-Phase": "3-Phase",
  "1-Phase": "1-Phase",
  "Enter % Load": "Enter % Load",
};

export const MAINTENANCE_TYPES = {
  AnnualMaintenanceDate: "Annual Maintenance Date",
  OilChangeDate: "Oil Change Date",
  DateOilAdded: "Date Oil Added",
  OilFilterChangeDate: "Oil Filter Change Date",
  OilAnalysisDate: "Oil Analysis Date",
  EddyCurrentTestDateCondenser: "Eddy Current Test Date (Condenser)",
  EddyCurrentTestDateEvaporator: "Eddy Current Test Date (Evaporator)",
  MajorStopInspection: "Major Stop Inspection",
  RefrigerantAnalysisDate: "Refrigerant Analysis Date",
  DateRefrigerantAdded: "Date Refrigerant Added",
  CondenserTubeCleaningDate: "Condenser Tube Cleaning Date",
  EvaporatorTubeCleaningDate: "Evaporator Tube Cleaning Date",
  PurgeTankReclaimDate: "Purge Tank Reclaim Date",
  PurgeFilterDryerChangeDate: "Purge Filter Dryer Change Date",
  MajorRepair: "Major Repair",
  RunningInspection: "Running Inspection",
  VibrationAnalysis: "Vibration Analysis",
};

export const MAINTENANCE_CATEGORIES = {
  AnnualMaintenance: "Annual Maintenance",
  OilMaintenance: "Oil Maintenance",
  EddyCurrentTests: "Eddy Current Tests",
  MajorStopInspectionCompressorTeardown:
    "Major Stop Inspection (compressor teardown)",
  RefrigerantMaintenance: "Refrigerant Maintenance",
  TubeCleaning: "Tube Cleaning",
  PurgeMaintenance: "Purge Maintenance",
  MajorRepairs: "Major Repairs",
  RunningInspection: "Running Inspection",
  VibrationAnalysis: "Vibration Analysis",
};

export const OIL_PRESSURE_DIFF = {
  "Enter High and Low Pressures": "Enter High and Low Pressures",
  "Enter High Pressure Only": "Enter High Pressure Only",
  "Enter Differential Directly": "Enter Differential Directly",
  "Do Not Log Lube System": "Do Not Log Lube System",
};

export const AVERAGE_EFFICIENCY_LOSS = {
  "Run Hours (Log reading must include Run Hours)":
    "Run Hours (Log reading must include Run Hours)",
  Days: "Days",
};

export const PURGE_READING_UNIT = {
  "Mins. Only": "Mins. Only",
  "Hrs. & Min.": "Hrs. & Min.",
};

export const STATES = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",

  // Federal district
  "District of Columbia": "DC",

  // U.S. territories (optional but useful for completeness)
  "American Samoa": "AS",
  Guam: "GU",
  "Northern Mariana Islands": "MP",
  "Puerto Rico": "PR",
  "U.S. Virgin Islands": "VI",

  // Canada - Provinces
  Alberta: "AB",
  "British Columbia": "BC",
  Manitoba: "MB",
  "New Brunswick": "NB",
  "Newfoundland and Labrador": "NL",
  "Nova Scotia": "NS",
  Ontario: "ON",
  "Prince Edward Island": "PE",
  Quebec: "QC",
  Saskatchewan: "SK",

  // Canada - Territories
  "Northwest Territories": "NT",
  Nunavut: "NU",
  Yukon: "YT",
};
export enum NotificationRedirectionType {
  COMPANY_FREE_TRIAL_ENDED = "companyFreeTrialEnded",
  FAIL_ATTEMPTS = "failAttempts",
  COMPANY_ASSIGNED = "companyAssigned",
  FACILITY_ASSIGNED = "facilityAssigned",
  FACILITY_INACTIVATED = "facilityInactivated",
  FACILITY_ACTIVATED = "facilityActivated",
  FACILITY_ADDED = "facilityAdded",
  FACILITY_UPDATED = "facilityUpdated",
  CHILLER_ASSIGNED = "chillerAssigned",
  CHILLER_ADDED = "chillerAdded",
  CHILLER_ACTIVATED = "chillerActivated",
  CHILLER_INACTIVATED = "chillerInactivated",
  CHILLER_UPDATED = "chillerUpdated",
  USER_INACTIVATED = "userInactivated",
  USER_UPDATED = "userUpdated",
  REPORT_SHARED = "reportShared",
}
export function userRoleName(role: string) {
  if (role == Role.ADMIN) {
    return "Admin";
  } else if (role == Role.SUB_ADMIN) {
    return "Sub Admin";
  } else if (role == Role.CORPORATE_MANAGER) {
    return "Company Manager";
  } else if (role == Role.FACILITY_MANAGER) {
    return "Facility Manager";
  } else if (role == Role.OPERATOR) {
    return "Operator";
  }
}
