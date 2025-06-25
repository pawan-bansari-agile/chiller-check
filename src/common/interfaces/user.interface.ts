import { ModulePermission } from "src/module/user/types/user.types";
import { Role } from "../constants/enum.constant";

export interface PasswordLoginInterface {
  verifyToken: string;
  phoneNumber: string;
  isPasswordSetup?: boolean;
  isAccountVerified?: boolean;
  isAdditionalInfoAdded?: boolean;
  isInsuranceDetailAdded?: boolean;
  isCardAdded?: boolean;
}
export interface UserLoginInterface {
  _id: unknown;
  firstName: string;
  lastName: string;
  email?: string;
  profileImage?: string;
  phoneNumber?: string;
  dob?: Date;
  accessToken?: string;
  role: Role;
  deviceId: string;
  deviceType: string;
  permissions?: Record<string, ModulePermission>;
}

export interface CreateDeviceInterface {
  userId: unknown;
  accessToken: string;
  role: string;
  fcmToken: string;
  deviceId: string;
  deviceType: string;
}

export interface DateRangeQuery {
  $gte?: Date;
  $lte?: Date;
}

export interface CreateInitialUserInterface {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  role: Role;
  phoneNumber: string;
}

export interface CreateProfile {
  _id?: unknown;
  profilePicture: string;
}
