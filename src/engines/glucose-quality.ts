import type { MeasurementContext, MeasurementReading } from "@/types/measurements";

const MGDL_PER_MMOLL = 18.0182;

export type GlucoseCaptureIssue =
  | "SAMPLE_SOURCE_MISSING"
  | "METER_NOT_SUPPORTED"
  | "HANDS_NOT_WASHED_AND_DRY"
  | "STRIP_NOT_COMPATIBLE"
  | "STRIP_EXPIRED_OR_STORAGE_UNCERTAIN"
  | "SAMPLE_INSUFFICIENT"
  | "ALTERNATE_SITE_DURING_RAPID_CHANGE"
  | "DIAGNOSTIC_CONTEXT_REQUIRES_LAB_PLASMA";

export interface GlucoseCaptureAssessment {
  quality: "good" | "questionable";
  issues: GlucoseCaptureIssue[];
}

/**
 * Exact unit normalization for glucose concentration.
 * This does not change sample type (capillary vs venous plasma), timing
 * context, or diagnostic eligibility.
 */
export function normalizeGlucoseReading(
  reading: MeasurementReading,
): MeasurementReading {
  if (reading.scalarValue === null || reading.scalarValue === undefined) return reading;
  if (reading.unit === "mg/dL") return reading;

  if (reading.unit === "mmol/L") {
    return {
      ...reading,
      scalarValue: reading.scalarValue * MGDL_PER_MMOLL,
      unit: "mg/dL",
    };
  }

  return reading;
}

/**
 * Capture-quality checks only. A home meter can support monitoring, but this
 * helper intentionally flags diagnostic use unless the sample is documented
 * as laboratory venous plasma.
 */
export function assessGlucoseCaptureQuality(
  context: MeasurementContext,
): GlucoseCaptureAssessment {
  const issues: GlucoseCaptureIssue[] = [];

  if (typeof context.sample_source !== "string" || !context.sample_source) {
    issues.push("SAMPLE_SOURCE_MISSING");
  }

  if (context.measurement_method === "home_meter") {
    if (context.meter_supported !== true) issues.push("METER_NOT_SUPPORTED");
    if (context.hands_washed_and_dry !== true) {
      issues.push("HANDS_NOT_WASHED_AND_DRY");
    }
    if (context.strip_compatible !== true) issues.push("STRIP_NOT_COMPATIBLE");
    if (
      context.strip_expired === true ||
      context.strip_storage_ok !== true
    ) {
      issues.push("STRIP_EXPIRED_OR_STORAGE_UNCERTAIN");
    }
    if (context.sample_sufficient !== true) issues.push("SAMPLE_INSUFFICIENT");

    if (
      context.sample_site !== "fingertip" &&
      context.rapid_glucose_change_expected === true
    ) {
      issues.push("ALTERNATE_SITE_DURING_RAPID_CHANGE");
    }
  }

  if (
    context.diagnostic_intent === true &&
    !(
      context.measurement_method === "laboratory" &&
      context.sample_source === "venous_plasma"
    )
  ) {
    issues.push("DIAGNOSTIC_CONTEXT_REQUIRES_LAB_PLASMA");
  }

  return {
    quality: issues.length ? "questionable" : "good",
    issues,
  };
}
