export type ReminderReliabilityState =
  | "not_enabled"
  | "idle"
  | "healthy"
  | "degraded";

export interface ReminderSubscriptionLike {
  is_active: boolean;
}

export interface ReminderDeliveryLike {
  status: "pending" | "sent" | "failed";
  scheduled_for: string;
  sent_at: string | null;
  error_code: string | null;
  created_at: string;
}

export interface ReminderReliabilitySummary {
  state: ReminderReliabilityState;
  totalSubscriptions: number;
  activeSubscriptions: number;
  sentLast24h: number;
  failedLast24h: number;
  pendingLast24h: number;
  lastSentAt: string | null;
  lastFailureAt: string | null;
  lastFailureCode: string | null;
}

export function buildReminderReliabilitySummary(
  subscriptions: readonly ReminderSubscriptionLike[],
  deliveries: readonly ReminderDeliveryLike[],
  now = new Date(),
): ReminderReliabilitySummary {
  const cutoff = now.getTime() - 24 * 60 * 60 * 1000;
  const activeSubscriptions = subscriptions.filter(
    (item) => item.is_active,
  ).length;

  const recent = deliveries.filter(
    (item) => new Date(item.scheduled_for).getTime() >= cutoff,
  );

  const sentLast24h = recent.filter((item) => item.status === "sent").length;
  const failedLast24h = recent.filter((item) => item.status === "failed").length;
  const pendingLast24h = recent.filter((item) => item.status === "pending").length;

  const latestSent =
    deliveries
      .filter((item) => item.status === "sent" && item.sent_at)
      .sort(
        (a, b) =>
          new Date(b.sent_at!).getTime() - new Date(a.sent_at!).getTime(),
      )[0] ?? null;

  const latestFailure =
    deliveries
      .filter((item) => item.status === "failed")
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )[0] ?? null;

  const state: ReminderReliabilityState =
    activeSubscriptions === 0
      ? "not_enabled"
      : failedLast24h > 0
        ? "degraded"
        : sentLast24h > 0
          ? "healthy"
          : "idle";

  return {
    state,
    totalSubscriptions: subscriptions.length,
    activeSubscriptions,
    sentLast24h,
    failedLast24h,
    pendingLast24h,
    lastSentAt: latestSent?.sent_at ?? null,
    lastFailureAt: latestFailure?.created_at ?? null,
    lastFailureCode: latestFailure?.error_code ?? null,
  };
}
