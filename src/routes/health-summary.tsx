import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  ClipboardList,
  NotebookPen,
  Pill,
  Printer,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/use-auth";
import { ErrorState, LoadingState, PageHeader } from "@/components/health/cards";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/health-summary")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "الملخص الصحي — مؤشر صحي" },
      {
        name: "description",
        content: "ملخص قابل للطباعة من البيانات الصحية التي سجلها المستخدم.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HealthSummaryPage,
});

type JournalRow = Tables<"health_journal_entries">;
type MedicationRow = Tables<"user_medications">;
type DoseEventRow = Tables<"medication_dose_events">;
type MeasurementReadingRow = Tables<"measurement_readings">;
type MeasurementTypeRow = Tables<"measurement_types">;

function HealthSummaryPage() {
  const { user, loading } = useAuth();
  const { lang, dir } = useI18n();

  const profileQuery = useQuery({
    queryKey: ["health-summary-profile", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const journalQuery = useQuery({
    queryKey: ["health-summary-journal", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("health_journal_entries")
        .select("*")
        .eq("user_id", user!.id)
        .order("occurred_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const medicationsQuery = useQuery({
    queryKey: ["health-summary-medications", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_medications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const doseEventsQuery = useQuery({
    queryKey: ["health-summary-dose-events", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medication_dose_events")
        .select("*")
        .eq("user_id", user!.id)
        .order("event_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  const measurementsQuery = useQuery({
    queryKey: ["health-summary-measurements", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("measurement_readings")
        .select("*")
        .eq("user_id", user!.id)
        .order("measured_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const measurementTypesQuery = useQuery({
    queryKey: ["health-summary-measurement-types"],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("measurement_types")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const sessionsQuery = useQuery({
    queryKey: ["health-summary-sessions", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("symptom_sessions")
        .select("id, created_at, completed_at, status, care_level")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  if (loading) return <LoadingState />;

  if (!user) {
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader title={lang === "ar" ? "الملخص الصحي" : "Health summary"} />
        <div className="glass rounded-3xl p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {lang === "ar"
              ? "سجّل الدخول لعرض ملخص بياناتك الصحية."
              : "Sign in to view your health summary."}
          </p>
          <Link
            to="/auth"
            search={{ redirect: "/health-summary" }}
            className="mt-5 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
          >
            {lang === "ar" ? "تسجيل الدخول" : "Sign in"}
          </Link>
        </div>
      </div>
    );
  }

  const queries = [
    profileQuery,
    journalQuery,
    medicationsQuery,
    doseEventsQuery,
    measurementsQuery,
    measurementTypesQuery,
    sessionsQuery,
  ];

  if (queries.some((query) => query.isLoading)) return <LoadingState />;
  if (queries.some((query) => query.error)) return <ErrorState />;

  const journal = journalQuery.data ?? [];
  const medications = medicationsQuery.data ?? [];
  const doseEvents = doseEventsQuery.data ?? [];
  const measurements = measurementsQuery.data ?? [];
  const measurementTypes = measurementTypesQuery.data ?? [];
  const sessions = sessionsQuery.data ?? [];

  const medicationById = new Map(
    medications.map((item) => [item.id, item] as const),
  );
  const measurementTypeById = new Map(
    measurementTypes.map((item) => [item.id, item] as const),
  );

  const activeMedications = medications.filter((item) => item.is_active);
  const last30Cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const last30Count =
    journal.filter((item) => new Date(item.occurred_at).getTime() >= last30Cutoff)
      .length +
    doseEvents.filter((item) => new Date(item.event_at).getTime() >= last30Cutoff)
      .length +
    measurements.filter(
      (item) => new Date(item.measured_at).getTime() >= last30Cutoff,
    ).length +
    sessions.filter(
      (item) =>
        new Date(item.completed_at ?? item.created_at).getTime() >= last30Cutoff,
    ).length;

  const displayName =
    profileQuery.data?.display_name?.trim() ||
    user.email ||
    (lang === "ar" ? "المستخدم" : "User");

  return (
    <div className="mx-auto max-w-4xl">
      <div className="print:hidden">
        <PageHeader
          title={lang === "ar" ? "الملخص الصحي" : "Health summary"}
          subtitle={
            lang === "ar"
              ? "ملخص من البيانات التي سجلتها أنت في التطبيق؛ لا يتضمن تشخيصًا أو توصية علاجية."
              : "A summary of data you recorded in the app; it does not include a diagnosis or treatment recommendation."
          }
        >
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/journal"
              className="inline-flex items-center gap-2 rounded-xl bg-card px-4 py-2.5 text-sm font-bold text-primary ring-1 ring-border"
            >
              <ArrowRight
                className={`size-4 ${dir === "ltr" ? "rotate-180" : ""}`}
              />
              {lang === "ar" ? "العودة للسجل" : "Back to journal"}
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
            >
              <Printer className="size-4" />
              {lang === "ar" ? "طباعة / حفظ PDF" : "Print / Save PDF"}
            </button>
          </div>
        </PageHeader>
      </div>

      <article className="space-y-5 bg-background print:bg-white print:text-black">
        <header className="glass rounded-3xl p-6 print:rounded-none print:border-b print:bg-white print:shadow-none">
          <p className="text-xs font-bold text-primary print:text-black">
            {lang === "ar" ? "مؤشر صحي — ملخص شخصي" : "Health Indicator — Personal summary"}
          </p>
          <h1 className="mt-2 text-2xl font-extrabold">{displayName}</h1>
          <p className="mt-1 text-sm text-muted-foreground print:text-black">
            {user.email ?? ""}
          </p>
          <p className="mt-3 text-xs text-muted-foreground print:text-black">
            {lang === "ar" ? "تاريخ إنشاء الملخص:" : "Generated:"}{" "}
            {new Date().toLocaleString(lang === "ar" ? "ar-SA" : "en")}
          </p>
          <div className="mt-4 rounded-2xl bg-primary-soft/60 p-4 text-xs leading-6 text-muted-foreground print:bg-white print:text-black print:ring-1 print:ring-black/20">
            {lang === "ar"
              ? "هذا المستند يلخص السجلات المدخلة في التطبيق فقط. لا يؤكد تشخيصًا ولا يوصي بتغيير دواء أو جرعة أو علاج."
              : "This document summarizes records entered in the app only. It does not confirm a diagnosis or recommend changing medication, dosage, or treatment."}
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-4 print:grid-cols-4">
          <SummaryMetric
            value={last30Count}
            label={lang === "ar" ? "نشاطات آخر 30 يوم" : "Activities in 30 days"}
          />
          <SummaryMetric
            value={activeMedications.length}
            label={lang === "ar" ? "أدوية نشطة مسجلة" : "Active medications"}
          />
          <SummaryMetric
            value={measurements.length}
            label={lang === "ar" ? "قياسات حديثة" : "Recent measurements"}
          />
          <SummaryMetric
            value={sessions.length}
            label={lang === "ar" ? "فحوصات أعراض حديثة" : "Recent symptom checks"}
          />
        </section>

        <SummarySection
          icon={Pill}
          title={lang === "ar" ? "الأدوية المسجلة" : "Recorded medications"}
        >
          {!activeMedications.length ? (
            <EmptySummary lang={lang} />
          ) : (
            <div className="divide-y divide-border">
              {activeMedications.map((medication) => (
                <div key={medication.id} className="py-3 first:pt-0 last:pb-0">
                  <p className="font-bold">{medication.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground print:text-black">
                    {[medication.dose_text, medication.schedule_text]
                      .filter(Boolean)
                      .join(" • ") ||
                      (lang === "ar" ? "بدون تفاصيل إضافية" : "No additional details")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SummarySection>

        <SummarySection
          icon={Activity}
          title={lang === "ar" ? "آخر القياسات" : "Recent measurements"}
        >
          {!measurements.length ? (
            <EmptySummary lang={lang} />
          ) : (
            <div className="divide-y divide-border">
              {measurements.slice(0, 10).map((reading) => {
                const type = measurementTypeById.get(reading.measurement_type_id);
                const typeName =
                  (lang === "ar" ? type?.name_ar : type?.name_en) ||
                  type?.name_ar ||
                  (lang === "ar" ? "قياس صحي" : "Health measurement");

                return (
                  <SummaryRow
                    key={reading.id}
                    title={typeName}
                    detail={formatReading(reading)}
                    date={reading.measured_at}
                    lang={lang}
                  />
                );
              })}
            </div>
          )}
        </SummarySection>

        <SummarySection
          icon={NotebookPen}
          title={lang === "ar" ? "آخر اليوميات" : "Recent journal entries"}
        >
          {!journal.length ? (
            <EmptySummary lang={lang} />
          ) : (
            <div className="divide-y divide-border">
              {journal.slice(0, 10).map((entry) => (
                <SummaryRow
                  key={entry.id}
                  title={
                    entry.title ||
                    (lang === "ar" ? "يومية صحية" : "Health journal entry")
                  }
                  detail={entry.note}
                  date={entry.occurred_at}
                  lang={lang}
                />
              ))}
            </div>
          )}
        </SummarySection>

        <SummarySection
          icon={ClipboardList}
          title={lang === "ar" ? "آخر فحوصات الأعراض" : "Recent symptom checks"}
        >
          {!sessions.length ? (
            <EmptySummary lang={lang} />
          ) : (
            <div className="divide-y divide-border">
              {sessions.slice(0, 10).map((session) => (
                <SummaryRow
                  key={session.id}
                  title={lang === "ar" ? "فحص أعراض" : "Symptom check"}
                  detail={
                    session.care_level ||
                    (lang === "ar" ? "فحص محفوظ" : "Saved check")
                  }
                  date={session.completed_at ?? session.created_at}
                  lang={lang}
                />
              ))}
            </div>
          )}
        </SummarySection>

        <SummarySection
          icon={Pill}
          title={lang === "ar" ? "آخر أحداث الأدوية" : "Recent medication events"}
        >
          {!doseEvents.length ? (
            <EmptySummary lang={lang} />
          ) : (
            <div className="divide-y divide-border">
              {doseEvents.slice(0, 15).map((event) => (
                <SummaryRow
                  key={event.id}
                  title={
                    medicationById.get(event.medication_id)?.name ??
                    (lang === "ar" ? "دواء" : "Medication")
                  }
                  detail={
                    event.status === "taken"
                      ? lang === "ar"
                        ? "تم أخذ الجرعة"
                        : "Dose taken"
                      : lang === "ar"
                        ? "تم تخطي الجرعة"
                        : "Dose skipped"
                  }
                  date={event.event_at}
                  lang={lang}
                />
              ))}
            </div>
          )}
        </SummarySection>
      </article>
    </div>
  );
}

function SummaryMetric({ value, label }: { value: number; label: string }) {
  return (
    <div className="glass rounded-2xl p-4 text-center print:bg-white print:shadow-none print:ring-1 print:ring-black/20">
      <strong className="text-2xl font-extrabold">{value}</strong>
      <p className="mt-1 text-[11px] text-muted-foreground print:text-black">
        {label}
      </p>
    </div>
  );
}

function SummarySection({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Pill;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass rounded-3xl p-5 print:break-inside-avoid print:bg-white print:shadow-none print:ring-1 print:ring-black/20">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="size-5 text-primary print:text-black" />
        <h2 className="font-extrabold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function SummaryRow({
  title,
  detail,
  date,
  lang,
}: {
  title: string;
  detail: string;
  date: string;
  lang: "ar" | "en";
}) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-bold">{title}</p>
        <time className="text-[10px] text-muted-foreground print:text-black">
          {new Date(date).toLocaleString(lang === "ar" ? "ar-SA" : "en")}
        </time>
      </div>
      <p className="mt-1 whitespace-pre-wrap text-xs leading-6 text-muted-foreground print:text-black">
        {detail}
      </p>
    </div>
  );
}

function EmptySummary({ lang }: { lang: "ar" | "en" }) {
  return (
    <p className="text-sm text-muted-foreground print:text-black">
      {lang === "ar" ? "لا توجد بيانات مسجلة." : "No recorded data."}
    </p>
  );
}

function formatReading(reading: MeasurementReadingRow): string {
  if (reading.scalar_value != null) {
    return [String(reading.scalar_value), reading.unit].filter(Boolean).join(" ");
  }

  if (
    reading.components &&
    typeof reading.components === "object" &&
    !Array.isArray(reading.components)
  ) {
    return Object.values(reading.components)
      .filter((value) => value != null)
      .join(" / ");
  }

  return "";
}
