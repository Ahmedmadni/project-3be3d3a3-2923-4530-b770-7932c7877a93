import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/20261004184500_background_push_reminders.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("background push reminder migration", () => {
  it("creates private push subscription and delivery tables", () => {
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS public.web_push_subscriptions",
    );
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS public.medication_reminder_deliveries",
    );
    expect(migration).toContain(
      "ALTER TABLE public.web_push_subscriptions ENABLE ROW LEVEL SECURITY",
    );
    expect(migration).toContain(
      "ALTER TABLE public.medication_reminder_deliveries ENABLE ROW LEVEL SECURITY",
    );
  });

  it("uses valid PostgreSQL dollar quoting for the claim RPC", () => {
    expect(migration).toContain("AS $$\nDECLARE");
    expect(migration).toContain("END\n$$;");
    expect(migration).not.toContain("AS $\nDECLARE");
    expect(migration).not.toContain("END\n$;");
  });

  it("claims a browser endpoint for only the currently authenticated account", () => {
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.claim_web_push_subscription",
    );
    expect(migration).toContain("current_user_id uuid := auth.uid()");
    expect(migration).toContain("ON CONFLICT (endpoint)");
    expect(migration).toContain("user_id = EXCLUDED.user_id");
  });

  it("does not store medication or health content in push subscriptions", () => {
    const start = migration.indexOf(
      "CREATE TABLE IF NOT EXISTS public.web_push_subscriptions",
    );
    const end = migration.indexOf(
      "CREATE TABLE IF NOT EXISTS public.medication_reminder_deliveries",
    );
    const block = migration.slice(start, end);

    expect(block).not.toContain("medication_name");
    expect(block).not.toContain("dose_text");
    expect(block).not.toContain("diagnosis");
    expect(block).not.toContain("measurement");
  });

  it("deduplicates reminder delivery by schedule, subscription, and occurrence", () => {
    expect(migration).toContain(
      "UNIQUE (schedule_id, subscription_id, scheduled_for)",
    );
  });
});
