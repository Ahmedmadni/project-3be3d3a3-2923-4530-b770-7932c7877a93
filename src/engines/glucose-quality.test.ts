import { describe, expect, it } from "vitest";
import { evaluateMeasurement, predicateMatches } from "./measurement-engine";
import {
  assessGlucoseCaptureQuality,
  normalizeGlucoseReading,
} from "./glucose-quality";
import type {
  MeasurementReferenceRule,
  MeasurementSafetyRule,
  MeasurementTypeDefinition,
} from "@/types/measurements";

const glucoseType: MeasurementTypeDefinition = {
  id: "glucose",
  code: "blood_glucose",
  nameAr: "سكر الدم",
  valueKind: "scalar",
  canonicalUnit: "mg/dL",
  allowedUnits: ["mg/dL", "mmol/L"],
  components: [],
  reviewStatus: "published",
  isActive: true,
  isDemo: false,
  version: 1,
};

const fastingDiabetesRange: MeasurementReferenceRule = {
  id: "fasting-diabetes-range",
  measurementTypeId: "glucose",
  code: "ada_2026_nonpregnant_fpg_diabetes_range",
  labelAr: "مسودة: نتيجة صيام مخبرية ضمن نطاق تشخيص السكري",
  interpretationCode: "diabetes_range_fpg",
  predicate: {
    all: [
      { path: "context.age_years", operator: "gte", value: 18 },
      { path: "context.pregnant", operator: "eq", value: false },
      { path: "context.measurement_method", operator: "eq", value: "laboratory" },
      { path: "context.sample_source", operator: "eq", value: "venous_plasma" },
      { path: "context.timing", operator: "eq", value: "fasting" },
      { path: "context.fasting_hours", operator: "gte", value: 8 },
      { path: "value", operator: "gte", value: 126 },
    ],
  },
  careLevel: null,
  sourceId: "ada-2026",
  reviewStatus: "draft",
  isActive: false,
  isDemo: false,
  priority: 10,
  version: 1,
};

const randomSymptomaticDiabetesRange: MeasurementReferenceRule = {
  ...fastingDiabetesRange,
  id: "random-symptomatic",
  code: "ada_2026_nonpregnant_random_symptomatic_diabetes_range",
  labelAr: "مسودة: جلوكوز عشوائي مخبري مع أعراض كلاسيكية ضمن نطاق التشخيص",
  interpretationCode: "diabetes_range_random_symptomatic",
  predicate: {
    all: [
      { path: "context.age_years", operator: "gte", value: 18 },
      { path: "context.pregnant", operator: "eq", value: false },
      { path: "context.measurement_method", operator: "eq", value: "laboratory" },
      { path: "context.sample_source", operator: "eq", value: "venous_plasma" },
      { path: "context.timing", operator: "eq", value: "random" },
      { path: "context.classic_hyperglycemia_symptoms", operator: "eq", value: true },
      { path: "value", operator: "gte", value: 200 },
    ],
  },
};

const severeHypo: MeasurementSafetyRule = {
  id: "severe-hypo",
  measurementTypeId: "glucose",
  code: "nhs_low_glucose_with_severe_neuroglycopenic_symptoms",
  titleAr: "مسودة: سكر منخفض مع أعراض شديدة",
  predicate: {
    all: [
      { path: "context.age_years", operator: "gte", value: 18 },
      { path: "context.pregnant", operator: "eq", value: false },
      { path: "context.severe_hypoglycemia_symptoms_present", operator: "eq", value: true },
      { path: "value", operator: "lt", value: 72.0728 },
    ],
  },
  careLevel: "emergency",
  sourceId: "nhs-hypo",
  reviewStatus: "draft",
  isActive: false,
  isDemo: false,
  priority: 1,
  version: 1,
};

