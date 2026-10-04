import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = readFileSync(
  new URL("../routes/health-summary.tsx", import.meta.url),
  "utf8",
);

describe("printable health summary", () => {
  it("uses only user-recorded health sources already present in the app", () => {
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

  it("is explicitly non-diagnostic and non-prescriptive", () => {
    expect(route).toContain("لا يتضمن تشخيصًا أو توصية علاجية");
    expect(route).toContain("لا يؤكد تشخيصًا");
    expect(route).toContain("لا يوصي بتغيير دواء أو جرعة أو علاج");
  });

  it("supports browser print or save-to-PDF without a server export dependency", () => {
    expect(route).toContain("window.print()");
    expect(route).toContain("طباعة / حفظ PDF");
  });

  it("requires authentication", () => {
    expect(route).toContain('search={{ redirect: "/health-summary" }}');
  });
});
