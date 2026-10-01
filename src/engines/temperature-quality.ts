import type { MeasurementContext, MeasurementReading } from "@/types/measurements";

export type TemperatureMeasurementSite =
  | "oral"
  | "axillary"
  | "tympanic"
  | "temporal"
  | "rectal"
  | "other";

export type TemperatureCaptureIssue =
  | "MEASUREMENT_SITE_MISSING"
  | "UNSUPPORTED_DEVICE"
  | "RECENT_ORAL_FOOD_OR_DRINK"
  | "FOREHEAD_STRIP_USED"
  | "MERCURY_GLASS_THERMOMETER"
  | "EAR_TECHNIQUE_NOT_CONFIRMED"
  | "AXILLARY_SKIN_CONTACT_NOT_CONFIRMED"
  | "TREND_ROUTE_CHANGED";

export interface TemperatureCaptureAssessment {
  quality: "good" | "questionable";
  issues: TemperatureCaptureIssue[];
}

/**
 * Unit normalization is allowed because Celsius/Fahrenheit conversion is an
 * exact physical-unit transformation. It must not be confused with converting
 * between body measurement sites/routes; CDC/NHSN explicitly advises against
 * route-based temperature conversion.
 */
export function normalizeTemperatureReading(
  reading: MeasurementReading,
): MeasurementReading {
  if (reading.scalarValue === null || reading.scalarValue === undefined) return reading;

  if (reading.unit === "°C") return reading;

  if (reading.unit === "°F") {
    return {
      ...reading,
      scalarValue: ((reading.scalarValue - 32) * 5) / 9,
      unit: "°C",
    };
  }

  return reading;
}

/**
 * Capture-quality checks only. This function does not diagnose fever,
 * hypothermia, infection, or any other condition.
 */
export function assessTemperatureCaptureQuality(
  context: MeasurementContext,
): TemperatureCaptureAssessment {
  const issues: TemperatureCaptureIssue[] = [];
  const site = context.measurement_site;

  if (typeof site !== "string" || !site) issues.push("MEASUREMENT_SITE_MISSING");
  if (context.device_supported !== true) issues.push("UNSUPPORTED_DEVICE");
  if (site === "oral" && context.recent_food_or_drink === true) {
    issues.push("RECENT_ORAL_FOOD_OR_DRINK");
  }
  if (context.device_type === "forehead_strip") issues.push("FOREHEAD_STRIP_USED");
  if (context.device_type === "mercury_glass") issues.push("MERCURY_GLASS_THERMOMETER");
  if (site === "tympanic" && context.ear_technique_confirmed !== true) {
    issues.push("EAR_TECHNIQUE_NOT_CONFIRMED");
  }
  if (site === "axillary" && context.skin_contact_confirmed !== true) {
    issues.push("AXILLARY_SKIN_CONTACT_NOT_CONFIRMED");
  }
  if (
    typeof context.previous_measurement_site === "string" &&
    typeof site === "string" &&
    context.previous_measurement_site !== site
  ) {
    issues.push("TREND_ROUTE_CHANGED");
  }

  return {
    quality: issues.length ? "questionable" : "good",
    issues,
  };
}
