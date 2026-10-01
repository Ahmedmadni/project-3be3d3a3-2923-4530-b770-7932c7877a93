import { describe, expect, it } from "vitest";
import { evaluateMeasurement, predicateMatches } from "./measurement-engine";
import { assessRespiratoryRateCaptureQuality } from "./respiratory-rate-quality";
import type {
  MeasurementReferenceRule,
  MeasurementSafetyRule,
  MeasurementTypeDefinition,
} from "@/types/measurements";

const rrType: MeasurementTypeDefinition = {
  id: "rr",
  code: "respiratory_rate",
  nameAr: "معدل التنفس",
  valueKind: "scalar",
  canonicalUnit: "breaths/min",
  allowedUnits: ["breaths/min"],
  components: [],
  reviewStatus: "published",
  isActive: true,
  isDemo: false,
  version: 1,
};

const restingReference: MeasurementReferenceRule = {
  id: "resting-reference",
  measurementTypeId: "rr",
  code: "nhs_adult_resting_rr_12_16",
  labelAr: "مسودة: معدل تنفس راحة شائع لدى بالغ",
  interpretationCode: "resting_reference_12_16",
  predicate: {
    all: [
      { path: "context.age_years", operator: "gte", value: 18 },
      { path: "context.pregnant", operator: "eq", value: false },
      { path: "context.rest_state", operator: "eq", value: "resting" },
      { path: "value", operator: "gte", value: 12 },
      { path: "value", operator: "lte", value: 16 },
    ],
  },
  careLevel: null,
  sourceId: "hee-respiration",
  reviewStatus: "draft",
  isActive: false,
  isDemo: false,
  priority: 30,
  version: 1,
};

const emergencyBreathing: MeasurementSafetyRule = {
  id: "emergency-breathing",
  measurementTypeId: "rr",
  code: "nhs_severe_breathing_difficulty_emergency",
  titleAr: "مسودة: صعوبة تنفس شديدة مع أعراض إنذار",
  predicate: {
    all: [
      { path: "context.age_years", operator: "gte", value: 18 },
      { path: "context.pregnant", operator: "eq", value: false },
      { path: "context.severe_breathing_difficulty", operator: "eq", value: true },
      { path: "context.emergency_respiratory_symptoms_present", operator: "eq", value: true },
    ],
  },
  careLevel: "emergency",
  sourceId: "nhs-shortness-breath",
  reviewStatus: "draft",
  isActive: false,
  isDemo: false,
  priority: 1,
  version: 1,
};

describe("respiratory-rate draft foundation", () => {
  it("keeps the resting reference Draft rule inert in production", () => {
    const result = evaluateMeasurement({
      type: rrType,
      reading: {
        measurementTypeId: "rr",
        measuredAt: "2026-10-02T00:00:00Z",
        scalarValue: 14,
        unit: "breaths/min",
        context: {
          age_years: 40,
          pregnant: false,
          rest_state: "resting",
        },
      },
      referenceRules: [restingReference],
      mode: "production",
    });

    expect(result.referenceMatches).toEqual([]);
  });

  it("does not apply the resting reference after exercise", () => {
    expect(
      predicateMatches(restingReference.predicate, {
        measurementTypeId: "rr",
        measuredAt: "2026-10-02T00:00:00Z",
        scalarValue: 14,
        unit: "breaths/min",
        context: {
          age_years: 40,
          pregnant: false,
          rest_state: "post_exercise",
        },
      }),
    ).toBe(false);
  });

  it("keeps emergency respiratory routing symptom-led instead of number-led", () => {
    expect(
      predicateMatches(emergencyBreathing.predicate, {
        measurementTypeId: "rr",
        measuredAt: "2026-10-02T00:00:00Z",
        scalarValue: 18,
        unit: "breaths/min",
        context: {
          age_years: 50,
          pregnant: false,
          severe_breathing_difficulty: true,
          emergency_respiratory_symptoms_present: true,
        },
      }),
    ).toBe(true);
  });

  it("does not trigger the emergency draft from a fast rate alone", () => {
    expect(
      predicateMatches(emergencyBreathing.predicate, {
        measurementTypeId: "rr",
        measuredAt: "2026-10-02T00:00:00Z",
        scalarValue: 30,
        unit: "breaths/min",
        context: {
          age_years: 50,
          pregnant: false,
          severe_breathing_difficulty: false,
          emergency_respiratory_symptoms_present: false,
        },
      }),
    ).toBe(false);
  });

  it("keeps emergency respiratory Draft rule inert in production", () => {
    const result = evaluateMeasurement({
      type: rrType,
      reading: {
        measurementTypeId: "rr",
        measuredAt: "2026-10-02T00:00:00Z",
        scalarValue: 18,
        unit: "breaths/min",
        context: {
          age_years: 50,
          pregnant: false,
          severe_breathing_difficulty: true,
          emergency_respiratory_symptoms_present: true,
        },
      },
      safetyRules: [emergencyBreathing],
      mode: "production",
    });

    expect(result.safetyMatches).toEqual([]);
  });

  it("accepts a full-minute resting count with rhythm, depth and distress documented", () => {
    expect(
      assessRespiratoryRateCaptureQuality({
        rest_state: "resting",
        relaxed: true,
        count_duration_seconds: 60,
        patient_aware_of_count: false,
        rhythm_regular: true,
        depth: "normal",
        respiratory_distress_present: false,
      }),
    ).toEqual({ quality: "good", issues: [] });
  });

  it("flags short counts and observation conditions likely to distort the rate", () => {
    const result = assessRespiratoryRateCaptureQuality({
      rest_state: "post_exercise",
      relaxed: false,
      count_duration_seconds: 15,
      patient_aware_of_count: true,
    });

    expect(result.quality).toBe("questionable");
    expect(result.issues).toContain("NOT_RESTING");
    expect(result.issues).toContain("COUNT_UNDER_60_SECONDS");
    expect(result.issues).toContain("PATIENT_AWARE_OF_COUNT");
    expect(result.issues).toContain("RHYTHM_NOT_RECORDED");
    expect(result.issues).toContain("DEPTH_NOT_RECORDED");
  });
});
