import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/20261003170000_health_journal_foundation.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("health journal foundation migration", () => {
  it("creates journal, medication, and dose-event tables", () => {
    for (const table of [
      "health_journal_entries",
      "user_medications",
      "medication_dose_events",
    ]) {
      expect(migration).toContain(`CREATE TABLE IF NOT EXISTS public.${table}`);
      expect(migration).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
    }
  });

  it("scopes personal health data to auth.uid()", () => {
    expect(migration.match(/auth\.uid\(\) = user_id/g)?.length).toBeGreaterThanOrEqual(10);
    expect(migration).toContain("m.user_id = auth.uid()");
  });

  it("stores recorded dose actions only", () => {
    expect(migration).toContain("status IN ('taken','skipped')");
    expect(migration).not.toContain("recommended_dose");
    expect(migration).not.toContain("prescribed_dose");
    expect(migration).not.toContain("diagnosis_code");
    expect(migration).not.toContain("diagnosis_id");
    expect(migration).not.toContain("treatment_recommendation");
  });

  it("keeps useful chronological indexes", () => {
    expect(migration).toContain("health_journal_entries_user_time_idx");
    expect(migration).toContain("medication_dose_events_user_time_idx");
    expect(migration).toContain("medication_dose_events_medication_time_idx");
  });
});
