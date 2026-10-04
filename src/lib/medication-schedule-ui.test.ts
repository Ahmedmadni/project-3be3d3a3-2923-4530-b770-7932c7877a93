import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = readFileSync(
  new URL("../routes/journal.tsx", import.meta.url),
  "utf8",
);

const helper = readFileSync(
  new URL("./medication-schedule.ts", import.meta.url),
  "utf8",
);

describe("medication schedule UI safety", () => {
  it("loads saved schedules and creates today's operational occurrences", () => {
    expect(route).toContain('.from("medication_schedules")');
    expect(route).toContain("buildTodayMedicationOccurrences");
    expect(route).toContain("TodayDosesPanel");
  });

  it("records scheduled taken/skipped actions against the exact occurrence", () => {
    expect(route).toContain("schedule_id: occurrence.scheduleId");
    expect(route).toContain("scheduled_for: occurrence.scheduledFor");
    expect(route).toContain('"taken"');
    expect(route).toContain('"skipped"');
  });

  it("never labels an unrecorded past time as a clinically inferred missed dose", () => {
    expect(helper).toContain('"unrecorded"');
    expect(helper).not.toContain('"missed"');
    expect(route).toContain("غير مسجل");
  });

  it("uses privacy-safe generic browser notifications", () => {
    const notificationStart = route.indexOf("new Notification(");
    const notificationEnd = route.indexOf("window.localStorage.setItem", notificationStart);
    const block = route.slice(notificationStart, notificationEnd);

    expect(notificationStart).toBeGreaterThanOrEqual(0);
    expect(block).toContain("لديك موعد دواء مسجل في مؤشر صحي");
    expect(block).not.toContain("medication?.name");
    expect(route).toContain("لا يعرض اسم الدواء");
  });

  it("warns when the schedule timezone differs from the device timezone", () => {
    expect(route).toContain("occurrence.timezone !== currentTimezone");
    expect(route).toContain("لن نرسل تنبيهًا تلقائيًا");
  });
});
