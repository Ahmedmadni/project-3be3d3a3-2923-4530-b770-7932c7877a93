import { describe, expect, it } from "vitest";
import { buildReminderReliabilitySummary } from "./reminder-reliability";

const now = new Date("2026-10-08T09:00:00Z");

describe("reminder reliability summary", () => {
  it("reports not enabled when there is no active subscription", () => {
    expect(
      buildReminderReliabilitySummary(
        [{ is_active: false }],
        [],
        now,
      ).state,
    ).toBe("not_enabled");
  });

  it("treats no recent deliveries as idle rather than failed", () => {
    expect(
      buildReminderReliabilitySummary(
        [{ is_active: true }],
        [],
        now,
      ).state,
    ).toBe("idle");
  });

  it("reports healthy after successful recent delivery without failures", () => {
    const summary = buildReminderReliabilitySummary(
      [{ is_active: true }],
      [
        {
          status: "sent",
          scheduled_for: "2026-10-08T08:30:00Z",
          sent_at: "2026-10-08T08:30:05Z",
          error_code: null,
          created_at: "2026-10-08T08:30:00Z",
        },
      ],
      now,
    );

    expect(summary.state).toBe("healthy");
    expect(summary.sentLast24h).toBe(1);
    expect(summary.lastSentAt).toBe("2026-10-08T08:30:05Z");
  });

  it("reports degraded after a recent failed delivery", () => {
    const summary = buildReminderReliabilitySummary(
      [{ is_active: true }],
      [
        {
          status: "failed",
          scheduled_for: "2026-10-08T08:30:00Z",
          sent_at: null,
          error_code: "SUBSCRIPTION_GONE",
          created_at: "2026-10-08T08:31:00Z",
        },
      ],
      now,
    );

    expect(summary.state).toBe("degraded");
    expect(summary.failedLast24h).toBe(1);
    expect(summary.lastFailureCode).toBe("SUBSCRIPTION_GONE");
  });

  it("ignores old failures when determining today's operational state", () => {
    const summary = buildReminderReliabilitySummary(
      [{ is_active: true }],
      [
        {
          status: "failed",
          scheduled_for: "2026-10-01T08:30:00Z",
          sent_at: null,
          error_code: "PUSH_FAILED",
          created_at: "2026-10-01T08:31:00Z",
        },
      ],
      now,
    );

    expect(summary.state).toBe("idle");
    expect(summary.failedLast24h).toBe(0);
    expect(summary.lastFailureCode).toBe("PUSH_FAILED");
  });
});