describe("blood glucose draft foundation", () => {
  it("normalizes mmol/L to mg/dL without changing clinical context", () => {
    const normalized = normalizeGlucoseReading({
      measurementTypeId: "glucose",
      measuredAt: "2026-10-02T00:00:00Z",
      scalarValue: 7,
      unit: "mmol/L",
      context: { timing: "fasting" },
    });

    expect(normalized.unit).toBe("mg/dL");
    expect(normalized.scalarValue).toBeCloseTo(126.1274, 4);
    expect(normalized.context?.timing).toBe("fasting");
  });

  it("does not use a home capillary meter as a diagnostic fasting test", () => {
    expect(
      predicateMatches(fastingDiabetesRange.predicate, {
        measurementTypeId: "glucose",
        measuredAt: "2026-10-02T00:00:00Z",
        scalarValue: 140,
        unit: "mg/dL",
        context: {
          age_years: 45,
          pregnant: false,
          measurement_method: "home_meter",
          sample_source: "capillary_whole_blood",
          timing: "fasting",
          fasting_hours: 10,
        },
      }),
    ).toBe(false);
  });

  it("requires at least eight fasting hours for the FPG draft rule", () => {
    expect(
      predicateMatches(fastingDiabetesRange.predicate, {
        measurementTypeId: "glucose",
        measuredAt: "2026-10-02T00:00:00Z",
        scalarValue: 140,
        unit: "mg/dL",
        context: {
          age_years: 45,
          pregnant: false,
          measurement_method: "laboratory",
          sample_source: "venous_plasma",
          timing: "fasting",
          fasting_hours: 6,
        },
      }),
    ).toBe(false);
  });

  it("requires classic symptoms for the random plasma glucose diagnostic draft", () => {
    expect(
      predicateMatches(randomSymptomaticDiabetesRange.predicate, {
        measurementTypeId: "glucose",
        measuredAt: "2026-10-02T00:00:00Z",
        scalarValue: 220,
        unit: "mg/dL",
        context: {
          age_years: 50,
          pregnant: false,
          measurement_method: "laboratory",
          sample_source: "venous_plasma",
          timing: "random",
          classic_hyperglycemia_symptoms: false,
        },
      }),
    ).toBe(false);
  });

  it("keeps diagnostic Draft rules inert in production", () => {
    const result = evaluateMeasurement({
      type: glucoseType,
      reading: {
        measurementTypeId: "glucose",
        measuredAt: "2026-10-02T00:00:00Z",
        scalarValue: 130,
        unit: "mg/dL",
        context: {
          age_years: 45,
          pregnant: false,
          measurement_method: "laboratory",
          sample_source: "venous_plasma",
          timing: "fasting",
          fasting_hours: 10,
        },
      },
      referenceRules: [fastingDiabetesRange],
      mode: "production",
    });

    expect(result.referenceMatches).toEqual([]);
  });

  it("keeps severe-hypoglycemia Draft routing inert in production", () => {
    const result = evaluateMeasurement({
      type: glucoseType,
      reading: {
        measurementTypeId: "glucose",
        measuredAt: "2026-10-02T00:00:00Z",
        scalarValue: 60,
        unit: "mg/dL",
        context: {
          age_years: 55,
          pregnant: false,
          severe_hypoglycemia_symptoms_present: true,
        },
      },
      safetyRules: [severeHypo],
      mode: "production",
    });

    expect(result.safetyMatches).toEqual([]);
  });

  it("flags a home-meter reading used for diagnosis", () => {
    const result = assessGlucoseCaptureQuality({
      diagnostic_intent: true,
      measurement_method: "home_meter",
      sample_source: "capillary_whole_blood",
      meter_supported: true,
      hands_washed_and_dry: true,
      strip_compatible: true,
      strip_expired: false,
      strip_storage_ok: true,
      sample_sufficient: true,
      sample_site: "fingertip",
      rapid_glucose_change_expected: false,
    });

    expect(result.quality).toBe("questionable");
    expect(result.issues).toContain("DIAGNOSTIC_CONTEXT_REQUIRES_LAB_PLASMA");
  });

  it("accepts a careful fingertip home monitoring reading as good capture", () => {
    expect(
      assessGlucoseCaptureQuality({
        diagnostic_intent: false,
        measurement_method: "home_meter",
        sample_source: "capillary_whole_blood",
        meter_supported: true,
        hands_washed_and_dry: true,
        strip_compatible: true,
        strip_expired: false,
        strip_storage_ok: true,
        sample_sufficient: true,
        sample_site: "fingertip",
        rapid_glucose_change_expected: false,
      }),
    ).toEqual({ quality: "good", issues: [] });
  });
});
