import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowLeft,
  CircleHelp,
  Clock3,
  Gauge,
  HeartPulse,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import {
  measurementsDb,
  type MeasurementReadingRow,
} from "@/lib/measurements-db";
import {
  buildMeasurementTimeline,
  latestReadingsByType,
  summarizeMeasurementDashboard,
} from "@/lib/measurement-dashboard";
import { MeasurementQualityBadge } from "@/components/health/MeasurementQualityBadge";
import { cn } from "@/lib/utils";

export function MeasurementDashboardSection() {
  const { user, loading: authLoading } = useAuth();
  const { t, dir } = useI18n();

  const typesQuery = useQuery({
    queryKey: ["home-measurement-types"],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await measurementsDb
        .from("measurement_types")
        .select(
          "id,code,name_ar,name_en,description_ar,value_kind,canonical_unit,allowed_units,component_schema,capture_context_schema,review_status,is_active,is_demo,version",
        )
        .eq("review_status", "published")
        .eq("is_active", true)
        .eq("is_demo", false)
        .order("name_ar");
      if (error) throw error;
      return data;
    },
  });

  const readingsQuery = useQuery({
    queryKey: ["home-measurement-readings", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await measurementsDb
        .from("measurement_readings")
        .select(
          "id,user_id,measurement_type_id,measured_at,scalar_value,unit,components,context,quality,notes,created_at,updated_at",
        )
        .eq("user_id", user!.id)
        .order("measured_at", { ascending: false })
        .limit(80);
      if (error) throw error;
      return data;
    },
  });

  if (authLoading || !user) return null;
  if (typesQuery.isLoading || readingsQuery.isLoading) {
    return (
      <section className="glass rounded-3xl p-5 ring-1 ring-border">
        <div className="h-5 w-44 animate-pulse rounded bg-muted" />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </section>
    );
  }

  if (typesQuery.error || readingsQuery.error) return null;

  const types = typesQuery.data ?? [];
  const readings = readingsQuery.data ?? [];
  const latest = latestReadingsByType(types, readings);
  const timeline = buildMeasurementTimeline(types, readings, 6);
  const summary = summarizeMeasurementDashboard(latest, readings);
  const repeatItems = latest.filter(
    (item) => item.qualityAction === "repeat_capture",
  );
  const unknownItems = latest.filter(
    (item) => item.qualityAction === "quality_context_missing",
  );

  return (
    <section className="glass overflow-hidden rounded-3xl ring-1 ring-border">
      <div className="p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="size-5 text-primary" />
              <h2 className="text-lg font-extrabold">
                {t("measurements.dashboard.title")}
              </h2>
            </div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {t("measurements.dashboard.subtitle")}
            </p>
          </div>
          <Link
            to="/measurements"
            className="inline-flex items-center gap-2 rounded-xl bg-primary-soft px-3.5 py-2 text-xs font-bold text-primary"
          >
            {t("measurements.dashboard.open")}
            <ArrowLeft className={cn("size-4", dir === "ltr" && "rotate-180")} />
          </Link>
        </div>

        {!readings.length ? (
          <div className="mt-5 rounded-2xl bg-card/70 p-6 text-center ring-1 ring-border">
            <Gauge className="mx-auto size-8 text-primary" />
            <p className="mt-3 text-sm font-bold">
              {t("measurements.dashboard.empty")}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {t("measurements.dashboard.emptyHint")}
            </p>
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <DashboardStat
                icon={HeartPulse}
                label={t("measurements.dashboard.tracked")}
                value={String(summary.trackedTypes)}
              />
              <DashboardStat
                icon={Clock3}
                label={t("measurements.dashboard.last30")}
                value={String(summary.readingsLast30Days)}
              />
              <DashboardStat
                icon={ShieldCheck}
                label={t("measurements.dashboard.goodLatest")}
                value={String(summary.latestGood)}
              />
            </div>

            {repeatItems.length || unknownItems.length ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {repeatItems.length ? (
                  <div className="rounded-2xl bg-warning-soft/70 p-4 ring-1 ring-warning/15">
                    <div className="flex items-center gap-2 text-warning">
                      <RefreshCw className="size-4" />
                      <h3 className="text-sm font-extrabold">
                        {t("measurements.dashboard.repeatTitle")}
                      </h3>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {t("measurements.dashboard.repeatHint")}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {repeatItems.map((item) => (
                        <Link
                          key={item.type.id}
                          to="/measurements/$measurementTypeId"
                          params={{ measurementTypeId: item.type.id }}
                          className="rounded-full bg-card px-3 py-1.5 text-xs font-bold ring-1 ring-border"
                        >
                          {item.type.name_ar}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}

                {unknownItems.length ? (
                  <div className="rounded-2xl bg-muted/70 p-4 ring-1 ring-border">
                    <div className="flex items-center gap-2">
                      <CircleHelp className="size-4 text-muted-foreground" />
                      <h3 className="text-sm font-extrabold">
                        {t("measurements.dashboard.unknownTitle")}
                      </h3>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {t("measurements.dashboard.unknownHint")}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {unknownItems.map((item) => (
                        <span
                          key={item.type.id}
                          className="rounded-full bg-card px-3 py-1.5 text-xs font-semibold ring-1 ring-border"
                        >
                          {item.type.name_ar}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-5">
              <h3 className="text-sm font-extrabold">
                {t("measurements.dashboard.latestTitle")}
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {latest.slice(0, 6).map((item) => (
                  <Link
                    key={item.type.id}
                    to="/measurements/$measurementTypeId"
                    params={{ measurementTypeId: item.type.id }}
                    className="rounded-2xl bg-card/75 p-4 ring-1 ring-border transition hover:-translate-y-0.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-bold text-muted-foreground">
                        {item.type.name_ar}
                      </p>
                      <MeasurementQualityBadge quality={item.reading.quality} />
                    </div>
                    <p className="mt-2 text-lg font-extrabold">
                      {formatReading(item.reading, item.type.code)}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {new Date(item.reading.measured_at).toLocaleString("ar-SA")}
                    </p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-5 border-t border-border/70 pt-5">
              <h3 className="text-sm font-extrabold">
                {t("measurements.dashboard.timeline")}
              </h3>
              <div className="mt-3 space-y-2">
                {timeline.map((item) => (
                  <div
                    key={item.reading.id}
                    className="flex items-center justify-between gap-4 rounded-2xl bg-card/60 px-4 py-3 ring-1 ring-border"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">
                        {item.type.name_ar} —{" "}
                        {formatReading(item.reading, item.type.code)}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {new Date(item.reading.measured_at).toLocaleString("ar-SA")}
                      </p>
                    </div>
                    <MeasurementQualityBadge quality={item.reading.quality} />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function DashboardStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-card/75 p-4 ring-1 ring-border">
      <Icon className="size-4 text-primary" />
      <p className="mt-3 text-2xl font-extrabold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function formatReading(reading: MeasurementReadingRow, code: string): string {
  if (
    code === "blood_pressure" &&
    reading.components &&
    !Array.isArray(reading.components) &&
    typeof reading.components === "object"
  ) {
    const components = reading.components as Record<string, unknown>;
    const systolic = components["systolic"];
    const diastolic = components["diastolic"];
    if (typeof systolic === "number" && typeof diastolic === "number") {
      return `${round(systolic)}/${round(diastolic)} mmHg`;
    }
  }

  if (reading.scalar_value == null) return "—";
  return `${round(reading.scalar_value)} ${reading.unit ?? ""}`.trim();
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
