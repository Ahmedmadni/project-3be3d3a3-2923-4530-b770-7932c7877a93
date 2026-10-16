import { createClient } from "npm:@supabase/supabase-js@2.117.1";
import webpush from "npm:web-push@3.6.7";

type MedicationSchedule = {
  id: string;
  user_id: string;
  medication_id: string;
  time_local: string;
  days_of_week: string[];
  timezone: string;
  reminder_enabled: boolean;
  start_date: string | null;
  end_date: string | null;
};

type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth_secret: string;
};

const weekdayCode: Record<string, string> = {
  Sun: "sun",
  Mon: "mon",
  Tue: "tue",
  Wed: "wed",
  Thu: "thu",
  Fri: "fri",
  Sat: "sat",
};

function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    dateKey: `${read("year")}-${read("month")}-${read("day")}`,
    dayCode: weekdayCode[read("weekday")] ?? "",
    timeKey: `${read("hour")}:${read("minute")}`,
  };
}

function minuteIso(date: Date): string {
  const value = new Date(date);
  value.setUTCSeconds(0, 0);
  return value.toISOString();
}

function serviceKey(): string | null {
  const modern = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (modern) {
    try {
      const parsed = JSON.parse(modern) as Record<string, string>;
      if (parsed.default) return parsed.default;
    } catch {
      // Fall back to the legacy key below.
    }
  }

  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? null;
}

function scheduleIsDue(schedule: MedicationSchedule, now: Date): boolean {
  if (!schedule.reminder_enabled) return false;

  let local;
  try {
    local = localParts(now, schedule.timezone);
  } catch {
    return false;
  }

  if (!local.dayCode || !schedule.days_of_week.includes(local.dayCode)) {
    return false;
  }

  if (schedule.start_date && local.dateKey < schedule.start_date) return false;
  if (schedule.end_date && local.dateKey > schedule.end_date) return false;

  return schedule.time_local.slice(0, 5) === local.timeKey;
}

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

