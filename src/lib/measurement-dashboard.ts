import type {
  MeasurementReadingRow,
  MeasurementTypeRow,
} from "@/lib/measurements-db";

export type MeasurementQualityAction =
  | "none"
  | "repeat_capture"
  | "quality_context_missing";

export interface MeasurementDashboardItem {
  type: MeasurementTypeRow;
  reading: MeasurementReadingRow;
  qualityAction: MeasurementQualityAction;
}

export interface MeasurementTimelineItem {
  type: MeasurementTypeRow;
  reading: MeasurementReadingRow;
}

export interface MeasurementDashboardStats {
  trackedTypes: number;
  readingsLast30Days: number;
  latestGood: number;
  latestQuestionable: number;
  latestUnknown: number;
}

export function latestReadingsByType(
  types: MeasurementTypeRow[],
  readings: MeasurementReadingRow[],
): MeasurementDashboardItem[] {
  const typeMap = new Map(types.map((type) => [type.id, type]));
  const seen = new Set<string>();
  const items: MeasurementDashboardItem[] = [];

  const ordered = [...readings].sort(
    (a, b) =>
      new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime(),
  );

  for (const reading of ordered) {
    if (seen.has(reading.measurement_type_id)) continue;
    const type = typeMap.get(reading.measurement_type_id);
    if (!type) continue;

    seen.add(reading.measurement_type_id);
    items.push({
      type,
      reading,
      qualityAction: qualityActionFor(reading),
    });
  }

  return items;
}

export function buildMeasurementTimeline(
  types: MeasurementTypeRow[],
  readings: MeasurementReadingRow[],
  limit = 8,
): MeasurementTimelineItem[] {
  const typeMap = new Map(types.map((type) => [type.id, type]));

  return [...readings]
    .sort(
      (a, b) =>
        new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime(),
    )
    .flatMap((reading) => {
      const type = typeMap.get(reading.measurement_type_id);
      return type ? [{ type, reading }] : [];
    })
    .slice(0, limit);
}

export function summarizeMeasurementDashboard(
  latest: MeasurementDashboardItem[],
  readings: MeasurementReadingRow[],
  now = new Date(),
): MeasurementDashboardStats {
  const cutoff = now.getTime() - 30 * 24 * 60 * 60 * 1000;

  return {
    trackedTypes: latest.length,
    readingsLast30Days: readings.filter(
      (reading) => new Date(reading.measured_at).getTime() >= cutoff,
    ).length,
    latestGood: latest.filter((item) => item.reading.quality === "good").length,
    latestQuestionable: latest.filter(
      (item) => item.reading.quality === "questionable",
    ).length,
    latestUnknown: latest.filter((item) => item.reading.quality === "unknown")
      .length,
  };
}

export function qualityActionFor(
  reading: Pick<MeasurementReadingRow, "quality">,
): MeasurementQualityAction {
  if (reading.quality === "questionable") return "repeat_capture";
  if (reading.quality === "unknown") return "quality_context_missing";
  return "none";
}
