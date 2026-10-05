import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BookHeart,
  CalendarCheck,
  ClipboardList,
  Pill,
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

export function DailyHealthDashboardSection() {
  const { user, loading } = useAuth();
  const { lang } = useI18n();
  const now = useMemo(() => new Date(), []);
  const startOfToday = useMemo(() => {
    const value = new Date(now);
    value.setHours(0, 0, 0, 0);
    return value.toISOString();
  }, [now]);

  const medicationsQuery = useQuery({
    queryKey: ["daily-dashboard-medications", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_medications")
        .select("id,name,dose_text,is_active")
        .eq("user_id", user!.id)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const schedulesQuery = useQuery({
    queryKey: ["daily-dashboard-schedules", user?.id],
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
    queryKey: ["daily-dashboard-dose-events", user?.id, startOfToday],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medication_dose_events")
        .select("schedule_id,scheduled_for,status")
        .eq("user_id", user!.id)
        .gte("scheduled_for", startOfToday);
      if (error) throw error;
      return data;
    },
  });

  const journalQuery = useQuery({
    queryKey: ["daily-dashboard-journal", user?.id, startOfToday],
    enabled: Boolean(user),
    queryFn: async () => {
      const { count, error } = await supabase
        .from("health_journal_entries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .gte("occurred_at", startOfToday);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const sessionsQuery = useQuery({
    queryKey: ["daily-dashboard-sessions", user?.id, startOfToday],
    enabled: Boolean(user),
    queryFn: async () => {
      const { count, error } = await supabase
        .from("symptom_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .gte("created_at", startOfToday);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const latestMeasurementQuery = useQuery({
    queryKey: ["daily-dashboard-latest-measurement", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("measurement_readings")
        .select("id,measurement_type_id,measured_at,scalar_value,components,unit")
        .eq("user_id", user!.id)
        .order("measured_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const measurementTypeQuery = useQuery({
    queryKey: [
      "daily-dashboard-measurement-type",
      latestMeasurementQuery.data?.measurement_type_id,
    ],
    enabled: Boolean(latestMeasurementQuery.data?.measurement_type_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("measurement_types")
        .select("id,name_ar,name_en")
        .eq("id", latestMeasurementQuery.data!.measurement_type_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const activeMedicationIds = useMemo(
    () => new Set((medicationsQuery.data ?? []).map((item) => item.id)),
    [medicationsQuery.data],
  );

  const todayOccurrences = useMemo(
    () =>
      buildTodayMedicationOccurrences(
        (schedulesQuery.data ?? []).filter((schedule) =>
          activeMedicationIds.has(schedule.medication_id),
        ),
        now,
      ),
    [activeMedicationIds, now, schedulesQuery.data],
  );

  const doseCounts = useMemo(() => {
    const states = todayOccurrences.map((occurrence) =>
      medicationOccurrenceState(occurrence, eventsQuery.data ?? [], now),
    );

    return {
      total: states.length,
      taken: states.filter((state) => state === "taken").length,
      skipped: states.filter((state) => state === "skipped").length,
      unrecorded: states.filter((state) => state === "unrecorded").length,
      upcoming: states.filter((state) => state === "upcoming").length,
    };
  }, [eventsQuery.data, now, todayOccurrences]);

  if (loading || !user) return null;

  const loadingData =
    medicationsQuery.isLoading ||
    schedulesQuery.isLoading ||
    eventsQuery.isLoading ||
    journalQuery.isLoading ||
    sessionsQuery.isLoading ||
    latestMeasurementQuery.isLoading;

  const hasError =
    medicationsQuery.error ||
    schedulesQuery.error ||
    eventsQuery.error ||
    journalQuery.error ||
    sessionsQuery.error ||
    latestMeasurementQuery.error;

  const latestMeasurement = latestMeasurementQuery.data;
  const measurementType = measurementTypeQuery.data;
  const latestMeasurementLabel =
    (lang === "ar" ? measurementType?.name_ar : measurementType?.name_en) ||
    measurementType?.name_ar ||
    (lang === "ar" ? "قياس صحي" : "Health measurement");

  return (
    <section className="glass overflow-hidden rounded-3xl ring-1 ring-border">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-5 md:p-6">
        <div>
          <div className="flex items-center gap-2">
            <CalendarCheck className="size-5 text-primary" />
            <h2 className="text-lg font-extrabold">
              {lang === "ar" ? "يومك الصحي" : "Your health today"}
            </h2>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {lang === "ar"
              ? "ملخص تشغيلي من سجلاتك أنت فقط، بدون تفسير أو استنتاج طبي."
              : "An operational summary of your own records only, without clinical interpretation."}
          </p>
        </div>
        <Link
          to="/journal"
          className="rounded-xl bg-primary-soft px-4 py-2 text-xs font-bold text-primary"
        >
          {lang === "ar" ? "فتح السجل الصحي" : "Open health journal"}
        </Link>
      </div>

      {loadingData ? (
        <div className="p-6 text-sm text-muted-foreground">
          {lang === "ar" ? "جارٍ تحميل ملخص اليوم..." : "Loading today's summary..."}
        </div>
      ) : hasError ? (
        <div className="p-6 text-sm text-muted-foreground">
          {lang === "ar"
            ? "تعذر تحميل بعض بيانات اليوم."
            : "Some daily data could not be loaded."}
        </div>
      ) : (
        <div className="grid gap-3 p-4 md:grid-cols-2 md:p-5 lg:grid-cols-4">
          <DashboardCard
            icon={Pill}
            title={lang === "ar" ? "مواعيد الدواء" : "Medication times"}
            value={String(doseCounts.total)}
            detail={
              lang === "ar"
                ? `${doseCounts.taken} تم أخذها • ${doseCounts.skipped} تم تخطيها • ${doseCounts.unrecorded} غير مسجل • ${doseCounts.upcoming} قادم`
                : `${doseCounts.taken} taken • ${doseCounts.skipped} skipped • ${doseCounts.unrecorded} unrecorded • ${doseCounts.upcoming} upcoming`
            }
            to="/journal"
          />

          <DashboardCard
            icon={BookHeart}
            title={lang === "ar" ? "يوميات اليوم" : "Today's journal"}
            value={String(journalQuery.data ?? 0)}
            detail={
              lang === "ar"
                ? "ملاحظات سجلتها اليوم"
                : "Notes you recorded today"
            }
            to="/journal"
          />

          <DashboardCard
            icon={ClipboardList}
            title={lang === "ar" ? "فحوصات الأعراض" : "Symptom checks"}
            value={String(sessionsQuery.data ?? 0)}
            detail={
              lang === "ar"
                ? "فحوصات بدأت اليوم"
                : "Checks started today"
            }
            to="/history"
          />

          <DashboardCard
            icon={Activity}
            title={lang === "ar" ? "آخر قياس" : "Latest measurement"}
            value={
              latestMeasurement
                ? formatDashboardMeasurement(latestMeasurement)
                : "—"
            }
            detail={
              latestMeasurement
                ? `${latestMeasurementLabel} • ${new Date(
                    latestMeasurement.measured_at,
                  ).toLocaleString(lang === "ar" ? "ar-SA" : "en")}`
                : lang === "ar"
                  ? "لا يوجد قياس محفوظ"
                  : "No saved measurement"
            }
            to="/measurements"
          />
        </div>
      )}
    </section>
  );
}

function DashboardCard({
  icon: Icon,
  title,
  value,
  detail,
  to,
}: {
  icon: typeof Activity;
  title: string;
  value: string;
  detail: string;
  to: "/journal" | "/history" | "/measurements";
}) {
  return (
    <Link
      to={to}
      className="rounded-2xl bg-card p-4 ring-1 ring-border transition hover:-translate-y-0.5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary">
          <Icon className="size-4" />
        </span>
        <span className="text-2xl font-extrabold">{value}</span>
      </div>
      <h3 className="mt-3 text-sm font-extrabold">{title}</h3>
      <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
        {detail}
      </p>
    </Link>
  );
}

function formatDashboardMeasurement(reading: {
  scalar_value: number | null;
  components: unknown;
  unit: string | null;
}): string {
  if (reading.scalar_value != null) {
    return [String(reading.scalar_value), reading.unit].filter(Boolean).join(" ");
  }

  if (
    reading.components &&
    typeof reading.components === "object" &&
    !Array.isArray(reading.components)
  ) {
    return Object.values(reading.components as Record<string, unknown>)
      .filter((value) => value != null)
      .join(" / ");
  }

  return "—";
}
