// note: delete
export const RESPONSE_SUCCESS = {
  SUCCESS: "Success.",
  SERVER_RUNNING: "Server is running.",
  USER_LOGIN: "You have successfully logged in to your account.",
  USER_SEND_OTP: "OTP has been sent to your registered phone number.",
  USER_VERIFY_OTP: "OTP verified successfully.",
  USER_LOGOUT: "You have been logged out of your account successfully.",
  USER_LISTED: "User list fetch successfully.",
  USER_INSERTED: "User added successfully.",
  USER_UPDATED: "Profile updated successfully.",
  COMPANY_CREATED: "Company added successfully.",
  USER_DELETED: "User Deleted.",
  RECORD_LISTED: "Records Listed.",
  RECORD_INSERTED: "Maintenance record added successfully.",
  RECORD_UPDATED: "Maintenance record updated successfully.",
  RECORD_DELETED: "Maintenance record deleted successfully.",
  INITIAL_USER_LOADED: "Initial user loaded successfully.",
  INITIAL_USER_ALREADY_LOADED: "Initial user already loaded.",
  CMS_LOADED: "Cms loaded successfully.",
  CMS_ALREADY_LOADED: "Cms already loaded.",
  PASSWORD_RESET_TOKEN:
    "Password reset link has been sent to your registered email.",
  PASSWORD_RESET: "Password has been reset successfully.",
  PASSWORD_CREATED: "Password created successfully.",
  PASSWORD_CHANGED: "Password changed successfully.",
  ACCOUNT_EXIST: "Account exist.",
  ACCOUNT_NOT_EXIST: "Account not exist",
  PATIENT_BULK_IMPORT: "Patient imported successfully",
  PATIENT_ALLERGY_AND_MEDICATION_BULK_IMPORT:
    "Patient allergies and medications imported successfully",
  NOTE_TYPES_BULK_IMPORT: "Note types imported successfully",
  PATIENT_NOTE: "Get patient note successfully",
  DEPARTMENTS_LOADED: "Department loaded successfully.",
  DEPARTMENTS_ALREADY_LOADED: "Department already loaded successfully.",
  LOCATIONS_ALREADY_LOADED: "Location already loaded successfully.",
  LOCATIONS_LOADED: "Locations loaded successfully.",
  FACILITY_UPDATED: "Facility details updated successfully.",
  FACILITY_ACTIVATED: "Facility activated successfully.",
  FACILITY_DEACTIVATED: "Facility inactivated successfully.",
  COMPANY_ACTIVATED: "Company activated successfully.",
  COMPANY_DEACTIVATED: "Company inactivated successfully.",
  COMPANY_IN_DEMO: "Company Marked as Demo",
  COMPANY_PROSPECTED: "Company Marked as Prospect",
  CHILLER_UPDATED: "Chiller details updated successfully.",
  TEST_USER_LOADED: "Test User Loaded successfully",
  TEST_USER_ALREADY_LOADED: "Test User already loaded!",
  PHONE_VERIFIED: "Phone number is valid.",
  LOG_UPDATED: "Log entry updated successfully!",
  OPERATORS_LISTED: "All Operators listed successfully!",
};

