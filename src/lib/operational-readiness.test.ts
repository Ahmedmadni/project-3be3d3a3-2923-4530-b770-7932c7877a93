import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const audit = readFileSync(
  new URL("../../supabase/operational_readiness_audit.sql", import.meta.url),
  "utf8",
);

const canonicalCron = readFileSync(
  new URL("../../supabase/medication_reminder_cron_setup.sql", import.meta.url),
  "utf8",
);

const legacyCron = readFileSync(
  new URL("../../supabase/medication_reminder_scheduler.sql", import.meta.url),
  "utf8",
);

describe("production Supabase readiness checks", () => {
  it("covers reminder infrastructure and measurement import dependencies", () => {
    for (const marker of [
      "web_push_subscriptions",
      "medication_reminder_deliveries",
      "medication_schedules",
      "measurement_import_batches",
      "measurement_readings",
      "reverted_at",
      "reverted_count",
      "import_measurement_reading_batch_v2",
      "revert_measurement_import_batch",
      "pg_cron",
      "pg_net",
      "relrowsecurity",
      "pg_policies",
    ]) {
      expect(audit).toContain(marker);
    }
  });

  it("does not write to patient data or schedule push deliveries", () => {
    const sql = audit.replace(/--[^\n]*/g, "").toLowerCase();
    const sqlWithoutLiterals = sql.replace(/\x27(?:\x27\x27|[^\x27])*\x27/g, "\x27\x27");
    expect(sql).toContain("with checks as");
    expect(sqlWithoutLiterals).not.toMatch(/\b(insert|update|delete|drop|alter|create|truncate|perform|execute)\b/);
    expect(sql).not.toContain("net.http_post");
  });

  it("uses exactly one cron installer without embedding decrypted values", () => {
    expect(canonicalCron).toContain("FOR old_job IN");
    expect(canonicalCron).toContain("'medication-reminder-dispatch'");
    expect(canonicalCron).toContain("cron.unschedule(old_job.jobid)");
    expect(canonicalCron).toContain("vault.decrypted_secrets");
    expect(canonicalCron).toContain("$job$");
    expect(canonicalCron).not.toContain("format(");
    expect(canonicalCron).not.toContain("%L");
    expect(legacyCron).toContain("DEPRECATED");
    expect(legacyCron).not.toMatch(/\bcron\.schedule\s*\(/i);
  });
});
