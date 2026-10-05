import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowLeft,
  BookHeart,
  Check,
  Clock3,
  Pill,
  SkipForward,
} from "lucide-react";
import { useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import {
  buildTodayMedicationOccurrences,
  medicationOccurrenceState,
} from "@/lib/medication-schedule";
import { cn } from "@/lib/utils";

export function DailyHealthDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { lang, dir } = useI18n();
  const now = useMemo(() => new Date(), []);

  const medicationsQuery = useQuery({
    queryKey: ["home-daily-medications", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_medications")
        .select("id,is_active")
        .eq("user_id", user!.id)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const schedulesQuery = useQuery({
    queryKey: ["home-daily-medication-schedules", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medication_schedules")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
  });

  const eventsQuery = useQuery({
    queryKey: ["home-daily-dose-events", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const { data, error } = await supabase
        .from("medication_dose_events")
        .select("schedule_id,scheduled_for,status")
        .eq("user_id", user!.id)
        .gte("scheduled_for", start.toISOString())
        .lt("scheduled_for", end.toISOString());
      if (error) throw error;
      return data;
    },
  });

  const measurementsQuery = useQuery({
    queryKey: ["home-daily-measurements", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from("measurement_readings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .gte("measured_at", start.toISOString());
      if (error) throw error;
      return count ?? 0;
    },
  });

  const journalQuery = useQuery({
    queryKey: ["home-daily-journal", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from("health_journal_entries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .gte("occurred_at", start.toISOString());
      if (error) throw error;
      return count ?? 0;
    },
  });

  if (authLoading || !user) return null;

  if (
    medicationsQuery.isLoading ||
    schedulesQuery.isLoading ||
    eventsQuery.isLoading ||
    measurementsQuery.isLoading ||
    journalQuery.isLoading
  ) {
    return (
      <section className="glass rounded-3xl p-5 ring-1 ring-border">
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </section>
    );
  }

  if (
    medicationsQuery.error ||
    schedulesQuery.error ||
    eventsQuery.error ||
    measurementsQuery.error ||
    journalQuery.error
  ) {
    return null;
  }

  const activeMedicationIds = new Set(
    (medicationsQuery.data ?? []).map((item) => item.id),
  );
  const occurrences = buildTodayMedicationOccurrences(
    (schedulesQuery.data ?? []).filter((schedule) =>
      activeMedicationIds.has(schedule.medication_id),
    ),
    now,
  );

  const states = occurrences.map((occurrence) =>
    medicationOccurrenceState(occurrence, eventsQuery.data ?? [], now),
  );
  const taken = states.filter((state) => state === "taken").length;
  const skipped = states.filter((state) => state === "skipped").length;
  const unrecorded = states.filter((state) => state === "unrecorded").length;
  const upcoming = states.filter((state) => state === "upcoming").length;

  return (
    <section className="glass overflow-hidden rounded-3xl ring-1 ring-border">
      <div className="p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Clock3 className="size-5 text-primary" />
              <h2 className="text-lg font-extrabold">
                {lang === "ar" ? "متابعة اليوم" : "Today"}
              </h2>
            </div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {lang === "ar"
                ? "ملخص تشغيلي من بياناتك المسجلة اليوم، بدون استنتاج طبي."
                : "An operational summary of today's recorded data, without clinical inference."}
            </p>
          </div>

          <Link
            to="/journal"
            className="inline-flex items-center gap-2 rounded-xl bg-primary-soft px-3.5 py-2 text-xs font-bold text-primary"
          >
            {lang === "ar" ? "فتح السجل الصحي" : "Open health journal"}
            <ArrowLeft
              className={cn("size-4", dir === "ltr" && "rotate-180")}
            />
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DailyMetric
            icon={Pill}
            value={occurrences.length}
            label={lang === "ar" ? "مواعيد دواء اليوم" : "Medication times"}
          />
          <DailyMetric
            icon={Check}
            value={taken}
            label={lang === "ar" ? "تم تسجيل أخذها" : "Recorded taken"}
          />
          <DailyMetric
            icon={Activity}
            value={measurementsQuery.data ?? 0}
            label={lang === "ar" ? "قياسات اليوم" : "Measurements today"}
          />
          <DailyMetric
            icon={BookHeart}
            value={journalQuery.data ?? 0}
            label={lang === "ar" ? "يوميات اليوم" : "Journal entries today"}
          />
        </div>

        {occurrences.length ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <StatusChip
              icon={Clock3}
              value={upcoming}
              label={lang === "ar" ? "قادمة" : "Upcoming"}
            />
            <StatusChip
              icon={Clock3}
              value={unrecorded}
              label={lang === "ar" ? "غير مسجلة" : "Unrecorded"}
            />
            <StatusChip
              icon={SkipForward}
              value={skipped}
              label={lang === "ar" ? "تم تخطيها" : "Skipped"}
            />
          </div>
        ) : (
          <p className="mt-4 rounded-2xl bg-card/70 p-4 text-xs leading-6 text-muted-foreground ring-1 ring-border">
            {lang === "ar"
              ? "لا توجد مواعيد أدوية مجدولة لهذا اليوم. يمكنك إضافتها من السجل الصحي."
              : "No medication times are scheduled today. You can add them in the health journal."}
          </p>
        )}
      </div>
    </section>
  );
}

function DailyMetric({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Pill;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-2xl bg-card/75 p-4 ring-1 ring-border">
      <Icon className="size-4 text-primary" />
      <p className="mt-3 text-2xl font-extrabold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function StatusChip({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Clock3;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-card/60 px-3 py-2 ring-1 ring-border">
      <span className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </span>
      <strong className="text-sm">{value}</strong>
    </div>
  );
}