export const RESPONSE_ERROR = {
  USER_NOT_FOUND: "User not found.",
  USER_ALREADY_EXIST:
    "Email you entered is already registered. please use different email.",
  UNAUTHORIZED_USER:
    "Your session has expired. Please Sign-in again to continue.",
  ACCOUNT_DEACTIVATED:
    "This account has been deactivated by the admin. Please contact the admin.",
  TOKEN_EXPIRED: "Your session has expired. Please Sign-in again to continue.",
  DEVICE_DETAILS_NOT_FOUND: "Device details not found.",
  JSON_WEB_TOKEN_ERROR: "JsonWebTokenError.",
  TOKEN_EXPIRED_ERROR: "TokenExpiredError.",
  COMPANY_ALREADY_EXISTS:
    "Company name already exists. Please use a different name.",
  FACILITY_NAME_EXISTS: "Facility with the same already exists!",
  DUPLICATE_FACILITY_NAMES_IN_PAYLOAD:
    "A company cannot have facilities with the same name",
  COMPANY_NOT_FOUND: "Company Not Found",
  FACILITY_NOT_FOUND: "Facility Not Found",
  FACILITY_ALREADY_EXISTS:
    "Facility name already exists for the selected company. Please use a different name.",
  INVALID_PAGE_AND_LIMIT_VALUE: "Please enter valid page and limit values",
  INVALID_FACILITY_STATUS: "Invalid value for isActive. It should be a boolean",
  INVALID_COMPANY_STATUS:
    'Invalid status value. Only "active" or "inactive" are allowed.',
  INVALID_ID:
    "input must be a 24 character hex string, 12 byte Uint8Array, or an integer",
  INVALID_COMPANY_ASSIGNMENT: "Please select an active company for assignment!",
  INVALID_FACILITY_ASSIGNMENT:
    "Please select an active facility for assignment!",
  INVALID_CHILLER_ASSIGNMENT: "Please select an active chiller for assignment!",
  INVALID_ROLE: "Invalid Role!",
  INSUFFICIENT_PERMISSIONS: "You don't have permissions to access this api!",
  DUPLICATE_CHILLER_NAMES_IN_PAYLOAD: "Duplicate chiller names in payload!",
  NO_VAIL_CHILLER_FOUND:
    "No valid chillers found for update. They might be deleted or inactive.",
  CHILLER_NOT_FOUND: "Chiller not found",
  PROFILE_UPDATE: "Your account has been updated. Please log in again.",
  CHILLER_ID_REQUIRED: "Chiller Details are required for getting the timeline.",
  LOG_NOT_FOUND: "Log entry not found!",
  MAINTENANCE_LOG_NOT_FOUND: "Maintenance Log entry not found!",
  FREE_TRIAL_EXPIRED:
    "Your free 30-day trial has expired. Please contact our system admin at support@chillercheck.com to activate your account to continue using the system.",
  COMPANY_INACTIVE:
    "Your associated company has been inactivated. Please contact admin.",
  CHILLER_INACTIVE: "Chiller is not active to log records for",
  NO_ACTIVE_CHILLERS: "No Active chillers found!",
  NO_ACTIVE_COMPANIES: "No Active companies found!",
  NO_ACTIVE_FACILITIES: "No Active facilities found!",
  REPORT_NOT_FOUND: "Report not found.",
  NO_OWNER: "You are not the owner of the report..",
  DUPLICATE_READING_DATE: "A log cannot have duplicate reading time!",
};

export const AUTHENTICATION = {
  PASSWORD_PATTERN_NOT_MATCHED:
    "Password must contain 8 characters which include one upper case, one lower case, one special character and one number.",
  PASSWORD_RESET_TOKEN_EXPIRED:
    "Your password reset link has been expired, Please request a new one and try again.",
  OTP_SEND: "OTP has been sent to your registered phone number.",
};

export const USER = {
  COMPLETE_PROFILE: "Profile completed successfully.",
  INSURANCE_PROVIDER_LIST: "Insurance Provider list successfully.",
  PROVIDER_LIST: "Provider list fetched successfully.",
  USER_PROFILE: "User details fetched successfully.",
  USER_UPDATE: "Profile updated successfully.",
  USER_NOT_FOUND: "User not found.",
  PASSWORD_NOT_CURRENT: "New password should not be same as current password.",
  CUREENT_PASSWORD: "Current password is invalid.",
  USER_STATUS_UPDATED: "User status updated!",
  USER_ACTIVATED: "User account activated successfully.",
  USER_UNASSIGN_INACTIVE: "User unassigned and inactivated successfully.",
  USER_INACTIVATED: "User account inactivated successfully.",
  ADMIN_UPDATE: "User details updated successfully.",
};

export const COMPANY = {
  COMPANY_CREATE: "Company added successfully.",
  COMPANY_UPDATE: "Company details updated successfully.",
  COMPANY_DELETE: "Company deleted successfully.",
  COMPANY_LIST: "Company list fetch successfully.",
  COMPANY_FOUND: "Company Found.",
  COMPANY_STATUS_UPDATED: "Company status updated!",
  ACTIVE_COMPANY_LISTED: "All Active Company listed",
};

