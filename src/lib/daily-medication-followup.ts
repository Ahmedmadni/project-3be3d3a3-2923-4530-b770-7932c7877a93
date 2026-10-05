import {
  medicationOccurrenceState,
  type MedicationDoseEventLike,
  type MedicationOccurrence,
} from "./medication-schedule";

export interface DailyMedicationFollowup {
  total: number;
  recorded: number;
  unrecordedPast: number;
  upcoming: number;
  nextOccurrence: MedicationOccurrence | null;
  completionPercent: number;
}

export function buildDailyMedicationFollowup(
  occurrences: readonly MedicationOccurrence[],
  events: readonly MedicationDoseEventLike[],
  now: Date,
): DailyMedicationFollowup {
  const states = occurrences.map((occurrence) => ({
    occurrence,
    state: medicationOccurrenceState(occurrence, events, now),
  }));

  const recorded = states.filter(
    ({ state }) => state === "taken" || state === "skipped",
  ).length;

  const unrecordedPast = states.filter(
    ({ state }) => state === "unrecorded",
  ).length;

  const upcomingItems = states
    .filter(({ state }) => state === "upcoming")
    .map(({ occurrence }) => occurrence)
    .sort(
      (a, b) =>
        new Date(a.scheduledFor).getTime() -
        new Date(b.scheduledFor).getTime(),
    );

  return {
    total: occurrences.length,
    recorded,
    unrecordedPast,
    upcoming: upcomingItems.length,
    nextOccurrence: upcomingItems[0] ?? null,
    completionPercent:
      occurrences.length === 0
        ? 0
        : Math.round((recorded / occurrences.length) * 100),
  };
}
