import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/20261011214000_measurement_import_history_revert.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("measurement import history and atomic revert", () => {
  it("preserves provenance while adding reverted state", () => {
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS reverted_at");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS reverted_count");
    expect(migration).toContain("status IN ('imported','reverted')");
    expect(migration).not.toContain(
      "DELETE FROM public.measurement_import_batches",
    );
  });

  it("blocks an exact-file duplicate server-side", () => {
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.import_measurement_reading_batch_v2",
    );
    expect(migration).toContain("DUPLICATE_FILE_IMPORT");
    expect(migration).toContain("file_sha256 = btrim(p_file_sha256)");
    expect(migration).toContain("b.status = 'imported'");
    expect(migration).toContain("pg_advisory_xact_lock");
  });

  it("removes authenticated access to the unguarded legacy importer", () => {
    expect(migration).toContain(
      "REVOKE EXECUTE\nON FUNCTION public.import_measurement_reading_batch(",
    );
    expect(migration).toContain("FROM authenticated");
  });

  it("reverts one owned batch atomically without deleting batch provenance", () => {
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.revert_measurement_import_batch",
    );
    expect(migration).toContain("FOR UPDATE");
    expect(migration).toContain("r.import_batch_id = p_batch_id");
    expect(migration).toContain("r.user_id = current_user_id");
    expect(migration).toContain("status = 'reverted'");
    expect(migration).toContain("reverted_at = now()");
    expect(migration).toContain("reverted_count = removed_rows");
  });

  it("keeps revert idempotent", () => {
    expect(migration).toContain("IF batch_status = 'reverted' THEN");
    expect(migration).toContain("'already_reverted', true");
  });
});