export const FACILITY = {
  FACILITY_CREATE: "Facility added successfully.",
  FACILITY_UPDATE: "Facility details updated successfully.",
  FACILITY_DELETE: "Facility deleted successfully.",
  FACILITY_LIST: "Facility list fetch successfully.",
  FACILITY_BY_ID: "Facility fetched successfully",
  FACILITY_STATUS_UPDATED: "Facility status updated!",
  ACTIVE_FACILITY_LISTED: "All Active Facilities listed",
};

export const CHILLER = {
  CHILLER_CREATE: "Chiller added successfully.",
  CHILLER_LIST: "Chiller list fetch successfully.",
  CHILLER_BY_ID: "Chiller fetched successfully",
  CHILLER_COST_UPDATED: "Electricity costs updated in bulk successfully.",
  CHILLER_INACTIVATED: "Chiller inactivated successfully.",
  CHILLER_ACTIVATED: "Chiller activated successfully.",
  CHILLER_STATUS_UPDATED: "Chiller status updated successfully",
  CHILLER_UPDATE: "Chiller details updated successfully.",
  ACTIVE_CHILLER_LISTED: "All Active Chillers listed",
  SERIAL_NUMBER_EXIST: "Chiller with this serial number is already exist.",
  CHILLER_EXPORT: "Chillers Exported successfully.",
};

export const DASHBOARD = {
  DASHBOARD_LIST: "Dashboard details fetch successfully.",
};

export const LOGS = {
  LOG_CREATE: "Log added successfully!",
  LOG_UPDATED: "Log record updated successfully!",
  LOG_LIST: "Log list fetch successfully.",
  LOG_BY_ID: "Log fetched successfully",
  LOG_DELETED: "Log details deleted successfully",
  LOG_EXPORT: "Log Exported successfully.",
  LOG_IMPORT: "Log Imported successfully.",
};
export const MAINTENANCE_LOGS = {
  MAINTENANCE_CREATE: "Maintenance record added successfully.",
  MAINTENANCE_UPDATED: "Maintenance record updated successfully.",
  MAINTENANCE_LIST: "Maintenance record list fetch successfully.",
  MAINTENANCE_BY_ID: "Maintenance fetched successfully",
  MAINTENANCE_DELETED: "Maintenance record deleted successfully.",
  MAINTENANCE_EXPORT: "Maintenance Exported successfully.",
};

export const REPORTS = {
  REPORTS_CREATE: "Reports added successfully.",
  REPORTS_UPDATED: "Reports updated successfully.",
  REPORTS_LIST: "Reports list fetch successfully.",
  REPORTS_BY_ID: "Reports fetched successfully",
  REPORTS_DELETED: "Reports deleted successfully.",
  REPORTS_EXPORT: "Reports Exported successfully.",
  REPORTS_USER: "Report user list fetched successfully.",
  USER_NOT_ACCESS_REPORT: "User don't have access to this report.",
};

export const TIMELINE = {
  TIMELINE_LIST: "Timeline list fetch successfully.",
};

export const CMS = {
  CMS_NOT_FOUND: "CMS not found.",
  CMS_DETAIL: "CMS detail fetched successfully.",
  CMS_EDITED: "CMS updated successfully.",
};
export const PROBLEM_SOLUTION = {
  LIST: "Problem & Solutions list fetch successfully.",
  GET: "Problem & Solutions fetched successfully.",
  UPDATE: "Problem & Solutions details updated successfully.",
};
export const FAQS = {
  FAQS_NOT_FOUND: "FAQ not found.",
  FAQS_DETAIL: "FAQ detail fetched successfully.",
  FAQS_LIST: "FAQs list fetched successfully.",
  FAQS_ADDED: "FAQ added successfully.",
  FAQS_EDITED: "FAQ updated successfully.",
  FAQS_DELETED: "FAQ deleted successfully.",
  FAQS_EXISTS: "FAQ already exists.",
};
export const NOTIFICATION = {
  NOTIFICATION_LIST: "Notification list successfully.",
  NOTIFICATION_DELETED: "Notification deleted successfully.",
};
