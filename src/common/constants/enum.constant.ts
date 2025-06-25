export enum AppEnvironment {
  DEVELOPMENT = "development",
  PRODUCTION = "production",
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
  PENDING = "pending",
  ACTIVE = "active",
  IN_ACTIVE = "inactive",
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
}

export const ALTITUDE_UNITS = {
  feet: "Feet",
  meter: "Meter",
};

export const MEASUREMENT_UNITS = {
  english: "English",
  siMetric: "SI Metrics",
};

export const DES_INLET_WATER_TEMP = {
  "85°F / 29.44°C": "85°F / 29.44°C",
  "86°F / 30°C": "85°F / 29.44°C",
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
};
