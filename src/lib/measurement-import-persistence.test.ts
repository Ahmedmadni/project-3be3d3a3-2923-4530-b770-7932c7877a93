import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/20261009113000_measurement_import_persistence.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("measurement import persistence", () => {
  it("creates immutable user-owned batch provenance", () => {
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS public.measurement_import_batches",
    );
    expect(migration).toContain(
      'CREATE POLICY "users read own measurement import batches"',
    );
    expect(migration).toContain("auth.uid() = user_id");
    expect(migration).not.toContain("GRANT INSERT\nON public.measurement_import_batches\nTO authenticated");
  });

  it("links imported readings to batch and original row", () => {
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS import_batch_id");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS import_row_number");
    expect(migration).toContain(
      "measurement_readings_import_provenance_ck",
    );
    expect(migration).toContain(
      "measurement_readings_import_row_unique_idx",
    );
  });

  it("imports through one authenticated security-definer RPC", () => {
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.import_measurement_reading_batch",
    );
    expect(migration).toContain("current_user_id uuid := auth.uid()");
    expect(migration).toContain("RAISE EXCEPTION 'AUTH_REQUIRED'");
    expect(migration).toContain("jsonb_array_elements(p_rows)");
    expect(migration).toContain("TO authenticated");
  });

  it("forces imported quality to unknown and records csv provenance", () => {
    expect(migration).toContain("'quality'");
    expect(migration).toContain("'unknown'");
    expect(migration).toContain("'source', 'csv_import'");
    expect(migration).not.toContain("quality = 'good'");
  });

  it("validates type visibility and units server-side", () => {
    expect(migration).toContain("mt.review_status = 'published'");
    expect(migration).toContain("mt.is_active = true");
    expect(migration).toContain("mt.is_demo = false");
    expect(migration).toContain("MEASUREMENT_TYPE_NOT_AVAILABLE");
    expect(migration).toContain("UNIT_NOT_ALLOWED");
  });

  it("limits file and batch size", () => {
    expect(migration).toContain("p_file_size_bytes > 5242880");
    expect(migration).toContain("p_source_row_count > 2000");
    expect(migration).toContain("jsonb_array_length(p_rows) > 2000");
  });
});
