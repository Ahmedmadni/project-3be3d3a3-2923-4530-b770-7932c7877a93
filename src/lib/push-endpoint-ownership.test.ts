import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/20261014001000_web_push_subscription_ownership_guard.sql",
    import.meta.url,
  ),
  "utf8",
);

const originalMigration = readFileSync(
  new URL(
    "../../supabase/migrations/20261004184500_background_push_reminders.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("push endpoint account ownership hardening", () => {
  it("replaces the exact claim RPC without rewriting historical migrations", () => {
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.claim_web_push_subscription(",
    );
    expect(originalMigration).toContain(
      "CREATE TABLE IF NOT EXISTS public.web_push_subscriptions",
    );
    expect(migration).toContain("SET search_path = ''");
    expect(migration).toContain("current_user_id uuid := auth.uid()");
    expect(migration).toContain("RAISE EXCEPTION 'AUTH_REQUIRED'");
  });

  it("allows a same-owner refresh without reassigning an endpoint", () => {
    expect(migration).toContain("ON CONFLICT (endpoint)");
    expect(migration).toContain(
      "WHERE public.web_push_subscriptions.user_id = EXCLUDED.user_id",
    );
    expect(migration).toContain(
      "RAISE EXCEPTION 'PUSH_SUBSCRIPTION_OWNERSHIP_CONFLICT'",
    );
    expect(migration).toContain("IF subscription_id IS NULL THEN");

    const assignments = migration.split("DO UPDATE SET")[1]?.split(
      "WHERE public.web_push_subscriptions.user_id",
    )[0];
    expect(assignments).toBeDefined();
    expect(assignments).toContain("is_active = true");
    expect(assignments).not.toMatch(/\buser_id\s*=/i);
  });

  it("rejects anonymous function execution", () => {
    expect(migration).toContain("FROM PUBLIC, anon");
    expect(migration).toContain("TO authenticated");
    expect(migration).toContain("p_endpoint IS NULL");
    expect(migration).toContain("p_auth_secret IS NULL");
  });

  it("does not access health data or alter reminder delivery records", () => {
    expect(migration).not.toContain("medication_reminder_deliveries");
    expect(migration).not.toContain("medication_schedules");
    expect(migration).not.toContain("medication_dose_events");
    expect(migration).not.toContain("DELETE FROM");
  });
});
