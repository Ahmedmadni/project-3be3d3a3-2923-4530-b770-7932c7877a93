import { describe, expect, it } from "vitest";
import { evaluateMeasurement, predicateMatches } from "./measurement-engine";
import { assessPulseOximeterCaptureQuality } from "./pulse-oximeter-quality";
import type {
  MeasurementSafetyRule,
  MeasurementTypeDefinition,
} from "@/types/measurements";

const spo2Type: MeasurementTypeDefinition = {
  id: "spo2",
  code: "oxygen_saturation",
  nameAr: "تشبع الأكسجين",
  valueKind: "scalar",
  canonicalUnit: "%",
  allowedUnits: ["%"],
  components: [],
  reviewStatus: "published",
  isActive: true,
  isDemo: false,
  version: 1,
};

function rule(
  patch: Partial<MeasurementSafetyRule> = {},
): MeasurementSafetyRule {
  return {
    id: "urgent",
    measurementTypeId: "spo2",
    code: "nhs_adult_acute_home_93_94",
    titleAr: "مسودة: قراءة تحتاج تواصلًا عاجلًا",
    predicate: {
      all: [
        { path: "context.age_years", operator: "gte", value: 18 },
        { path: "context.pregnant", operator: "eq", value: false },
        {
          path: "context.monitoring_pathway",
          operator: "eq",
          value: "acute_respiratory_home_monitoring",
        },
        { path: "context.usual_spo2_below_95", operator: "eq", value: false },
        { path: "context.repeat_confirmed", operator: "eq", value: true },
        { path: "value", operator: "gte", value: 93 },
        { path: "value", operator: "lte", value: 94 },
      ],
    },
    careLevel: "urgent",
    sourceId: "nhs",
    reviewStatus: "draft",
    isActive: false,
    isDemo: false,
    priority: 10,
    version: 1,
    ...patch,
  };
}

const emergency = rule({
  id: "emergency",
  code: "nhs_adult_acute_home_92_or_less",
  titleAr: "مسودة: قراءة منخفضة جدًا ضمن مسار المتابعة التنفسية",
  predicate: {
    all: [
      { path: "context.age_years", operator: "gte", value: 18 },
      { path: "context.pregnant", operator: "eq", value: false },
      {
        path: "context.monitoring_pathway",
        operator: "eq",
        value: "acute_respiratory_home_monitoring",
      },
      { path: "context.usual_spo2_below_95", operator: "eq", value: false },
      { path: "context.repeat_confirmed", operator: "eq", value: true },
      { path: "value", operator: "lte", value: 92 },
    ],
  },
  careLevel: "emergency",
  priority: 1,
});

describe("SpO2 draft foundation", () => {
  it("keeps draft oxygen rules inert in production", () => {
    const result = evaluateMeasurement({
      type: spo2Type,
      reading: {
        measurementTypeId: "spo2",
        measuredAt: "2026-10-01T00:00:00Z",
        scalarValue: 91,
        unit: "%",
        context: {
          age_years: 45,
          pregnant: false,
          monitoring_pathway: "acute_respiratory_home_monitoring",
          usual_spo2_below_95: false,
          repeat_confirmed: true,
        },
      },
      safetyRules: [emergency],
      mode: "production",
    });

    expect(result.safetyMatches).toEqual([]);
  });

  it("does not apply pathway thresholds to an unsupervised generic reading", () => {
    expect(
      predicateMatches(emergency.predicate, {
        measurementTypeId: "spo2",
        measuredAt: "2026-10-01T00:00:00Z",
        scalarValue: 91,
        unit: "%",
        context: {
          age_years: 45,
          pregnant: false,
          monitoring_pathway: "general_wellness",
          usual_spo2_below_95: false,
          repeat_confirmed: true,
        },
      }),
    ).toBe(false);
  });

  it("requires the low reading to be repeated and confirmed", () => {
    expect(
      predicateMatches(emergency.predicate, {
        measurementTypeId: "spo2",
        measuredAt: "2026-10-01T00:00:00Z",
        scalarValue: 91,
        unit: "%",
        context: {
          age_years: 45,
          pregnant: false,
          monitoring_pathway: "acute_respiratory_home_monitoring",
          usual_spo2_below_95: false,
          repeat_confirmed: false,
        },
      }),
    ).toBe(false);
  });

  it("does not use the default pathway thresholds when the usual baseline is below 95", () => {
    expect(
      predicateMatches(rule().predicate, {
        measurementTypeId: "spo2",
        measuredAt: "2026-10-01T00:00:00Z",
        scalarValue: 94,
        unit: "%",
        context: {
          age_years: 65,
          pregnant: false,
          monitoring_pathway: "acute_respiratory_home_monitoring",
          usual_spo2_below_95: true,
          repeat_confirmed: true,
        },
      }),
    ).toBe(false);
  });

  it("excludes pregnancy from the initial adult nonpregnant pathway rules", () => {
    expect(
      predicateMatches(emergency.predicate, {
        measurementTypeId: "spo2",
        measuredAt: "2026-10-01T00:00:00Z",
        scalarValue: 91,
        unit: "%",
        context: {
          age_years: 30,
          pregnant: true,
          monitoring_pathway: "acute_respiratory_home_monitoring",
          usual_spo2_below_95: false,
          repeat_confirmed: true,
        },
      }),
    ).toBe(false);
  });

  it("marks a stable medical-purpose reading with good technique as good quality", () => {
    expect(
      assessPulseOximeterCaptureQuality({
        device_intended_for_medical_use: true,
        hand_warm: true,
        nail_polish_removed: true,
        motion_free: true,
        reading_stable: true,
        poor_circulation: false,
        current_tobacco_use: false,
        signal_quality_ok: true,
      }),
    ).toEqual({ quality: "good", issues: [] });
  });

  it("surfaces known device and capture limitations without changing the SpO2 value", () => {
    const result = assessPulseOximeterCaptureQuality({
      device_intended_for_medical_use: false,
      hand_warm: false,
      nail_polish_removed: false,
      motion_free: false,
      reading_stable: false,
      poor_circulation: true,
      current_tobacco_use: true,
      signal_quality_ok: false,
    });

    expect(result.quality).toBe("questionable");
    expect(result.issues).toContain("DEVICE_NOT_MEDICAL_PURPOSE");
    expect(result.issues).toContain("POOR_CIRCULATION");
    expect(result.issues).toContain("NAIL_POLISH_PRESENT");
  });
});
