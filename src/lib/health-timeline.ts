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

export function sortHealthTimeline(
  items: readonly HealthTimelineItem[],
): HealthTimelineItem[] {
  return [...items].sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() -
      new Date(a.occurredAt).getTime(),
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
