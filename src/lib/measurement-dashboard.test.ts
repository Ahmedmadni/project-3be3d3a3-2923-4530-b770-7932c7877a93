import { describe, expect, it } from "vitest";
import {
  buildMeasurementTimeline,
  latestReadingsByType,
  qualityActionFor,
  summarizeMeasurementDashboard,
} from "./measurement-dashboard";
import type {
  MeasurementReadingRow,
  MeasurementTypeRow,
} from "@/lib/measurements-db";

const type = (id: string, code: string): MeasurementTypeRow => ({
  id,
  code,
  name_ar: code,
  name_en: null,
  description_ar: null,
  value_kind: "scalar",
  canonical_unit: "unit",
  allowed_units: ["unit"],
  component_schema: {},
  capture_context_schema: {},
  review_status: "published",
  is_active: true,
  is_demo: false,
  version: 1,
});

const reading = (
  id: string,
  typeId: string,
  date: string,
  quality: MeasurementReadingRow["quality"],
): MeasurementReadingRow => ({
  id,
  user_id: "u",
  measurement_type_id: typeId,
  measured_at: date,
  scalar_value: 10,
  unit: "unit",
  components: null,
  context: {},
  quality,
  notes: null,
  created_at: date,
  updated_at: date,
});

describe("measurement dashboard", () => {
  const types = [type("pulse", "pulse"), type("weight", "weight")];

  it("keeps only the latest reading for each measurement type", () => {
    const latest = latestReadingsByType(types, [
      reading("old", "pulse", "2026-10-01T00:00:00Z", "good"),
      reading("new", "pulse", "2026-10-02T00:00:00Z", "questionable"),
      reading("weight", "weight", "2026-10-01T12:00:00Z", "good"),
    ]);

    expect(latest.map((item) => item.reading.id)).toEqual(["new", "weight"]);
  });

  it("suggests repeat capture only for questionable technique quality", () => {
    expect(qualityActionFor({ quality: "questionable" })).toBe("repeat_capture");
    expect(qualityActionFor({ quality: "unknown" })).toBe(
      "quality_context_missing",
    );
    expect(qualityActionFor({ quality: "good" })).toBe("none");
  });

  it("builds a unified newest-first timeline", () => {
    const timeline = buildMeasurementTimeline(types, [
      reading("a", "pulse", "2026-10-01T00:00:00Z", "good"),
      reading("b", "weight", "2026-10-02T00:00:00Z", "good"),
    ]);

    expect(timeline.map((item) => item.reading.id)).toEqual(["b", "a"]);
  });

  it("summarizes latest quality and last-30-day activity", () => {
    const readings = [
      reading("a", "pulse", "2026-10-01T00:00:00Z", "questionable"),
      reading("b", "weight", "2026-09-01T00:00:00Z", "unknown"),
    ];
    const latest = latestReadingsByType(types, readings);
    const summary = summarizeMeasurementDashboard(
      latest,
      readings,
      new Date("2026-10-02T00:00:00Z"),
    );

    expect(summary).toEqual({
      trackedTypes: 2,
      readingsLast30Days: 1,
      latestGood: 0,
      latestQuestionable: 1,
      latestUnknown: 1,
    });
  });
});
