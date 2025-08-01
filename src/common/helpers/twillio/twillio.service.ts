import * as dotenv from "dotenv";
dotenv.config();

const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
import * as twilio from "twilio";
import { TypeExceptions } from "../exceptions";
const client = twilio(accountSid, authToken);

// Helper function to format the phone number into E.164 format
const formatPhoneNumber = (phoneNumber: string) => {
  // Ensure that the phone number starts with '+'
  if (!phoneNumber.startsWith("+")) {
    // Assuming India as the default country for this example
    return `+91${phoneNumber}`;
  }
  return phoneNumber;
};

export const sendOTP = async (phoneNumber: string) => {
  console.log("phoneNumber: ", phoneNumber);
  try {
    const formattedPhoneNumber = formatPhoneNumber(phoneNumber); // Format phone number
    console.log("✌️formattedPhoneNumber --->", formattedPhoneNumber);

    const verification = await client.verify.v2
      .services(process.env.VERIFY_SERVICE_SID)
      .verifications.create({ to: formattedPhoneNumber, channel: "sms" });

    return { success: true, sid: verification.sid };
  } catch (error) {
    console.log("error: ", error);
    return { success: false, error: error.message };
  }
};
export const verifyOTP = async (phoneNumber: string, code: string) => {
  try {
    const formattedPhoneNumber = formatPhoneNumber(phoneNumber); // Format phone number
    console.log("✌️formattedPhoneNumber --->", formattedPhoneNumber);

    const verificationCheck = await client.verify.v2
      .services(process.env.VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: formattedPhoneNumber, code });

    if (verificationCheck.status === "approved") {
      return { success: true };
    } else {
      return { success: false, error: "Invalid code" };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const validateUSMobileNumber = async (phone: string) => {
  try {
    const formattedPhone = formatPhoneNumber(phone);
    // Use the same client instance you've already created
    const lookup = await client.lookups.v1
      .phoneNumbers(formattedPhone)
      .fetch({ type: ["carrier"] });

    const carrierType = lookup.carrier?.type;

    const isMobile =
      typeof carrierType === "string" && carrierType === "mobile";

    if (!lookup.phoneNumber) {
      throw TypeExceptions.BadRequestCommonFunction("Invalid phone number");
    }

    if (!isMobile) {
      throw TypeExceptions.BadRequestCommonFunction(
        "Phone number is not a mobile number",
      );
    }

    // Passed all checks
    return { success: true };
  } catch (err) {
    console.error("Phone number validation failed:", err.message);
    return { success: false, error: err.message };
  }
};
