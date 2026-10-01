import { describe, expect, it } from "vitest";
import {
  assessHeightCaptureQuality,
  assessWeightCaptureQuality,
  calculateBmi,
  normalizeHeightReading,
  normalizeWeightReading,
} from "./body-metrics-quality";
import { evaluateMeasurement } from "./measurement-engine";
import type {
  MeasurementReferenceRule,
  MeasurementTypeDefinition,
} from "@/types/measurements";

const bmiType: MeasurementTypeDefinition = {
  id: "bmi",
  code: "bmi",
  nameAr: "مؤشر كتلة الجسم",
  valueKind: "scalar",
  canonicalUnit: "kg/m²",
  allowedUnits: ["kg/m²"],
  components: [],
  reviewStatus: "published",
  isActive: true,
  isDemo: false,
  version: 1,
};

const adultHealthy: MeasurementReferenceRule = {
  id: "healthy",
  measurementTypeId: "bmi",
  code: "cdc_adult_bmi_healthy_18_5_24_9",
  labelAr: "مسودة: BMI ضمن فئة الوزن الصحي للبالغين",
  interpretationCode: "healthy_weight",
  predicate: {
    all: [
      { path: "context.age_years", operator: "gte", value: 20 },
      { path: "context.pregnant", operator: "eq", value: false },
      { path: "value", operator: "gte", value: 18.5 },
      { path: "value", operator: "lt", value: 25 },
    ],
  },
  careLevel: null,
  sourceId: "cdc-bmi",
  reviewStatus: "draft",
  isActive: false,
  isDemo: false,
  priority: 30,
  version: 1,
};

describe("weight height BMI draft foundation", () => {
  it("converts pounds to kilograms", () => {
    const normalized = normalizeWeightReading({
      measurementTypeId: "weight",
      measuredAt: "2026-10-02T00:00:00Z",
      scalarValue: 220.462262,
      unit: "lb",
      context: {},
    });
    expect(normalized.unit).toBe("kg");
    expect(normalized.scalarValue).toBeCloseTo(100, 5);
  });

  it("converts inches to centimeters", () => {
    const normalized = normalizeHeightReading({
      measurementTypeId: "height",
      measuredAt: "2026-10-02T00:00:00Z",
      scalarValue: 70,
      unit: "in",
      context: {},
    });
    expect(normalized.unit).toBe("cm");
    expect(normalized.scalarValue).toBeCloseTo(177.8, 5);
  });

  it("calculates metric BMI", () => {
    expect(calculateBmi(70, 175)).toBeCloseTo(22.8571, 4);
  });

  it("returns null for invalid BMI inputs", () => {
    expect(calculateBmi(0, 175)).toBeNull();
    expect(calculateBmi(70, 0)).toBeNull();
  });

  it("keeps adult BMI categories inert in production", () => {
    const result = evaluateMeasurement({
      type: bmiType,
      reading: {
        measurementTypeId: "bmi",
        measuredAt: "2026-10-02T00:00:00Z",
        scalarValue: 22.9,
        unit: "kg/m²",
        context: { age_years: 35, pregnant: false },
      },
      referenceRules: [adultHealthy],
      mode: "production",
    });
    expect(result.referenceMatches).toEqual([]);
  });

  it("accepts consistent weight capture as good quality", () => {
    expect(
      assessWeightCaptureQuality({
        scale_level_surface: true,
        same_scale_for_trend: true,
        shoes_or_heavy_items_removed: true,
        still_until_stable: true,
        time_of_day: "morning",
      }),
    ).toEqual({ quality: "good", issues: [] });
  });

  it("flags inconsistent weight capture", () => {
    const result = assessWeightCaptureQuality({
      scale_level_surface: false,
      same_scale_for_trend: false,
      shoes_or_heavy_items_removed: false,
      still_until_stable: false,
    });
    expect(result.quality).toBe("questionable");
    expect(result.issues).toContain("SCALE_NOT_LEVEL");
    expect(result.issues).toContain("TIME_OF_DAY_NOT_RECORDED");
  });

  it("accepts documented upright height capture", () => {
    expect(
      assessHeightCaptureQuality({
        shoes_removed: true,
        upright_posture: true,
        head_position_neutral: true,
        height_method: "stadiometer",
      }),
    ).toEqual({ quality: "good", issues: [] });
  });
});
