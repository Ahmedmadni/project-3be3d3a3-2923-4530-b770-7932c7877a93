import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/20261004184500_background_push_reminders.sql",
    import.meta.url,
  ),
  "utf8",
);

const edgeFunction = readFileSync(
  new URL(
    "../../supabase/functions/send-medication-reminders/index.ts",
    import.meta.url,
  ),
  "utf8",
);

const serviceWorker = readFileSync(
  new URL("../../public/sw.js", import.meta.url),
  "utf8",
);

const cronSetup = readFileSync(
  new URL(
    "../../supabase/medication_reminder_cron_setup.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("background medication reminder infrastructure", () => {
  it("keeps push subscriptions private and claims endpoints for the current user", () => {
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS public.web_push_subscriptions",
    );
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS public.medication_reminder_deliveries",
    );
    expect(migration).toContain("auth.uid() = user_id");
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.claim_web_push_subscription",
    );
    expect(migration).toContain("current_user_id uuid := auth.uid()");
    expect(migration).toContain("ON CONFLICT (endpoint)");
  });

  it("sends only generic push payloads without medication or dose details", () => {
    expect(edgeFunction).toContain('"kind": "health_reminder"');
    expect(edgeFunction).not.toContain("medication_name");
    expect(edgeFunction).not.toContain("dose_text");
    expect(edgeFunction).not.toContain("schedule_text");

    const notificationStart = serviceWorker.indexOf(
      'self.registration.showNotification("مؤشر صحي"',
    );
    const notificationEnd = serviceWorker.indexOf(
      "notificationclick",
      notificationStart,
    );
    const notificationBlock = serviceWorker.slice(
      notificationStart,
      notificationEnd,
    );

    expect(notificationBlock).toContain(
      "لديك تذكير صحي مسجل. افتح التطبيق لمراجعته.",
    );
    expect(notificationBlock).not.toContain("medicationName");
    expect(notificationBlock).not.toContain("doseText");
  });

  it("deduplicates deliveries and suppresses already-recorded occurrences", () => {
    expect(migration).toContain(
      "UNIQUE (schedule_id, subscription_id, scheduled_for)",
    );
    expect(edgeFunction).toContain('"medication_dose_events"');
    expect(edgeFunction).toContain("recordedOccurrenceKeys");
    expect(edgeFunction).toContain('reserveError.code === "23505"');
  });

  it("recovers a short scheduler delay without widening the reminder window indefinitely", () => {
    expect(edgeFunction).toContain("Array.from({ length: 5 }");
    expect(edgeFunction).toContain("index * 60_000");
  });

  it("uses Vault-backed cron secrets and never commits a concrete secret", () => {
    expect(cronSetup).toContain("vault.decrypted_secrets");
    expect(cronSetup).toContain("medication_reminder_cron_secret");
    expect(cronSetup).toContain("'x-cron-secret'");
    expect(cronSetup).not.toMatch(/x-cron-secret'\s*,\s*'[A-Za-z0-9_-]{20,}'/);
  });

  it("does not cache personalized navigation or health API responses", () => {
    expect(serviceWorker).toContain("Never cache navigation HTML");
    expect(serviceWorker).toContain('url.pathname.startsWith("/api/")');
    expect(serviceWorker).toContain('request.mode === "navigate"');
  });
});
