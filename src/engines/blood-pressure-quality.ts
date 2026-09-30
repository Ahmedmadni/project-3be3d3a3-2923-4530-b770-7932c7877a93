import type { MeasurementContext } from "@/types/measurements";

export type BloodPressureQualityIssue =
  | "DEVICE_NOT_VALIDATED"
  | "CUFF_SIZE_NOT_CONFIRMED"
  | "REST_UNDER_5_MINUTES"
  | "BACK_NOT_SUPPORTED"
  | "FEET_NOT_FLAT"
  | "LEGS_CROSSED"
  | "ARM_NOT_SUPPORTED_AT_HEART_LEVEL"
  | "CUFF_OVER_CLOTHING"
  | "TALKING_DURING_MEASUREMENT"
  | "RECENT_SMOKING_CAFFEINE_OR_EXERCISE";

export interface BloodPressureQualityAssessment {
  quality: "good" | "questionable";
  issues: BloodPressureQualityIssue[];
}

/**
 * Technique-quality checks derived from reviewed BP-measurement guidance.
 * This function does not interpret BP values or diagnose hypertension.
 */
export function assessBloodPressureCaptureQuality(
  context: MeasurementContext,
): BloodPressureQualityAssessment {
  const issues: BloodPressureQualityIssue[] = [];

  if (context.device_validated !== true) issues.push("DEVICE_NOT_VALIDATED");
  if (context.cuff_size_confirmed !== true) issues.push("CUFF_SIZE_NOT_CONFIRMED");
  if (typeof context.rest_minutes !== "number" || context.rest_minutes < 5) {
    issues.push("REST_UNDER_5_MINUTES");
  }
  if (context.back_supported !== true) issues.push("BACK_NOT_SUPPORTED");
  if (context.feet_flat !== true) issues.push("FEET_NOT_FLAT");
  if (context.legs_crossed === true) issues.push("LEGS_CROSSED");
  if (context.arm_supported_at_heart_level !== true) {
    issues.push("ARM_NOT_SUPPORTED_AT_HEART_LEVEL");
  }
  if (context.cuff_over_clothing === true) issues.push("CUFF_OVER_CLOTHING");
  if (context.talking_during_measurement === true) {
    issues.push("TALKING_DURING_MEASUREMENT");
  }
  if (context.recent_smoking_caffeine_or_exercise_30m === true) {
    issues.push("RECENT_SMOKING_CAFFEINE_OR_EXERCISE");
  }

  return {
    quality: issues.length ? "questionable" : "good",
    issues,
  };
}
