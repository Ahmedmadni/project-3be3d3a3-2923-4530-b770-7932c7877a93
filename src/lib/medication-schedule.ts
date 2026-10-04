export type MedicationDayCode =
  | "sun"
  | "mon"
  | "tue"
  | "wed"
  | "thu"
  | "fri"
  | "sat";

export interface MedicationScheduleLike {
  id: string;
  medication_id: string;
  time_local: string;
  days_of_week: string[];
  reminder_enabled: boolean;
  start_date: string | null;
  end_date: string | null;
  timezone: string;
}

export interface MedicationDoseEventLike {
  schedule_id: string | null;
  scheduled_for: string | null;
  status: "taken" | "skipped";
}

export interface MedicationOccurrence {
  scheduleId: string;
  medicationId: string;
  scheduledFor: string;
  reminderEnabled: boolean;
  timezone: string;
}

export type MedicationOccurrenceState =
  | "upcoming"
  | "unrecorded"
  | "taken"
  | "skipped";

const dayCodes: MedicationDayCode[] = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
];

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function browserTimezone(): string {
  if (typeof Intl === "undefined") return "UTC";
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function buildTodayMedicationOccurrences(
  schedules: readonly MedicationScheduleLike[],
  now: Date,
): MedicationOccurrence[] {
  const dateKey = localDateKey(now);
  const dayCode = dayCodes[now.getDay()];

  return schedules
    .filter((schedule) => {
      if (!schedule.days_of_week.includes(dayCode)) return false;
      if (schedule.start_date && dateKey < schedule.start_date) return false;
      if (schedule.end_date && dateKey > schedule.end_date) return false;
      return true;
    })
    .map((schedule) => {
      const [hour = "0", minute = "0", second = "0"] =
        schedule.time_local.split(":");
      const scheduled = new Date(now);
      scheduled.setHours(
        Number(hour),
        Number(minute),
        Number(second.split(".")[0] || 0),
        0,
      );

      return {
        scheduleId: schedule.id,
        medicationId: schedule.medication_id,
        scheduledFor: scheduled.toISOString(),
        reminderEnabled: schedule.reminder_enabled,
        timezone: schedule.timezone,
      };
    })
    .sort(
      (a, b) =>
        new Date(a.scheduledFor).getTime() -
        new Date(b.scheduledFor).getTime(),
    );
}

export function medicationOccurrenceState(
  occurrence: MedicationOccurrence,
  events: readonly MedicationDoseEventLike[],
  now: Date,
): MedicationOccurrenceState {
  const scheduledTime = new Date(occurrence.scheduledFor).getTime();
  const recorded = events.find(
    (event) =>
      event.schedule_id === occurrence.scheduleId &&
      event.scheduled_for != null &&
      new Date(event.scheduled_for).getTime() === scheduledTime,
  );

  if (recorded) return recorded.status;

  return new Date(occurrence.scheduledFor).getTime() > now.getTime()
    ? "upcoming"
    : "unrecorded";
}

export function isReminderDue(
  occurrence: MedicationOccurrence,
  events: readonly MedicationDoseEventLike[],
  now: Date,
  windowMinutes = 10,
): boolean {
  if (!occurrence.reminderEnabled) return false;
  if (medicationOccurrenceState(occurrence, events, now) !== "unrecorded") {
    return false;
  }

  const scheduled = new Date(occurrence.scheduledFor).getTime();
  const elapsed = now.getTime() - scheduled;

  return elapsed >= 0 && elapsed <= windowMinutes * 60 * 1000;
}
