import { describe, expect, it } from "vitest";
import {
  buildTodayMedicationOccurrences,
  isReminderDue,
  medicationOccurrenceState,
  type MedicationScheduleLike,
} from "./medication-schedule";

const schedule: MedicationScheduleLike = {
  id: "schedule-1",
  medication_id: "med-1",
  time_local: "09:30:00",
  days_of_week: ["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
  reminder_enabled: true,
  start_date: null,
  end_date: null,
  timezone: "Asia/Riyadh",
};

describe("medication schedules", () => {
  it("builds today's occurrence from a user-entered wall-clock time", () => {
    const now = new Date(2026, 9, 4, 8, 0, 0);
    const [occurrence] = buildTodayMedicationOccurrences([schedule], now);

    expect(occurrence.scheduleId).toBe("schedule-1");
    expect(new Date(occurrence.scheduledFor).getHours()).toBe(9);
    expect(new Date(occurrence.scheduledFor).getMinutes()).toBe(30);
  });

  it("respects selected weekdays and start/end dates", () => {
    const sunday = new Date(2026, 9, 4, 8, 0, 0);

    expect(
      buildTodayMedicationOccurrences(
        [{ ...schedule, days_of_week: ["mon"] }],
        sunday,
      ),
    ).toEqual([]);

    expect(
      buildTodayMedicationOccurrences(
        [{ ...schedule, start_date: "2026-10-05" }],
        sunday,
      ),
    ).toEqual([]);
  });

  it("marks a scheduled occurrence by its recorded action only", () => {
    const now = new Date(2026, 9, 4, 10, 0, 0);
    const [occurrence] = buildTodayMedicationOccurrences([schedule], now);

    expect(medicationOccurrenceState(occurrence, [], now)).toBe("unrecorded");
    expect(
      medicationOccurrenceState(
        occurrence,
        [
          {
            schedule_id: occurrence.scheduleId,
            scheduled_for: occurrence.scheduledFor,
            status: "taken",
          },
        ],
        now,
      ),
    ).toBe("taken");
  });

  it("never infers a missed dose; past unrecorded remains operationally unrecorded", () => {
    const now = new Date(2026, 9, 4, 12, 0, 0);
    const [occurrence] = buildTodayMedicationOccurrences([schedule], now);

    expect(medicationOccurrenceState(occurrence, [], now)).toBe("unrecorded");
  });

  it("allows reminder display only in a short post-schedule window", () => {
    const now = new Date(2026, 9, 4, 9, 35, 0);
    const [occurrence] = buildTodayMedicationOccurrences([schedule], now);

    expect(isReminderDue(occurrence, [], now)).toBe(true);
    expect(
      isReminderDue(
        occurrence,
        [
          {
            schedule_id: occurrence.scheduleId,
            scheduled_for: occurrence.scheduledFor,
            status: "skipped",
          },
        ],
        now,
      ),
    ).toBe(false);
  });
});
