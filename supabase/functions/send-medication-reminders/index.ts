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

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return Response.json({ error: "METHOD_NOT_ALLOWED" }, { status: 405 });
    }

    const cronSecret = Deno.env.get("MEDICATION_REMINDER_CRON_SECRET");
    if (!cronSecret || request.headers.get("x-cron-secret") !== cronSecret) {
      return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (
      !supabaseUrl ||
      !serviceRoleKey ||
      !vapidSubject ||
      !vapidPublicKey ||
      !vapidPrivateKey
    ) {
      return Response.json(
        { error: "REMINDER_ENV_NOT_CONFIGURED" },
        { status: 503 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    webpush.setVapidDetails(
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey,
    );

    const now = new Date();
    const scheduledFor = minuteIso(now);

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

    const dueSchedules = (schedules ?? [])
      .map((row) => row as unknown as MedicationSchedule)
      .filter((schedule) => scheduleIsDue(schedule, now));

    if (!dueSchedules.length) {
      return Response.json({
        ok: true,
        checked_at: scheduledFor,
        due_schedules: 0,
        sent: 0,
        skipped_recorded: 0,
        failed: 0,
      });
    }

    const scheduleIds = dueSchedules.map((schedule) => schedule.id);
    const userIds = [...new Set(dueSchedules.map((schedule) => schedule.user_id))];

    const [{ data: recordedEvents, error: eventError }, { data: subscriptions, error: subError }] =
      await Promise.all([
        supabase
          .from("medication_dose_events")
          .select("schedule_id,scheduled_for")
          .in("schedule_id", scheduleIds)
          .eq("scheduled_for", scheduledFor),
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

    const recordedScheduleIds = new Set(
      (recordedEvents ?? [])
        .map((event) => event.schedule_id)
        .filter((id): id is string => Boolean(id)),
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

    for (const schedule of dueSchedules) {
      if (recordedScheduleIds.has(schedule.id)) {
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
          if (reserveError.code === "23505") continue;
          failed += 1;
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
            JSON.stringify({ kind: "health_reminder" }),
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
            typeof error.statusCode === "number"
              ? error.statusCode
              : null;

          await supabase
            .from("medication_reminder_deliveries")
            .update({
              status: "failed",
              provider_status: statusCode,
              error_code: statusCode ? `HTTP_${statusCode}` : "PUSH_FAILED",
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
      checked_at: scheduledFor,
      due_schedules: dueSchedules.length,
      sent,
      skipped_recorded: skippedRecorded,
      no_subscription: noSubscription,
      failed,
    });
  },
};
