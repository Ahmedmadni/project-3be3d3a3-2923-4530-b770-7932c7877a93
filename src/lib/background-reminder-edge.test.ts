import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const edge = readFileSync(
  new URL(
    "../../supabase/functions/send-medication-reminders/index.ts",
    import.meta.url,
  ),
  "utf8",
);

const scheduler = readFileSync(
  new URL("../../supabase/medication_reminder_scheduler.sql", import.meta.url),
  "utf8",
);

describe("background medication reminder sender", () => {
  it("requires a dedicated cron secret before privileged work", () => {
    expect(edge).toContain('Deno.env.get("MEDICATION_REMINDER_CRON_SECRET")');
    expect(edge).toContain('request.headers.get("x-cron-secret")');
    expect(edge).toContain('{ error: "UNAUTHORIZED" }');
  });

  it("uses pinned Edge Function dependencies", () => {
    expect(edge).toContain(
      'npm:@supabase/supabase-js@2.117.1',
    );
    expect(edge).toContain('npm:web-push@3.6.7');
  });

  it("sends only a generic non-clinical payload", () => {
    expect(edge).toContain('kind: "health_reminder"');
    expect(edge).not.toContain("medication.name");
    expect(edge).not.toContain("dose_text");
  });

  it("does not send if the scheduled occurrence already has a recorded action", () => {
    expect(edge).toContain('from("medication_dose_events")');
    expect(edge).toContain("recordedOccurrenceKeys.has(occurrenceKey)");
    expect(edge).toContain("skippedRecorded += 1");
  });

  it("recovers short scheduler delays without sending the same occurrence twice", () => {
    expect(edge).toContain("Array.from({ length: 5 }");
    expect(edge).toContain("index * 60_000");
    expect(edge).toContain('reserveError.code === "23505"');
  });

  it("deactivates expired push endpoints", () => {
    expect(edge).toContain("statusCode === 404 || statusCode === 410");
    expect(edge).toContain(".update({ is_active: false })");
  });

  it("schedules the sender through Vault-backed pg_cron and pg_net", () => {
    expect(scheduler).toContain("cron.schedule");
    expect(scheduler).toContain("net.http_post");
    expect(scheduler).toContain("medication_reminder_cron_secret");
    expect(scheduler).toContain("x-cron-secret");
  });
});
