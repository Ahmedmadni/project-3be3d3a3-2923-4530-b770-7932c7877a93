import { describe, expect, it } from "vitest";
import {
  evaluateMeasurement,
  predicateMatches,
  validateMeasurementReading,
} from "./measurement-engine";
import type {
  MeasurementReferenceRule,
  MeasurementSafetyRule,
  MeasurementTypeDefinition,
} from "@/types/measurements";

const scalarType: MeasurementTypeDefinition = {
  id: "scalar-type",
  code: "demo_scalar",
  nameAr: "قياس تجريبي",
  valueKind: "scalar",
  canonicalUnit: "u",
  allowedUnits: ["u", "alt"],
  components: [],
  reviewStatus: "published",
  isActive: true,
  isDemo: false,
  version: 1,
};

const compoundType: MeasurementTypeDefinition = {
  id: "compound-type",
  code: "demo_compound",
  nameAr: "قياس مركب تجريبي",
  valueKind: "compound",
  canonicalUnit: null,
  allowedUnits: [],
  components: [
    { code: "a", labelAr: "أ", unit: "u", required: true },
    { code: "b", labelAr: "ب", unit: "u", required: true },
  ],
  reviewStatus: "published",
  isActive: true,
  isDemo: false,
  version: 1,
};

function referenceRule(
  patch: Partial<MeasurementReferenceRule> = {},
): MeasurementReferenceRule {
  return {
    id: "ref-1",
    measurementTypeId: scalarType.id,
    code: "synthetic_reference",
    labelAr: "قاعدة مرجعية صناعية",
    interpretationCode: "synthetic",
    predicate: { all: [{ path: "value", operator: "gte", value: 10 }] },
    careLevel: null,
    sourceId: "source-reviewed",
    reviewStatus: "published",
    isActive: true,
    isDemo: false,
    priority: 10,
    version: 1,
    ...patch,
  };
}

function safetyRule(
  patch: Partial<MeasurementSafetyRule> = {},
): MeasurementSafetyRule {
  return {
    id: "safe-1",
    measurementTypeId: scalarType.id,
    code: "synthetic_safety",
    titleAr: "قاعدة أمان صناعية",
    predicate: { all: [{ path: "value", operator: "gte", value: 20 }] },
    careLevel: "urgent",
    sourceId: "source-reviewed",
    reviewStatus: "published",
    isActive: true,
    isDemo: false,
    priority: 1,
    version: 1,
    ...patch,
  };
}

describe("measurement engine foundation", () => {
  it("does not interpret when there are no reviewed rules", () => {
    const result = evaluateMeasurement({
      type: scalarType,
      reading: {
        measurementTypeId: scalarType.id,
        measuredAt: "2026-10-01T00:00:00Z",
        scalarValue: 12,
        unit: "u",
      },
    });

    expect(result.status).toBe("not_interpreted");
    expect(result.safetyMatches).toEqual([]);
    expect(result.referenceMatches).toEqual([]);
  });

  it("ignores draft and demo rules in production", () => {
    const result = evaluateMeasurement({
      type: scalarType,
      reading: {
        measurementTypeId: scalarType.id,
        measuredAt: "2026-10-01T00:00:00Z",
        scalarValue: 12,
        unit: "u",
      },
      referenceRules: [
        referenceRule({ reviewStatus: "draft" }),
        referenceRule({ id: "ref-demo", code: "demo", isDemo: true }),
      ],
      mode: "production",
    });

    expect(result.status).toBe("not_interpreted");
    expect(result.referenceMatches).toEqual([]);
  });

  it("matches only published active source-backed rules in production", () => {
    const result = evaluateMeasurement({
      type: scalarType,
      reading: {
        measurementTypeId: scalarType.id,
        measuredAt: "2026-10-01T00:00:00Z",
        scalarValue: 12,
        unit: "u",
      },
      referenceRules: [referenceRule()],
      mode: "production",
    });

    expect(result.status).toBe("matched");
    expect(result.referenceMatches.map((rule) => rule.code)).toEqual([
      "synthetic_reference",
    ]);
  });

  it("requires normalization before comparing an allowed non-canonical unit", () => {
    const result = evaluateMeasurement({
      type: scalarType,
      reading: {
        measurementTypeId: scalarType.id,
        measuredAt: "2026-10-01T00:00:00Z",
        scalarValue: 12,
        unit: "alt",
      },
      referenceRules: [referenceRule()],
    });

    expect(result.status).toBe("needs_normalization");
    expect(result.referenceMatches).toEqual([]);
  });

  it("validates required compound components", () => {
    const errors = validateMeasurementReading(compoundType, {
      measurementTypeId: compoundType.id,
      measuredAt: "2026-10-01T00:00:00Z",
      components: { a: 1 },
    });

    expect(errors).toContain("COMPONENT_REQUIRED:b");
  });

  it("supports compound and context predicates without diagnosing", () => {
    const reading = {
      measurementTypeId: compoundType.id,
      measuredAt: "2026-10-01T00:00:00Z",
      components: { a: 7, b: 3 },
      context: { state: "example" },
    };

    expect(
      predicateMatches(
        {
          all: [
            { path: "components.a", operator: "gt", value: 5 },
            { path: "context.state", operator: "eq", value: "example" },
          ],
        },
        reading,
      ),
    ).toBe(true);
  });

  it("evaluates safety-floor rules even when database rules are absent", () => {
    const result = evaluateMeasurement({
      type: scalarType,
      reading: {
        measurementTypeId: scalarType.id,
        measuredAt: "2026-10-01T00:00:00Z",
        scalarValue: 25,
        unit: "u",
      },
      safetyFloorRules: [safetyRule({ reviewStatus: "draft", isActive: false })],
    });

    expect(result.status).toBe("matched");
    expect(result.safetyMatches.map((rule) => rule.code)).toEqual([
      "synthetic_safety",
    ]);
  });

  it("never lets an empty predicate match everything", () => {
    expect(
      predicateMatches(
        {},
        {
          measurementTypeId: scalarType.id,
          measuredAt: "2026-10-01T00:00:00Z",
          scalarValue: 999,
          unit: "u",
        },
      ),
    ).toBe(false);
  });
});
