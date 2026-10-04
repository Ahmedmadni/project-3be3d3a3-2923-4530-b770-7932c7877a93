export type HealthTimelineKind =
  | "journal"
  | "medication"
  | "measurement"
  | "symptom_check";

export interface HealthTimelineItem {
  id: string;
  kind: HealthTimelineKind;
  occurredAt: string;
  title: string;
  subtitle?: string | null;
}

export type HealthTimelineRangeDays = 7 | 30 | 90 | "all";

export interface HealthTimelineFilter {
  kind: HealthTimelineKind | "all";
  query: string;
  rangeDays: HealthTimelineRangeDays;
  now?: Date;
}

export function sortHealthTimeline(
  items: readonly HealthTimelineItem[],
): HealthTimelineItem[] {
  return [...items].sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() -
      new Date(a.occurredAt).getTime(),
  );
}

export function filterHealthTimeline(
  items: readonly HealthTimelineItem[],
  filter: HealthTimelineFilter,
): HealthTimelineItem[] {
  const query = filter.query.trim().toLocaleLowerCase();
  const now = filter.now ?? new Date();
  const cutoff =
    filter.rangeDays === "all"
      ? null
      : now.getTime() - filter.rangeDays * 24 * 60 * 60 * 1000;

  return sortHealthTimeline(items).filter((item) => {
    if (filter.kind !== "all" && item.kind !== filter.kind) return false;

    if (cutoff != null && new Date(item.occurredAt).getTime() < cutoff) {
      return false;
    }

    if (!query) return true;

    return [item.title, item.subtitle ?? ""]
      .join(" ")
      .toLocaleLowerCase()
      .includes(query);
  });
}

export function countHealthTimelineKinds(
  items: readonly HealthTimelineItem[],
): Record<HealthTimelineKind, number> {
  return items.reduce<Record<HealthTimelineKind, number>>(
    (counts, item) => {
      counts[item.kind] += 1;
      return counts;
    },
    {
      journal: 0,
      medication: 0,
      measurement: 0,
      symptom_check: 0,
    },
  );
}

export function medicationEventSummary(
  events: readonly { status: "taken" | "skipped" }[],
) {
  const taken = events.filter((item) => item.status === "taken").length;
  const skipped = events.filter((item) => item.status === "skipped").length;

  return {
    total: events.length,
    taken,
    skipped,
  };
}
