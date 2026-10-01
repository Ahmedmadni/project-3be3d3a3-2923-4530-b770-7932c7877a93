import { describe, expect, it } from "vitest";
import { evaluateMeasurement, predicateMatches } from "./measurement-engine";
import { assessPulseCaptureQuality } from "./pulse-quality";
import type {
  MeasurementReferenceRule,
  MeasurementSafetyRule,
  MeasurementTypeDefinition,
} from "@/types/measurements";

const pulseType: MeasurementTypeDefinition = {
  id: "pulse",
  code: "pulse",
  nameAr: "معدل النبض",
  valueKind: "scalar",
  canonicalUnit: "bpm",
  allowedUnits: ["bpm"],
  components: [],
  reviewStatus: "published",
  isActive: true,
  isDemo: false,
  version: 1,
};

const highResting: MeasurementReferenceRule = {
  id: "high-resting",
  measurementTypeId: "pulse",
  code: "aha_adult_resting_over_100",
  labelAr: "مسودة: معدل نبض أعلى من 100 أثناء الراحة",
  interpretationCode: "resting_rate_over_100",
  predicate: {
    all: [
      { path: "context.age_years", operator: "gte", value: 18 },
      { path: "context.pregnant", operator: "eq", value: false },
      { path: "context.rest_state", operator: "eq", value: "resting" },
      { path: "context.awake", operator: "eq", value: true },
      { path: "value", operator: "gt", value: 100 },
    ],
  },
  careLevel: null,
  sourceId: "aha-tachycardia",
  reviewStatus: "draft",
  isActive: false,
  isDemo: false,
  priority: 20,
  version: 1,
};

const lowResting: MeasurementReferenceRule = {
  ...highResting,
  id: "low-resting",
  code: "aha_adult_resting_below_60",
  labelAr: "مسودة: معدل نبض أقل من 60 أثناء الراحة",
  interpretationCode: "resting_rate_below_60",
  predicate: {
    all: [
      { path: "context.age_years", operator: "gte", value: 18 },
      { path: "context.pregnant", operator: "eq", value: false },
      { path: "context.rest_state", operator: "eq", value: "resting" },
      { path: "context.awake", operator: "eq", value: true },
      { path: "value", operator: "lt", value: 60 },
    ],
  },
  priority: 30,
};

const palpitationEmergency: MeasurementSafetyRule = {
  id: "palpitation-emergency",
  measurementTypeId: "pulse",
  code: "nhs_palpitations_with_emergency_symptoms",
  titleAr: "مسودة: خفقان مستمر مع أعراض إنذار",
  predicate: {
    all: [
      { path: "context.age_years", operator: "gte", value: 18 },
      { path: "context.pregnant", operator: "eq", value: false },
      { path: "context.palpitations_present", operator: "eq", value: true },
      { path: "context.palpitations_ongoing", operator: "eq", value: true },
      {
        path: "context.emergency_cardiac_symptoms_present",
        operator: "eq",
        value: true,
      },
    ],
  },
  careLevel: "emergency",
  sourceId: "nhs-palpitations",
  reviewStatus: "draft",
  isActive: false,
  isDemo: false,
  priority: 1,
  version: 1,
};

describe("pulse draft foundation", () => {
  it("keeps resting high-rate draft rule inert in production", () => {
    const result = evaluateMeasurement({
      type: pulseType,
      reading: {
        measurementTypeId: "pulse",
        measuredAt: "2026-10-02T00:00:00Z",
        scalarValue: 110,
        unit: "bpm",
        context: {
          age_years: 40,
          pregnant: false,
          rest_state: "resting",
          awake: true,
        },
      },
      referenceRules: [highResting],
      mode: "production",
    });

    expect(result.referenceMatches).toEqual([]);
  });

  it("does not classify post-exercise pulse using resting rules", () => {
    expect(
      predicateMatches(highResting.predicate, {
        measurementTypeId: "pulse",
        measuredAt: "2026-10-02T00:00:00Z",
        scalarValue: 130,
        unit: "bpm",
        context: {
          age_years: 40,
          pregnant: false,
          rest_state: "post_exercise",
          awake: true,
        },
      }),
    ).toBe(false);
  });

  it("does not treat a sleeping pulse below 60 as the initial adult resting rule", () => {
    expect(
      predicateMatches(lowResting.predicate, {
        measurementTypeId: "pulse",
        measuredAt: "2026-10-02T00:00:00Z",
        scalarValue: 52,
        unit: "bpm",
        context: {
          age_years: 35,
          pregnant: false,
          rest_state: "resting",
          awake: false,
        },
      }),
    ).toBe(false);
  });

  it("keeps emergency symptom routing separate from the pulse number", () => {
    expect(
      predicateMatches(palpitationEmergency.predicate, {
        measurementTypeId: "pulse",
        measuredAt: "2026-10-02T00:00:00Z",
        scalarValue: 88,
        unit: "bpm",
        context: {
          age_years: 50,
          pregnant: false,
          palpitations_present: true,
          palpitations_ongoing: true,
          emergency_cardiac_symptoms_present: true,
        },
      }),
    ).toBe(true);
  });

  it("keeps draft palpitation emergency rule inert in production", () => {
    const result = evaluateMeasurement({
      type: pulseType,
      reading: {
        measurementTypeId: "pulse",
        measuredAt: "2026-10-02T00:00:00Z",
        scalarValue: 88,
        unit: "bpm",
        context: {
          age_years: 50,
          pregnant: false,
          palpitations_present: true,
          palpitations_ongoing: true,
          emergency_cardiac_symptoms_present: true,
        },
      },
      safetyRules: [palpitationEmergency],
      mode: "production",
    });

    expect(result.safetyMatches).toEqual([]);
  });

  it("accepts a careful 60-second manual resting pulse as good quality", () => {
    expect(
      assessPulseCaptureQuality({
        rest_state: "resting",
        calm: true,
        recent_exercise: false,
        measurement_method: "manual",
        count_duration_seconds: 60,
        rhythm_regular: true,
        body_position: "sitting",
      }),
    ).toEqual({ quality: "good", issues: [] });
  });

  it("flags abbreviated manual counting and non-resting conditions", () => {
    const result = assessPulseCaptureQuality({
      rest_state: "post_exercise",
      calm: false,
      recent_exercise: true,
      measurement_method: "manual",
      count_duration_seconds: 15,
      body_position: "standing",
    });

    expect(result.quality).toBe("questionable");
    expect(result.issues).toContain("NOT_RESTING");
    expect(result.issues).toContain("MANUAL_COUNT_UNDER_60_SECONDS");
    expect(result.issues).toContain("RHYTHM_REGULARITY_NOT_RECORDED");
  });
});
