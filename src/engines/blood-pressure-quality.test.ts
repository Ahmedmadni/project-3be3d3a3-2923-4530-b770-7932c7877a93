import { describe, expect, it } from "vitest";
import { assessBloodPressureCaptureQuality } from "./blood-pressure-quality";
import { evaluateMeasurement, predicateMatches } from "./measurement-engine";
import type {
  MeasurementReferenceRule,
  MeasurementSafetyRule,
  MeasurementTypeDefinition,
} from "@/types/measurements";

const bpType: MeasurementTypeDefinition = {
  id: "bp",
  code: "blood_pressure",
  nameAr: "ضغط الدم",
  valueKind: "compound",
  canonicalUnit: null,
  allowedUnits: [],
  components: [
    { code: "systolic", labelAr: "الانقباضي", unit: "mmHg", required: true },
    { code: "diastolic", labelAr: "الانبساطي", unit: "mmHg", required: true },
  ],
  reviewStatus: "published",
  isActive: true,
  isDemo: false,
  version: 1,
};

const stage1: MeasurementReferenceRule = {
  id: "stage1",
  measurementTypeId: "bp",
  code: "adult_nonpregnant_stage_1",
  labelAr: "مسودة تصنيف المرحلة الأولى",
  interpretationCode: "stage_1",
  predicate: {
    all: [
      { path: "context.age_years", operator: "gte", value: 18 },
      { path: "context.pregnant", operator: "eq", value: false },
    ],
    anyOf: [
      [
        { path: "components.systolic", operator: "gte", value: 130 },
        { path: "components.systolic", operator: "lt", value: 140 },
      ],
      [
        { path: "components.diastolic", operator: "gte", value: 80 },
        { path: "components.diastolic", operator: "lt", value: 90 },
      ],
    ],
  },
  careLevel: null,
  sourceId: "aha-2025",
  reviewStatus: "draft",
  isActive: false,
  isDemo: false,
  priority: 30,
  version: 1,
};

const stage2: MeasurementReferenceRule = {
  ...stage1,
  id: "stage2",
  code: "adult_nonpregnant_stage_2",
  interpretationCode: "stage_2",
  predicate: {
    all: [
      { path: "context.age_years", operator: "gte", value: 18 },
      { path: "context.pregnant", operator: "eq", value: false },
    ],
    any: [
      { path: "components.systolic", operator: "gte", value: 140 },
      { path: "components.diastolic", operator: "gte", value: 90 },
    ],
  },
  priority: 20,
};

const emergency: MeasurementSafetyRule = {
  id: "emergency",
  measurementTypeId: "bp",
  code: "adult_nonpregnant_hypertensive_emergency_draft",
  titleAr: "مسودة قاعدة طوارئ ارتفاع الضغط مع أعراض إنذار",
  predicate: {
    all: [
      { path: "context.age_years", operator: "gte", value: 18 },
      { path: "context.pregnant", operator: "eq", value: false },
      { path: "context.bp_red_flag_symptoms_present", operator: "eq", value: true },
    ],
    any: [
      { path: "components.systolic", operator: "gt", value: 180 },
      { path: "components.diastolic", operator: "gt", value: 120 },
    ],
  },
  careLevel: "emergency",
  sourceId: "aha-2025",
  reviewStatus: "draft",
  isActive: false,
  isDemo: false,
  priority: 1,
  version: 1,
};

describe("blood-pressure draft foundation", () => {
  it("supports grouped OR ranges without flattening clinical logic", () => {
    const reading = {
      measurementTypeId: "bp",
      measuredAt: "2026-10-01T00:00:00Z",
      components: { systolic: 135, diastolic: 75 },
      context: { age_years: 40, pregnant: false },
    };

    expect(predicateMatches(stage1.predicate, reading)).toBe(true);
    expect(predicateMatches(stage2.predicate, reading)).toBe(false);
  });

  it("uses rule priority to choose the primary classification when categories overlap", () => {
    const result = evaluateMeasurement({
      type: bpType,
      reading: {
        measurementTypeId: "bp",
        measuredAt: "2026-10-01T00:00:00Z",
        components: { systolic: 145, diastolic: 85 },
        context: { age_years: 40, pregnant: false },
      },
      referenceRules: [
        { ...stage1, reviewStatus: "published", isActive: true },
        { ...stage2, reviewStatus: "published", isActive: true },
      ],
      mode: "production",
    });

    expect(result.primaryReferenceMatch?.code).toBe("adult_nonpregnant_stage_2");
  });

  it("does not apply nonpregnant adult draft rules during pregnancy", () => {
    expect(
      predicateMatches(stage2.predicate, {
        measurementTypeId: "bp",
        measuredAt: "2026-10-01T00:00:00Z",
        components: { systolic: 150, diastolic: 95 },
        context: { age_years: 30, pregnant: true },
      }),
    ).toBe(false);
  });

  it("keeps draft emergency thresholds inert in production", () => {
    const result = evaluateMeasurement({
      type: bpType,
      reading: {
        measurementTypeId: "bp",
        measuredAt: "2026-10-01T00:00:00Z",
        components: { systolic: 190, diastolic: 125 },
        context: {
          age_years: 55,
          pregnant: false,
          bp_red_flag_symptoms_present: true,
        },
      },
      safetyRules: [emergency],
      mode: "production",
    });

    expect(result.safetyMatches).toEqual([]);
  });

  it("requires red-flag symptoms for the draft emergency rule", () => {
    expect(
      predicateMatches(emergency.predicate, {
        measurementTypeId: "bp",
        measuredAt: "2026-10-01T00:00:00Z",
        components: { systolic: 190, diastolic: 125 },
        context: {
          age_years: 55,
          pregnant: false,
          bp_red_flag_symptoms_present: false,
        },
      }),
    ).toBe(false);
  });

  it("marks a well-prepared home reading as good-quality capture", () => {
    expect(
      assessBloodPressureCaptureQuality({
        device_validated: true,
        cuff_size_confirmed: true,
        rest_minutes: 5,
        back_supported: true,
        feet_flat: true,
        legs_crossed: false,
        arm_supported_at_heart_level: true,
        cuff_over_clothing: false,
        talking_during_measurement: false,
        recent_smoking_caffeine_or_exercise_30m: false,
      }),
    ).toEqual({ quality: "good", issues: [] });
  });

  it("surfaces technique problems without interpreting the blood pressure value", () => {
    const result = assessBloodPressureCaptureQuality({
      device_validated: true,
      cuff_size_confirmed: false,
      rest_minutes: 2,
      back_supported: true,
      feet_flat: false,
      legs_crossed: true,
      arm_supported_at_heart_level: false,
      cuff_over_clothing: true,
      talking_during_measurement: true,
      recent_smoking_caffeine_or_exercise_30m: true,
    });

    expect(result.quality).toBe("questionable");
    expect(result.issues).toContain("REST_UNDER_5_MINUTES");
    expect(result.issues).toContain("CUFF_OVER_CLOTHING");
  });
});
