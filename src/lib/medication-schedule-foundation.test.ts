import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/20261004181500_medication_schedule_foundation.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("medication schedule foundation migration", () => {
  it("creates user-owned schedule storage and links dose events to occurrences", () => {
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS public.medication_schedules",
    );
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS schedule_id");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS scheduled_for");
    expect(migration).toContain(
      "UNIQUE (schedule_id, scheduled_for)",
    );
  });

  it("limits schedule days to explicit weekdays", () => {
    for (const day of ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]) {
      expect(migration).toContain(`'${day}'`);
    }
    expect(migration).toContain("days_of_week <@ ARRAY");
  });

  it("keeps schedules private to the authenticated user", () => {
    expect(migration).toContain(
      "ALTER TABLE public.medication_schedules ENABLE ROW LEVEL SECURITY",
    );
    expect(migration.match(/auth\.uid\(\) = user_id/g)?.length).toBeGreaterThanOrEqual(5);
    expect(migration).toContain("s.user_id = auth.uid()");
    expect(migration).toContain("s.medication_id = medication_id");
  });

  it("does not calculate a dose, frequency, or treatment", () => {
    expect(migration).not.toContain("recommended_dose");
    expect(migration).not.toContain("calculated_dose");
    expect(migration).not.toContain("treatment_recommendation");
    expect(migration).not.toContain("frequency_per_day");
  });
});
