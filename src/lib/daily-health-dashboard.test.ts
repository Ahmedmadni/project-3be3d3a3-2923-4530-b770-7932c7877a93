import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const component = readFileSync(
  new URL("../components/health/DailyHealthDashboardSection.tsx", import.meta.url),
  "utf8",
);

describe("daily health dashboard", () => {
  it("uses user-owned journal, medication, symptom, and measurement records", () => {
    for (const table of [
      "user_medications",
      "medication_schedules",
      "medication_dose_events",
      "health_journal_entries",
      "symptom_sessions",
      "measurement_readings",
    ]) {
      expect(component).toContain(`.from("${table}")`);
    }
  });

  it("labels unrecorded medication times without inferring missed doses", () => {
    expect(component).toContain("غير مسجل");
    expect(component.toLowerCase()).not.toContain("missed");
    expect(component).toContain("بدون تفسير أو استنتاج طبي");
  });
});
