export enum ModuleName {
  COMPANY = "company",
  FACILITY = "facility",
  CHILLER = "chiller",
  USER = "users",
  LOG = "log",
  MAINTENANCE = "maintenance",
  REPORT = "report",
  SETTING = "setting",
}

export interface ModulePermission {
  view?: boolean;
  add?: boolean;
  edit?: boolean;
  toggleStatus?: boolean;
}

export interface Responsibility {
  description: string;
  isMandatory: boolean;
}

export type NotificationType = "web" | "email" | "both";
export type ComparisonOperator = "<=" | "=" | ">=";

export interface AlertCondition {
  metric: string;
  warning: {
    operator: ComparisonOperator;
    threshold: number;
  };
  alert: {
    operator: ComparisonOperator;
    threshold: number;
  };
  notifyBy: NotificationType;
}

export interface LogEntryAlert {
  type: "manual" | "maintenance" | "csv" | "programAccess";
  daysSince: number;
  notifyBy: NotificationType;
  facilityIds?: string[];
  operatorIds?: string[];
}
