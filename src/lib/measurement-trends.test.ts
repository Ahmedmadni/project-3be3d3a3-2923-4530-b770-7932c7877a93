import { describe, expect, it } from "vitest";
import {
  buildTrendPoints,
  filterReadingsByRange,
  summarizeQuality,
  summarizeTrend,
} from "./measurement-trends";
import type { MeasurementReadingRow } from "@/lib/measurements-db";

const reading = (
  id: string,
  measuredAt: string,
  scalarValue: number | null,
  quality: MeasurementReadingRow["quality"] = "good",
): MeasurementReadingRow => ({
  id,
  user_id: "user",
  measurement_type_id: "type",
  measured_at: measuredAt,
  scalar_value: scalarValue,
  unit: "bpm",
  components: null,
  context: {},
  quality,
  notes: null,
  created_at: measuredAt,
  updated_at: measuredAt,
});

describe("measurement trends", () => {
  it("orders scalar points from oldest to newest", () => {
    const points = buildTrendPoints("pulse", [
      reading("b", "2026-10-02T00:00:00Z", 80),
      reading("a", "2026-10-01T00:00:00Z", 72),
    ], "en-US");

    expect(points.map((point) => point.value)).toEqual([72, 80]);
  });

  it("extracts both blood pressure components", () => {
    const bp: MeasurementReadingRow = {
      ...reading("bp", "2026-10-02T00:00:00Z", null),
      components: { systolic: 121, diastolic: 78 },
      unit: null,
    };

    const [point] = buildTrendPoints("blood_pressure", [bp], "en-US");
    expect(point?.value).toBe(121);
    expect(point?.secondaryValue).toBe(78);
  });

  it("summarizes last-vs-previous without assigning clinical meaning", () => {
    const points = buildTrendPoints("pulse", [
      reading("a", "2026-10-01T00:00:00Z", 70),
      reading("b", "2026-10-02T00:00:00Z", 75),
    ], "en-US");
    const summary = summarizeTrend(points);

    expect(summary.latest).toBe(75);
    expect(summary.previous).toBe(70);
    expect(summary.delta).toBe(5);
    expect(summary.average).toBe(72.5);
  });

  it("filters readings by the requested date range", () => {
    const now = new Date("2026-10-02T12:00:00Z");
    const filtered = filterReadingsByRange([
      reading("recent", "2026-10-01T12:00:00Z", 70),
      reading("old", "2026-09-01T12:00:00Z", 72),
    ], "7d", now);

    expect(filtered.map((item) => item.id)).toEqual(["recent"]);
  });

  it("counts capture-quality states separately", () => {
    const summary = summarizeQuality([
      reading("a", "2026-10-01T00:00:00Z", 70, "good"),
      reading("b", "2026-10-02T00:00:00Z", 75, "questionable"),
      reading("c", "2026-10-03T00:00:00Z", 74, "unknown"),
    ]);

    expect(summary).toEqual({ good: 1, questionable: 1, unknown: 1 });
  });
});
