import { describe, expect, it } from "vitest";
import { buildDailyMedicationFollowup } from "./daily-medication-followup";

describe("daily medication follow-up", () => {
  const now = new Date("2026-10-05T09:00:00.000Z");
  const occurrences = [
    {
      scheduleId: "past",
      medicationId: "m1",
      scheduledFor: "2026-10-05T07:00:00.000Z",
      reminderEnabled: true,
      timezone: "Asia/Riyadh",
    },
    {
      scheduleId: "next",
      medicationId: "m2",
      scheduledFor: "2026-10-05T10:00:00.000Z",
      reminderEnabled: true,
      timezone: "Asia/Riyadh",
    },
    {
      scheduleId: "later",
      medicationId: "m3",
      scheduledFor: "2026-10-05T12:00:00.000Z",
      reminderEnabled: false,
      timezone: "Asia/Riyadh",
    },
  ];

  it("counts only recorded taken/skipped actions as completed", () => {
    const result = buildDailyMedicationFollowup(
      occurrences,
      [
        {
          schedule_id: "past",
          scheduled_for: "2026-10-05T07:00:00+00:00",
          status: "taken",
        },
      ],
      now,
    );

    expect(result.recorded).toBe(1);
    expect(result.unrecordedPast).toBe(0);
    expect(result.upcoming).toBe(2);
    expect(result.completionPercent).toBe(33);
  });

  it("keeps past unrecorded times operationally unrecorded", () => {
    const result = buildDailyMedicationFollowup(occurrences, [], now);

    expect(result.unrecordedPast).toBe(1);
    expect(result.recorded).toBe(0);
  });

  it("selects the earliest upcoming occurrence only", () => {
    const result = buildDailyMedicationFollowup(occurrences, [], now);

    expect(result.nextOccurrence?.scheduleId).toBe("next");
  });

  it("returns zero completion when there are no scheduled times", () => {
    expect(buildDailyMedicationFollowup([], [], now)).toEqual({
      total: 0,
      recorded: 0,
      unrecordedPast: 0,
      upcoming: 0,
      nextOccurrence: null,
      completionPercent: 0,
    });
  });
});
