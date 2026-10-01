import type { MeasurementContext, MeasurementReading } from "@/types/measurements";

export type WeightCaptureIssue =
  | "SCALE_NOT_LEVEL"
  | "SCALE_NOT_CONSISTENT"
  | "SHOES_OR_HEAVY_ITEMS"
  | "NOT_STILL"
  | "TIME_OF_DAY_NOT_RECORDED";

export type HeightCaptureIssue =
  | "SHOES_WORN"
  | "NOT_UPRIGHT"
  | "HEAD_POSITION_NOT_NEUTRAL"
  | "HEIGHT_METHOD_NOT_RECORDED";

export interface CaptureAssessment<T extends string> {
  quality: "good" | "questionable";
  issues: T[];
}

export function normalizeWeightReading(
  reading: MeasurementReading,
): MeasurementReading {
  if (reading.scalarValue === null || reading.scalarValue === undefined) return reading;
  if (reading.unit === "kg") return reading;
  if (reading.unit === "lb") {
    return {
      ...reading,
      scalarValue: reading.scalarValue * 0.45359237,
      unit: "kg",
    };
  }
  return reading;
}

export function normalizeHeightReading(
  reading: MeasurementReading,
): MeasurementReading {
  if (reading.scalarValue === null || reading.scalarValue === undefined) return reading;
  if (reading.unit === "cm") return reading;
  if (reading.unit === "m") {
    return {
      ...reading,
      scalarValue: reading.scalarValue * 100,
      unit: "cm",
    };
  }
  if (reading.unit === "in") {
    return {
      ...reading,
      scalarValue: reading.scalarValue * 2.54,
      unit: "cm",
    };
  }
  return reading;
}

export function calculateBmi(weightKg: number, heightCm: number): number | null {
  if (!Number.isFinite(weightKg) || !Number.isFinite(heightCm)) return null;
  if (weightKg <= 0 || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function assessWeightCaptureQuality(
  context: MeasurementContext,
): CaptureAssessment<WeightCaptureIssue> {
  const issues: WeightCaptureIssue[] = [];

  if (context.scale_level_surface !== true) issues.push("SCALE_NOT_LEVEL");
  if (context.same_scale_for_trend !== true) issues.push("SCALE_NOT_CONSISTENT");
  if (context.shoes_or_heavy_items_removed !== true) {
    issues.push("SHOES_OR_HEAVY_ITEMS");
  }
  if (context.still_until_stable !== true) issues.push("NOT_STILL");
  if (typeof context.time_of_day !== "string" || !context.time_of_day) {
    issues.push("TIME_OF_DAY_NOT_RECORDED");
  }

  return { quality: issues.length ? "questionable" : "good", issues };
}

export function assessHeightCaptureQuality(
  context: MeasurementContext,
): CaptureAssessment<HeightCaptureIssue> {
  const issues: HeightCaptureIssue[] = [];

  if (context.shoes_removed !== true) issues.push("SHOES_WORN");
  if (context.upright_posture !== true) issues.push("NOT_UPRIGHT");
  if (context.head_position_neutral !== true) {
    issues.push("HEAD_POSITION_NOT_NEUTRAL");
  }
  if (typeof context.height_method !== "string" || !context.height_method) {
    issues.push("HEIGHT_METHOD_NOT_RECORDED");
  }

  return { quality: issues.length ? "questionable" : "good", issues };
}
