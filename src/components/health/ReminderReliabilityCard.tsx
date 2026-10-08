import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BellOff,
  CheckCircle2,
  CircleAlert,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import {
  backgroundPushSupported,
  currentBackgroundMedicationReminderEndpoint,
  disableBackgroundMedicationReminders,
  enableBackgroundMedicationReminders,
  type PushReminderStatus,
} from "@/lib/push-reminders";
import { buildReminderReliabilitySummary } from "@/lib/reminder-reliability";
import { cn } from "@/lib/utils";

export function ReminderReliabilityCard({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { user } = useAuth();
  const { lang } = useI18n();
  const qc = useQueryClient();
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<
    PushReminderStatus | "idle" | "working"
  >("idle");

  const subscriptionsQuery = useQuery({
    queryKey: ["reminder-reliability-subscriptions", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("web_push_subscriptions")
        .select("id,endpoint,is_active,created_at,updated_at")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deliveriesQuery = useQuery({
    queryKey: ["reminder-reliability-deliveries", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medication_reminder_deliveries")
        .select("id,status,scheduled_for,sent_at,error_code,created_at")
        .eq("user_id", user!.id)
        .order("scheduled_for", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const reminderSchedulesQuery = useQuery({
    queryKey: ["reminder-reliability-schedules", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { count, error } = await supabase
        .from("medication_schedules")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("reminder_enabled", true);
      if (error) throw error;
      return count ?? 0;
    },
  });

  useEffect(() => {
    let cancelled = false;

    currentBackgroundMedicationReminderEndpoint()
      .then((endpoint) => {
        if (!cancelled) setCurrentEndpoint(endpoint);
      })
      .catch(() => {
        if (!cancelled) setCurrentEndpoint(null);
      });

    return () => {
      cancelled = true;
    };
  }, [subscriptionsQuery.dataUpdatedAt]);

  const summary = useMemo(
    () =>
      buildReminderReliabilitySummary(
        subscriptionsQuery.data ?? [],
        deliveriesQuery.data ?? [],
      ),
    [deliveriesQuery.data, subscriptionsQuery.data],
  );

  const currentDeviceActive = Boolean(
    currentEndpoint &&
      (subscriptionsQuery.data ?? []).some(
        (item) => item.endpoint === currentEndpoint && item.is_active,
      ),
  );

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({
        queryKey: ["reminder-reliability-subscriptions", user?.id],
      }),
      qc.invalidateQueries({
        queryKey: ["reminder-reliability-deliveries", user?.id],
      }),
      qc.invalidateQueries({
        queryKey: ["reminder-reliability-schedules", user?.id],
      }),
    ]);
  };

  const enableMutation = useMutation({
    mutationFn: async () => {
      setActionStatus("working");
      return enableBackgroundMedicationReminders();
    },
    onSuccess: async (status) => {
      setActionStatus(status);
      setCurrentEndpoint(
        await currentBackgroundMedicationReminderEndpoint(),
      );
      await refresh();
    },
    onError: () => setActionStatus("idle"),
  });

  const disableMutation = useMutation({
    mutationFn: async () => {
      setActionStatus("working");
      await disableBackgroundMedicationReminders();
    },
    onSuccess: async () => {
      setActionStatus("idle");
      setCurrentEndpoint(null);
      await refresh();
    },
    onError: () => setActionStatus("idle"),
  });

  if (!user) return null;

  const loading =
    subscriptionsQuery.isLoading ||
    deliveriesQuery.isLoading ||
    reminderSchedulesQuery.isLoading;

  const hasError =
    subscriptionsQuery.error ||
    deliveriesQuery.error ||
    reminderSchedulesQuery.error;

  const labels = {
    not_enabled: lang === "ar" ? "غير مفعلة" : "Not enabled",
    idle: lang === "ar" ? "مفعلة — بلا إرسال حديث" : "Enabled — no recent send",
    healthy: lang === "ar" ? "تعمل بصورة طبيعية" : "Operating normally",
    degraded: lang === "ar" ? "تحتاج مراجعة" : "Needs attention",
  } as const;

  const stateClass =
    summary.state === "healthy"
      ? "bg-success-soft text-success"
      : summary.state === "degraded"
        ? "bg-warning-soft text-warning"
        : summary.state === "not_enabled"
          ? "bg-muted text-muted-foreground"
          : "bg-primary-soft text-primary";

  const StateIcon =
    summary.state === "healthy"
      ? CheckCircle2
      : summary.state === "degraded"
        ? CircleAlert
        : summary.state === "not_enabled"
          ? BellOff
          : Bell;

  if (compact) {
    return (
      <section className="rounded-2xl bg-card p-4 ring-1 ring-border">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Bell className="size-4 text-primary" />
              <h3 className="text-xs font-extrabold">
                {lang === "ar" ? "موثوقية التذكيرات" : "Reminder reliability"}
              </h3>
            </div>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              {lang === "ar"
                ? "حالة تشغيلية فقط؛ لا تتضمن أي تفسير طبي."
                : "Operational status only; no clinical interpretation."}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold",
              stateClass,
            )}
          >
            <StateIcon className="size-3" />
            {labels[summary.state]}
          </span>
        </div>

        {!loading && !hasError ? (
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <CompactMetric
              value={summary.activeSubscriptions}
              label={lang === "ar" ? "أجهزة" : "Devices"}
            />
            <CompactMetric
              value={summary.sentLast24h}
              label={lang === "ar" ? "أُرسلت" : "Sent"}
            />
            <CompactMetric
              value={summary.failedLast24h}
              label={lang === "ar" ? "فشلت" : "Failed"}
            />
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="glass rounded-3xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-primary-soft text-primary">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <h2 className="font-extrabold">
              {lang === "ar" ? "موثوقية التذكيرات" : "Reminder reliability"}
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {lang === "ar"
                ? "حالة الاشتراك والإرسال لهذا الحساب. لا نعرض اسم الدواء داخل إشعار النظام."
                : "Subscription and delivery status for this account. System notifications never show the medication name."}
            </p>
          </div>
        </div>

        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold",
            stateClass,
          )}
        >
          <StateIcon className="size-3.5" />
          {labels[summary.state]}
        </span>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {lang === "ar"
            ? "جارٍ فحص حالة التذكيرات..."
            : "Checking reminder status..."}
        </p>
      ) : hasError ? (
        <p className="mt-4 rounded-xl bg-warning-soft px-3 py-2 text-xs text-warning">
          {lang === "ar"
            ? "تعذر قراءة حالة خدمة التذكيرات. قد تكون بنية Background Push غير مطبقة بعد في قاعدة البيانات."
            : "Reminder service status could not be read. The Background Push database foundation may not be deployed yet."}
        </p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <ReliabilityMetric
              value={summary.activeSubscriptions}
              label={lang === "ar" ? "أجهزة نشطة" : "Active devices"}
            />
            <ReliabilityMetric
              value={reminderSchedulesQuery.data ?? 0}
              label={lang === "ar" ? "مواعيد بتنبيه" : "Reminder times"}
            />
            <ReliabilityMetric
              value={summary.sentLast24h}
              label={lang === "ar" ? "إرسال ناجح 24س" : "Sent in 24h"}
            />
            <ReliabilityMetric
              value={summary.failedLast24h}
              label={lang === "ar" ? "فشل 24س" : "Failed in 24h"}
            />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
              <div className="flex items-center gap-2">
                <Smartphone className="size-4 text-primary" />
                <p className="text-xs font-extrabold">
                  {lang === "ar" ? "هذا الجهاز" : "This device"}
                </p>
              </div>
              <p className="mt-2 text-sm font-bold">
                {currentDeviceActive
                  ? lang === "ar"
                    ? "مسجل لاستقبال التذكيرات"
                    : "Registered for reminders"
                  : lang === "ar"
                    ? "غير مسجل حاليًا"
                    : "Not currently registered"}
              </p>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                {lang === "ar"
                  ? "إجمالي الاشتراكات المسجلة للحساب: " +
                    summary.totalSubscriptions +
                    "."
                  : "Total subscriptions recorded for the account: " +
                    summary.totalSubscriptions +
                    "."}
              </p>
            </div>

            <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
              <p className="text-xs font-extrabold">
                {lang === "ar" ? "آخر نشاط إرسال" : "Latest delivery activity"}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {summary.lastSentAt
                  ? (lang === "ar" ? "آخر نجاح: " : "Last sent: ") +
                    new Date(summary.lastSentAt).toLocaleString(
                      lang === "ar" ? "ar-SA" : "en",
                    )
                  : lang === "ar"
                    ? "لا يوجد إرسال ناجح مسجل بعد."
                    : "No successful delivery recorded yet."}
              </p>
              {summary.lastFailureAt ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {(lang === "ar" ? "آخر فشل: " : "Last failure: ") +
                    new Date(summary.lastFailureAt).toLocaleString(
                      lang === "ar" ? "ar-SA" : "en",
                    )}
                  {summary.lastFailureCode
                    ? " • " + summary.lastFailureCode
                    : ""}
                </p>
              ) : null}
            </div>
          </div>

          {summary.state === "idle" ? (
            <p className="mt-3 rounded-xl bg-primary-soft/60 px-3 py-2 text-[11px] leading-5 text-muted-foreground">
              {lang === "ar"
                ? "عدم وجود إرسال حديث لا يعني وجود عطل؛ قد لا يكون لديك موعد تنبيه مستحق خلال آخر 24 ساعة."
                : "No recent delivery does not imply a fault; there may simply have been no reminder due in the last 24 hours."}
            </p>
          ) : null}

          {summary.state === "degraded" ? (
            <p className="mt-3 rounded-xl bg-warning-soft px-3 py-2 text-[11px] leading-5 text-warning">
              {lang === "ar"
                ? "يوجد فشل إرسال حديث. إذا كان الخطأ SUBSCRIPTION_GONE فأعد تفعيل هذا الجهاز لإنشاء اشتراك جديد."
                : "A recent delivery failed. If the code is SUBSCRIPTION_GONE, re-enable this device to create a fresh subscription."}
            </p>
          ) : null}
        </>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {currentDeviceActive ? (
          <button
            type="button"
            disabled={disableMutation.isPending}
            onClick={() => disableMutation.mutate()}
            className="inline-flex items-center gap-2 rounded-xl bg-card px-4 py-2.5 text-xs font-bold text-muted-foreground ring-1 ring-border disabled:opacity-50"
          >
            <BellOff className="size-4" />
            {lang === "ar"
              ? "إيقاف التذكيرات على هذا الجهاز"
              : "Disable on this device"}
          </button>
        ) : (
          <button
            type="button"
            disabled={
              enableMutation.isPending ||
              actionStatus === "working" ||
              !backgroundPushSupported()
            }
            onClick={() => enableMutation.mutate()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
          >
            <Bell className="size-4" />
            {lang === "ar"
              ? "تفعيل / إعادة تفعيل هذا الجهاز"
              : "Enable / re-enable this device"}
          </button>
        )}

        <button
          type="button"
          onClick={() => refresh()}
          className="inline-flex items-center gap-2 rounded-xl bg-card px-4 py-2.5 text-xs font-bold text-primary ring-1 ring-border"
        >
          <RefreshCw className="size-4" />
          {lang === "ar" ? "تحديث الحالة" : "Refresh status"}
        </button>
      </div>

      {actionStatus === "permission_denied" ? (
        <p className="mt-3 text-xs text-warning">
          {lang === "ar"
            ? "إذن الإشعارات محظور من المتصفح. اسمح بالإشعارات من إعدادات الموقع ثم أعد المحاولة."
            : "Notifications are blocked by the browser. Allow them in site settings and try again."}
        </p>
      ) : actionStatus === "not_configured" ? (
        <p className="mt-3 text-xs text-warning">
          {lang === "ar"
            ? "VAPID Public Key غير مهيأ في واجهة التطبيق."
            : "The VAPID public key is not configured in the app."}
        </p>
      ) : actionStatus === "unsupported" ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {lang === "ar"
            ? "هذا المتصفح أو الجهاز لا يدعم Web Push المستخدم هنا."
            : "This browser or device does not support the Web Push flow used here."}
        </p>
      ) : null}
    </section>
  );
}

function ReliabilityMetric({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-2xl bg-card p-3 text-center ring-1 ring-border">
      <p className="text-xl font-extrabold">{value}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function CompactMetric({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-xl bg-background/70 px-2 py-2 ring-1 ring-border">
      <p className="text-sm font-extrabold">{value}</p>
      <p className="mt-0.5 text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}
