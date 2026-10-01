import type { MeasurementContext } from "@/types/measurements";

export type PulseCaptureIssue =
  | "NOT_RESTING"
  | "NOT_CALM"
  | "POST_EXERCISE"
  | "MANUAL_COUNT_UNDER_60_SECONDS"
  | "DEVICE_NOT_SUPPORTED"
  | "RHYTHM_REGULARITY_NOT_RECORDED"
  | "POSITION_NOT_RECORDED";

export interface PulseCaptureAssessment {
  quality: "good" | "questionable";
  issues: PulseCaptureIssue[];
}

/**
 * Capture-quality checks for resting pulse.
 * This function does not diagnose tachycardia, bradycardia, or arrhythmia.
 */
export function assessPulseCaptureQuality(
  context: MeasurementContext,
): PulseCaptureAssessment {
  const issues: PulseCaptureIssue[] = [];

  if (context.rest_state !== "resting") issues.push("NOT_RESTING");
  if (context.calm !== true) issues.push("NOT_CALM");
  if (context.recent_exercise === true) issues.push("POST_EXERCISE");

  if (
    context.measurement_method === "manual" &&
    (typeof context.count_duration_seconds !== "number" ||
      context.count_duration_seconds < 60)
  ) {
    issues.push("MANUAL_COUNT_UNDER_60_SECONDS");
  }

  if (
    context.measurement_method === "device" &&
    context.device_supported !== true
  ) {
    issues.push("DEVICE_NOT_SUPPORTED");
  }

  if (
    context.rhythm_regular !== true &&
    context.rhythm_regular !== false
  ) {
    issues.push("RHYTHM_REGULARITY_NOT_RECORDED");
  }

  if (
    context.body_position !== "sitting" &&
    context.body_position !== "lying"
  ) {
    issues.push("POSITION_NOT_RECORDED");
  }

  return {
    quality: issues.length ? "questionable" : "good",
    issues,
  };
}
