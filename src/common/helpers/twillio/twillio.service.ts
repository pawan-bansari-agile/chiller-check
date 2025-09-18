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

export const sendOTP = async (phoneNumber?: string, email?: string) => {
  console.log("phoneNumber: ", phoneNumber);
  console.log("✌️email --->", email);
  try {
    let to: string;
    let channel: "sms" | "email";

    if (phoneNumber) {
      to = formatPhoneNumber(phoneNumber);
      channel = "sms";
    } else if (email) {
      to = email;
      channel = "email";
    } else {
      throw new Error("Either phoneNumber or email must be provided");
    }

    console.log("Sending OTP to:", to, "via", channel);
    console.log("✌️to --->", to);

    // const formattedPhoneNumber = formatPhoneNumber(phoneNumber); // Format phone number
    // console.log("✌️formattedPhoneNumber --->", formattedPhoneNumber);

    const verification = await client.verify.v2
      .services(process.env.VERIFY_SERVICE_SID)
      .verifications.create({ to: to, channel: channel });

    return { success: true, sid: verification.sid };
  } catch (error) {
    console.log("error: ", error);
    return { success: false, error: error.message };
  }
};
export const verifyOTP = async (
  code: string,
  phoneNumber?: string,
  email?: string,
) => {
  try {
    let to: string;

    if (phoneNumber) {
      to = formatPhoneNumber(phoneNumber);
    } else if (email) {
      to = email;
    } else {
      throw new Error("Either phoneNumber or email must be provided");
    }

    console.log("Verifying OTP for:", to);
    console.log("✌️to --->", to);

    // const formattedPhoneNumber = formatPhoneNumber(phoneNumber); // Format phone number
    // console.log('✌️formattedPhoneNumber --->', formattedPhoneNumber);

    const verificationCheck = await client.verify.v2
      .services(process.env.VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: to, code });

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
