import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = readFileSync(
  new URL("../routes/journal.tsx", import.meta.url),
  "utf8",
);

describe("health journal UI safety and integration", () => {
  it("connects all four timeline sources", () => {
    for (const table of [
      "health_journal_entries",
      "user_medications",
      "medication_dose_events",
      "measurement_readings",
      "symptom_sessions",
    ]) {
      expect(route).toContain(`.from("${table}")`);
    }
  });

  it("records taken/skipped medication events without recommending treatment", () => {
    expect(route).toContain('"taken"');
    expect(route).toContain('"skipped"');
    expect(route).toContain("التطبيق لا يحدد الجرعة");
    expect(route.toLowerCase()).not.toContain("recommendeddose");
    expect(route.toLowerCase()).not.toContain("prescribedose");
  });

  it("requires sign-in for the personal journal surface", () => {
    expect(route).toContain('search={{ redirect: "/journal" }}');
  });
});
