import { describe, expect, it } from "vitest";
import { evaluateMeasurement, predicateMatches } from "./measurement-engine";
import {
  assessTemperatureCaptureQuality,
  normalizeTemperatureReading,
} from "./temperature-quality";
import type {
  MeasurementReferenceRule,
  MeasurementSafetyRule,
  MeasurementTypeDefinition,
} from "@/types/measurements";

const tempType: MeasurementTypeDefinition = {
  id: "temperature",
  code: "temperature",
  nameAr: "درجة الحرارة",
  valueKind: "scalar",
  canonicalUnit: "°C",
  allowedUnits: ["°C", "°F"],
  components: [],
  reviewStatus: "published",
  isActive: true,
  isDemo: false,
  version: 1,
};

const fever: MeasurementReferenceRule = {
  id: "adult-fever",
  measurementTypeId: "temperature",
  code: "nhs_adult_nonpregnant_high_temperature_38",
  labelAr: "مسودة: حرارة مرتفعة لدى بالغ غير حامل",
  interpretationCode: "high_temperature",
  predicate: {
    all: [
      { path: "context.age_years", operator: "gte", value: 18 },
      { path: "context.pregnant", operator: "eq", value: false },
      {
        path: "context.measurement_site",
        operator: "in",
        value: ["oral", "axillary", "tympanic"],
      },
      { path: "value", operator: "gte", value: 38 },
    ],
  },
  careLevel: null,
  sourceId: "nhs-fever",
  reviewStatus: "draft",
  isActive: false,
  isDemo: false,
  priority: 20,
  version: 1,
};

const hypothermia: MeasurementSafetyRule = {
  id: "hypothermia",
  measurementTypeId: "temperature",
  code: "nhs_hypothermia_below_35",
  titleAr: "مسودة: درجة حرارة أقل من 35 مئوية",
  predicate: {
    all: [
      { path: "context.age_years", operator: "gte", value: 18 },
      { path: "context.pregnant", operator: "eq", value: false },
      {
        path: "context.measurement_site",
        operator: "in",
        value: ["oral", "axillary", "tympanic"],
      },
      { path: "value", operator: "lt", value: 35 },
    ],
  },
  careLevel: "emergency",
  sourceId: "nhs-hypothermia",
  reviewStatus: "draft",
  isActive: false,
  isDemo: false,
  priority: 1,
  version: 1,
};

describe("temperature draft foundation", () => {
  it("normalizes Fahrenheit to Celsius exactly before threshold evaluation", () => {
    const normalized = normalizeTemperatureReading({
      measurementTypeId: "temperature",
      measuredAt: "2026-10-02T00:00:00Z",
      scalarValue: 100.4,
      unit: "°F",
      context: { measurement_site: "oral" },
    });

    expect(normalized.unit).toBe("°C");
    expect(normalized.scalarValue).toBeCloseTo(38, 8);
  });

  it("does not alter Celsius readings", () => {
    const reading = {
      measurementTypeId: "temperature",
      measuredAt: "2026-10-02T00:00:00Z",
      scalarValue: 38,
      unit: "°C",
      context: { measurement_site: "oral" },
    };
    expect(normalizeTemperatureReading(reading)).toEqual(reading);
  });

  it("keeps Draft fever rules inert in production", () => {
    const result = evaluateMeasurement({
      type: tempType,
      reading: {
        measurementTypeId: "temperature",
        measuredAt: "2026-10-02T00:00:00Z",
        scalarValue: 38.4,
        unit: "°C",
        context: {
          age_years: 40,
          pregnant: false,
          measurement_site: "oral",
        },
      },
      referenceRules: [fever],
      mode: "production",
    });

    expect(result.referenceMatches).toEqual([]);
  });

  it("requires a documented measurement site", () => {
    expect(
      predicateMatches(fever.predicate, {
        measurementTypeId: "temperature",
        measuredAt: "2026-10-02T00:00:00Z",
        scalarValue: 38.5,
        unit: "°C",
        context: { age_years: 40, pregnant: false },
      }),
    ).toBe(false);
  });

  it("does not apply the initial adult rule pack during pregnancy", () => {
    expect(
      predicateMatches(fever.predicate, {
        measurementTypeId: "temperature",
        measuredAt: "2026-10-02T00:00:00Z",
        scalarValue: 38.5,
        unit: "°C",
        context: {
          age_years: 30,
          pregnant: true,
          measurement_site: "oral",
        },
      }),
    ).toBe(false);
  });

  it("keeps hypothermia emergency routing inactive until publication", () => {
    const result = evaluateMeasurement({
      type: tempType,
      reading: {
        measurementTypeId: "temperature",
        measuredAt: "2026-10-02T00:00:00Z",
        scalarValue: 34.7,
        unit: "°C",
        context: {
          age_years: 55,
          pregnant: false,
          measurement_site: "oral",
        },
      },
      safetyRules: [hypothermia],
      mode: "production",
    });

    expect(result.safetyMatches).toEqual([]);
  });

  it("flags route changes instead of silently converting between measurement sites", () => {
    const result = assessTemperatureCaptureQuality({
      measurement_site: "axillary",
      previous_measurement_site: "oral",
      device_supported: true,
      device_type: "digital_contact",
      skin_contact_confirmed: true,
    });

    expect(result.quality).toBe("questionable");
    expect(result.issues).toContain("TREND_ROUTE_CHANGED");
  });

  it("flags oral readings taken soon after food or drink", () => {
    const result = assessTemperatureCaptureQuality({
      measurement_site: "oral",
      device_supported: true,
      device_type: "digital_contact",
      recent_food_or_drink: true,
    });

    expect(result.issues).toContain("RECENT_ORAL_FOOD_OR_DRINK");
  });

  it("accepts a properly captured oral digital reading as good quality", () => {
    expect(
      assessTemperatureCaptureQuality({
        measurement_site: "oral",
        device_supported: true,
        device_type: "digital_contact",
        recent_food_or_drink: false,
      }),
    ).toEqual({ quality: "good", issues: [] });
  });
});
