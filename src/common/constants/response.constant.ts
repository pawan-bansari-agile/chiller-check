export const RESPONSE_SUCCESS = {
  SUCCESS: "Success.",
  SERVER_RUNNING: "Server is running.",
  USER_LOGIN: "You have successfully logged in to your account.",
  USER_SEND_OTP: "OTP has been sent to your registered mobile number/email.",
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
  TEST_USER_LOADED: "Test User Loaded successfully",
  TEST_USER_ALREADY_LOADED: "Test User already loaded!",
};

export const RESPONSE_ERROR = {
  USER_NOT_FOUND: "User not found.",
  USER_ALREADY_EXIST: "User already exist",
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
    "Facility with this name already exists under the selected company",
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
};

export const AUTHENTICATION = {
  PASSWORD_PATTERN_NOT_MATCHED:
    "Password must contain 8 characters which include one upper case, one lower case, one special character and one number.",
  PASSWORD_RESET_TOKEN_EXPIRED:
    "Your password reset link has been expired, Please request a new one and try again.",
  OTP_SEND: "OTP has been sent to your registered mobile number/email.",
};

export const USER = {
  COMPLETE_PROFILE: "Profile completed successfully.",
  INSURANCE_PROVIDER_LIST: "Insurance Provider list successfully.",
  PROVIDER_LIST: "Provider list fetched successfully.",
  USER_PROFILE: "User details has been fetched successfully.",
  USER_UPDATE: "Profile updated successfully.",
  USER_NOT_FOUND: "User not found.",
  PASSWORD_NOT_CURRENT: "New password should not be same as current password.",
  CUREENT_PASSWORD: "Current password is invalid.",
  USER_STATUS_UPDATED: "User status updated!",
};

export const COMPANY = {
  COMPANY_CREATE: "Company added successfully.",
  COMPANY_UPDATE: "Company details updated successfully.",
  COMPANY_DELETE: "Company deleted successfully.",
  COMPANY_LIST: "Company list fetch successfully.",
  COMPANY_FOUND: "Company Found.",
  COMPANY_STATUS_UPDATED: "Company status updated!",
};

export const FACILITY = {
  FACILITY_CREATE: "Facility added successfully.",
  FACILITY_UPDATE: "Facility details updated successfully.",
  FACILITY_DELETE: "Facility deleted successfully.",
  FACILITY_LIST: "Facility list fetch successfully.",
  FACILITY_BY_ID: "Facility fetched successfully",
  FACILITY_STATUS_UPDATED: "Facility status updated!",
};

export const CMS = {
  CMS_NOT_FOUND: "CMS not found.",
  CMS_DETAIL: "CMS detail fetched successfully.",
  CMS_EDITED: "CMS updated successfully.",
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
