import type { MeasurementContext } from "@/types/measurements";

export type RespiratoryRateCaptureIssue =
  | "NOT_RESTING"
  | "NOT_RELAXED"
  | "COUNT_UNDER_60_SECONDS"
  | "PATIENT_AWARE_OF_COUNT"
  | "RHYTHM_NOT_RECORDED"
  | "DEPTH_NOT_RECORDED"
  | "DISTRESS_NOT_RECORDED";

export interface RespiratoryRateCaptureAssessment {
  quality: "good" | "questionable";
  issues: RespiratoryRateCaptureIssue[];
}

/**
 * Capture-quality checks for adult resting respiratory rate.
 * This function does not diagnose tachypnoea, bradypnoea, respiratory failure,
 * or any specific disease.
 */
export function assessRespiratoryRateCaptureQuality(
  context: MeasurementContext,
): RespiratoryRateCaptureAssessment {
  const issues: RespiratoryRateCaptureIssue[] = [];

  if (context.rest_state !== "resting") issues.push("NOT_RESTING");
  if (context.relaxed !== true) issues.push("NOT_RELAXED");

  if (
    typeof context.count_duration_seconds !== "number" ||
    context.count_duration_seconds < 60
  ) {
    issues.push("COUNT_UNDER_60_SECONDS");
  }

  if (context.patient_aware_of_count === true) {
    issues.push("PATIENT_AWARE_OF_COUNT");
  }

  if (
    context.rhythm_regular !== true &&
    context.rhythm_regular !== false
  ) {
    issues.push("RHYTHM_NOT_RECORDED");
  }

  if (
    context.depth !== "shallow" &&
    context.depth !== "normal" &&
    context.depth !== "deep"
  ) {
    issues.push("DEPTH_NOT_RECORDED");
  }

  if (
    context.respiratory_distress_present !== true &&
    context.respiratory_distress_present !== false
  ) {
    issues.push("DISTRESS_NOT_RECORDED");
  }

  return {
    quality: issues.length ? "questionable" : "good",
    issues,
  };
}
