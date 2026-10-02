import type { MeasurementReadingRow } from "@/lib/measurements-db";

export type TrendRange = "7d" | "30d" | "90d" | "all";

export interface MeasurementTrendPoint {
  id: string;
  measuredAt: string;
  timestamp: number;
  label: string;
  value: number;
  secondaryValue?: number;
  quality: MeasurementReadingRow["quality"];
}

export interface TrendSummary {
  count: number;
  latest: number | null;
  previous: number | null;
  delta: number | null;
  average: number | null;
  min: number | null;
  max: number | null;
}

export interface QualitySummary {
  good: number;
  questionable: number;
  unknown: number;
}

export function filterReadingsByRange(
  readings: MeasurementReadingRow[],
  range: TrendRange,
  now = new Date(),
): MeasurementReadingRow[] {
  if (range === "all") return [...readings];

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;

  return readings.filter(
    (reading) => new Date(reading.measured_at).getTime() >= cutoff,
  );
}

export function buildTrendPoints(
  code: string,
  readings: MeasurementReadingRow[],
  locale = "ar-SA",
): MeasurementTrendPoint[] {
  return [...readings]
    .sort(
      (a, b) =>
        new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime(),
    )
    .flatMap((reading) => {
      const value = extractPrimaryValue(code, reading);
      if (value === null) return [];

      const secondaryValue = extractSecondaryValue(code, reading);
      return [
        {
          id: reading.id,
          measuredAt: reading.measured_at,
          timestamp: new Date(reading.measured_at).getTime(),
          label: new Date(reading.measured_at).toLocaleDateString(locale, {
            month: "short",
            day: "numeric",
          }),
          value,
          ...(secondaryValue === null ? {} : { secondaryValue }),
          quality: reading.quality,
        },
      ];
    });
}

export function summarizeTrend(
  points: MeasurementTrendPoint[],
  key: "value" | "secondaryValue" = "value",
): TrendSummary {
  const values = points
    .map((point) => point[key])
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (!values.length) {
    return {
      count: 0,
      latest: null,
      previous: null,
      delta: null,
      average: null,
      min: null,
      max: null,
    };
  }

  const latest = values.at(-1) ?? null;
  const previous = values.length > 1 ? values.at(-2) ?? null : null;

  return {
    count: values.length,
    latest,
    previous,
    delta: latest !== null && previous !== null ? latest - previous : null,
    average: values.reduce((sum, value) => sum + value, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

export function summarizeQuality(
  readings: MeasurementReadingRow[],
): QualitySummary {
  return readings.reduce<QualitySummary>(
    (summary, reading) => {
      summary[reading.quality] += 1;
      return summary;
    },
    { good: 0, questionable: 0, unknown: 0 },
  );
}

function extractPrimaryValue(
  code: string,
  reading: MeasurementReadingRow,
): number | null {
  if (code === "blood_pressure") {
    const components = asObject(reading.components);
    return numberOrNull(components?.["systolic"]);
  }

  return numberOrNull(reading.scalar_value);
}

function extractSecondaryValue(
  code: string,
  reading: MeasurementReadingRow,
): number | null {
  if (code !== "blood_pressure") return null;
  const components = asObject(reading.components);
  return numberOrNull(components?.["diastolic"]);
}

function asObject(value: MeasurementReadingRow["components"]): Record<string, unknown> | null {
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
