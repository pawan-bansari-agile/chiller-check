export const RESPONSE_SUCCESS = {
  SUCCESS: "Success.",
  SERVER_RUNNING: "Server is running.",
  USER_LOGIN: "Logged in successfully.",
  USER_LOGOUT: "User Successfully Logout.",
  USER_LISTED: "User list fetch successfully.",
  USER_INSERTED: "User Created.",
  USER_UPDATED: "User Updated.",
  COMPANY_CREATED: "Company Created.",
  USER_DELETED: "User Deleted.",
  RECORD_LISTED: "Records Listed.",
  RECORD_INSERTED: "Record Inserted.",
  RECORD_UPDATED: "Record Updated.",
  RECORD_DELETED: "Record Deleted.",
  INITIAL_USER_LOADED: "Initial user loaded successfully.",
  INITIAL_USER_ALREADY_LOADED: "Initial user already loaded.",
  CMS_LOADED: "Cms loaded successfully.",
  CMS_ALREADY_LOADED: "Cms already loaded.",
  PASSWORD_RESET_TOKEN:
    "Reset password link will be sent to your email. please follow that link to reset your password.",
  PASSWORD_RESET: "Password reset successfully.",
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
  COMPANY_ALREADY_EXISTS: "A Company with this name already exists!",
  FACILITY_NAME_EXISTS: "Facility with the same already exists!",
  DUPLICATE_FACILITY_NAMES_IN_PAYLOAD:
    "A company cannot have facilities with the same name",
};

export const AUTHENTICATION = {
  PASSWORD_PATTERN_NOT_MATCHED:
    "Password must contain 8 characters which include one upper case, one lower case, one special character and one number.",
  PASSWORD_RESET_TOKEN_EXPIRED:
    "Your password reset link has been expired, Please request a new one and try again.",
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
};

export const CARDS = {
  CARD_CREATE: "Card saved successfully.",
  CARD_DELETE: "Card deleted successfully.",
  CARD_DEFAULT: "Default payment method updated.",
  CARD_LIST: "Card list successfully.",
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
