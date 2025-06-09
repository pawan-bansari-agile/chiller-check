export const PatientResponse = {
  EXIST: "This patient already exists.",
  CREATED: "Patient created successfully.",
};

/**
 * Normalizes a phone number by removing all non-digit characters.
 * @param phoneNumber - The phone number as a string.
 * @returns The normalized phone number as a string of digits.
 */
export const normalizePhoneNumber = (phoneNumber: string): string => {
  if (!phoneNumber) {
    throw new Error("Phone number is required.");
  }

  // Remove all non-digit characters
  let plainNumber = phoneNumber.replace(/\D/g, "");

  // Optionally validate length (e.g., US numbers should be 10 or 11 digits)
  if (plainNumber.length === 10) {
    plainNumber = `1${plainNumber}`;
  }

  return plainNumber;
};

export const calculateAge = (dob: string | Date): number => {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  // Adjust the age if the current date is before the birthday in the current year
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
};

export const extractBucketNameFromKey = (key: string): string => {
  return key?.split("/")[0];
};

export const extractKeyWithoutBucketName = (key: string): string => {
  // Split the key by '/' and remove the first part (bucket name)
  const parts = key.split("/");
  parts.shift(); // Remove the first element (bucket name)
  return parts.join("/"); // Rejoin the remaining parts with '/'
};

export const toSentenceCase = (str: string): string => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};
