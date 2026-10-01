import type { MeasurementContext } from "@/types/measurements";

export type PulseOximeterQualityIssue =
  | "DEVICE_NOT_MEDICAL_PURPOSE"
  | "HAND_NOT_WARM"
  | "NAIL_POLISH_PRESENT"
  | "MOTION_DURING_READING"
  | "READING_NOT_STABLE"
  | "POOR_CIRCULATION"
  | "CURRENT_TOBACCO_USE"
  | "SIGNAL_QUALITY_NOT_CONFIRMED";

export interface PulseOximeterQualityAssessment {
  quality: "good" | "questionable";
  issues: PulseOximeterQualityIssue[];
}

/**
 * Capture-quality checks for fingertip pulse oximetry.
 *
 * This assesses whether the reading conditions are trustworthy enough to
 * interpret. It does not diagnose hypoxemia and does not alter the numeric
 * SpO2 value.
 */
export function assessPulseOximeterCaptureQuality(
  context: MeasurementContext,
): PulseOximeterQualityAssessment {
  const issues: PulseOximeterQualityIssue[] = [];

  if (context.device_intended_for_medical_use !== true) {
    issues.push("DEVICE_NOT_MEDICAL_PURPOSE");
  }
  if (context.hand_warm !== true) issues.push("HAND_NOT_WARM");
  if (context.nail_polish_removed !== true) issues.push("NAIL_POLISH_PRESENT");
  if (context.motion_free !== true) issues.push("MOTION_DURING_READING");
  if (context.reading_stable !== true) issues.push("READING_NOT_STABLE");
  if (context.poor_circulation === true) issues.push("POOR_CIRCULATION");
  if (context.current_tobacco_use === true) issues.push("CURRENT_TOBACCO_USE");
  if (context.signal_quality_ok !== true) issues.push("SIGNAL_QUALITY_NOT_CONFIRMED");

  return {
    quality: issues.length ? "questionable" : "good",
    issues,
  };
}