// VAPID pair derived deterministically from a server-only random seed, so the
// private key is never typed, printed, or seen by anyone. Explicit
// VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY secrets take precedence when both exist.
let cachedVapid: { publicKey: string; privateKey: string } | null = null;
async function vapidKeys(): Promise<{ publicKey: string; privateKey: string } | null> {
  const pub = Deno.env.get("VAPID_PUBLIC_KEY");
  const priv = Deno.env.get("VAPID_PRIVATE_KEY");
  if (pub && priv) return { publicKey: pub, privateKey: priv };
  if (cachedVapid) return cachedVapid;
  const seed = Deno.env.get("VAPID_KEY_SEED");
  if (!seed || seed.length < 32) return null;
  const { createHash, createECDH } = await import("node:crypto");
  const privateBytes = createHash("sha256").update(`vapid-v1:${seed}`).digest();
  const ecdh = createECDH("prime256v1");
  ecdh.setPrivateKey(privateBytes);
  cachedVapid = {
    publicKey: b64url(new Uint8Array(ecdh.getPublicKey())),
    privateKey: b64url(new Uint8Array(privateBytes)),
  };
  return cachedVapid;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    // Public VAPID key only (safe to expose); never the private key.
    if (request.method === "GET") {
      const keys = await vapidKeys();
      if (!keys) {
        return Response.json({ error: "VAPID_NOT_CONFIGURED" }, { status: 503, headers: corsHeaders });
      }
      return Response.json({ publicKey: keys.publicKey }, { headers: corsHeaders });
    }
    if (request.method !== "POST") {
      return Response.json({ error: "METHOD_NOT_ALLOWED" }, { status: 405 });
    }

    const cronSecret = Deno.env.get("MEDICATION_REMINDER_CRON_SECRET");
    if (!cronSecret || request.headers.get("x-cron-secret") !== cronSecret) {
      return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const dryRun = new URL(request.url).searchParams.get("dry_run") === "1";
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = serviceKey();
    const vapidSubject = Deno.env.get("VAPID_SUBJECT");
    const vapid = await vapidKeys();

    if (!supabaseUrl || !serviceRoleKey || !vapidSubject || !vapid) {
      return Response.json(
        { error: "REMINDER_ENV_NOT_CONFIGURED" },
        { status: 503 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    webpush.setVapidDetails(vapidSubject, vapid.publicKey, vapid.privateKey);

    if (dryRun) {
      const { count, error } = await supabase
        .from("web_push_subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true);
      return Response.json({
        ok: !error,
        dry_run: true,
        env_ready: true,
        vapid_valid: true,
        active_subscriptions: count ?? 0,
      });
    }

    const now = new Date();
    const candidateMinutes = Array.from({ length: 5 }, (_, index) => {
      const candidate = new Date(now.getTime() - index * 60_000);
      candidate.setUTCSeconds(0, 0);
      return candidate;
    });

    const { data: schedules, error: scheduleError } = await supabase
      .from("medication_schedules")
      .select(
        "id,user_id,medication_id,time_local,days_of_week,timezone,reminder_enabled,start_date,end_date,user_medications!inner(is_active)",
      )
      .eq("reminder_enabled", true)
      .eq("user_medications.is_active", true);

    if (scheduleError) {
      return Response.json(
        { error: "SCHEDULE_QUERY_FAILED", detail: scheduleError.message },
        { status: 500 },
      );
    }

    const dueOccurrences = (schedules ?? [])
      .map((row) => row as unknown as MedicationSchedule)
      .flatMap((schedule) => {
        const candidate = candidateMinutes.find((minute) =>
          scheduleIsDue(schedule, minute),
        );

        return candidate
          ? [{ schedule, scheduledFor: minuteIso(candidate) }]
          : [];
      });

    if (!dueOccurrences.length) {
      return Response.json({
        ok: true,
        checked_at: minuteIso(now),
        due_occurrences: 0,
        sent: 0,
        skipped_recorded: 0,
        failed: 0,
      });
    }

    const scheduleIds = [
      ...new Set(dueOccurrences.map(({ schedule }) => schedule.id)),
    ];
    const scheduledForValues = [
      ...new Set(dueOccurrences.map(({ scheduledFor }) => scheduledFor)),
    ];
    const userIds = [
      ...new Set(dueOccurrences.map(({ schedule }) => schedule.user_id)),
    ];

    const [
      { data: recordedEvents, error: eventError },
      { data: subscriptions, error: subError },
    ] = await Promise.all([
      supabase
        .from("medication_dose_events")
        .select("schedule_id,scheduled_for")
        .in("schedule_id", scheduleIds)
        .in("scheduled_for", scheduledForValues),
      supabase
        .from("web_push_subscriptions")
        .select("id,user_id,endpoint,p256dh,auth_secret")
        .in("user_id", userIds)
        .eq("is_active", true),
    ]);

    if (eventError || subError) {
      return Response.json(
        {
          error: "REMINDER_DEPENDENCY_QUERY_FAILED",
          detail: eventError?.message ?? subError?.message,
        },
        { status: 500 },
      );
    }

    const recordedOccurrenceKeys = new Set(
      (recordedEvents ?? [])
        .filter(
          (event) =>
            Boolean(event.schedule_id) && Boolean(event.scheduled_for),
        )
        .map(
          (event) =>
            `${event.schedule_id}|${minuteIso(
              new Date(event.scheduled_for!),
            )}`,
        ),
    );

    const subscriptionsByUser = new Map<string, PushSubscriptionRow[]>();
    for (const raw of subscriptions ?? []) {
      const subscription = raw as PushSubscriptionRow;
      const current = subscriptionsByUser.get(subscription.user_id) ?? [];
      current.push(subscription);
      subscriptionsByUser.set(subscription.user_id, current);
    }

    let sent = 0;
    let failed = 0;
    let skippedRecorded = 0;
    let noSubscription = 0;
    let skippedDuplicate = 0;

    for (const { schedule, scheduledFor } of dueOccurrences) {
      const occurrenceKey = `${schedule.id}|${scheduledFor}`;
      if (recordedOccurrenceKeys.has(occurrenceKey)) {
        skippedRecorded += 1;
        continue;
      }

      const userSubscriptions = subscriptionsByUser.get(schedule.user_id) ?? [];
      if (!userSubscriptions.length) {
        noSubscription += 1;
        continue;
      }

      for (const subscription of userSubscriptions) {
        const { data: delivery, error: reserveError } = await supabase
          .from("medication_reminder_deliveries")
          .insert({
            user_id: schedule.user_id,
            schedule_id: schedule.id,
            subscription_id: subscription.id,
            scheduled_for: scheduledFor,
            status: "pending",
          })
          .select("id")
          .single();

        if (reserveError) {
          if (reserveError.code === "23505") skippedDuplicate += 1;
          else failed += 1;
          continue;
        }

        try {
          const response = await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth_secret,
              },
            },
            JSON.stringify({
              kind: "health_reminder",
              url: "/journal",
            }),
            {
              TTL: 600,
              urgency: "normal",
            },
          );

          await supabase
            .from("medication_reminder_deliveries")
            .update({
              status: "sent",
              provider_status: response.statusCode ?? null,
              sent_at: new Date().toISOString(),
            })
            .eq("id", delivery.id);

          sent += 1;
        } catch (error) {
          const statusCode =
            typeof error === "object" &&
            error !== null &&
            "statusCode" in error &&
            typeof (error as { statusCode?: unknown }).statusCode === "number"
              ? (error as { statusCode: number }).statusCode
              : null;

          await supabase
            .from("medication_reminder_deliveries")
            .update({
              status: "failed",
              provider_status: statusCode,
              error_code:
                statusCode === 404 || statusCode === 410
                  ? "SUBSCRIPTION_GONE"
                  : "PUSH_FAILED",
            })
            .eq("id", delivery.id);

          if (statusCode === 404 || statusCode === 410) {
            await supabase
              .from("web_push_subscriptions")
              .update({ is_active: false })
              .eq("id", subscription.id);
          }

          failed += 1;
        }
      }
    }

    return Response.json({
      ok: true,
      checked_at: minuteIso(now),
      due_occurrences: dueOccurrences.length,
      sent,
      skipped_recorded: skippedRecorded,
      skipped_duplicate: skippedDuplicate,
      no_subscription: noSubscription,
      failed,
    });
  },
};
