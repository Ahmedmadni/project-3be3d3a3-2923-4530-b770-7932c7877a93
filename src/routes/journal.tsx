import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bell,
  BookHeart,
  CalendarClock,
  Check,
  ClipboardList,
  Clock3,
  FileText,
  History,
  NotebookPen,
  Pill,
  Plus,
  Search,
  SkipForward,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, LoadingState, ErrorState } from "@/components/health/cards";
import { useI18n } from "@/i18n";
import {
  filterHealthTimeline,
  medicationEventSummary,
  sortHealthTimeline,
  type HealthTimelineFilter,
  type HealthTimelineItem,
  type HealthTimelineKind,
  type HealthTimelineRangeDays,
} from "@/lib/health-timeline";
import {
  browserTimezone,
  buildTodayMedicationOccurrences,
  isReminderDue,
  medicationOccurrenceState,
  type MedicationDayCode,
  type MedicationOccurrence,
} from "@/lib/medication-schedule";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/journal")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "السجل الصحي — مؤشر صحي" },
      {
        name: "description",
        content: "يوميات صحية، أدوية مسجلة بواسطة المستخدم، وخط زمني موحد.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HealthJournalPage,
});

type JournalRow = Tables<"health_journal_entries">;
type MedicationRow = Tables<"user_medications">;
type DoseEventRow = Tables<"medication_dose_events">;
type MedicationScheduleRow = Tables<"medication_schedules">;
type MeasurementReadingRow = Tables<"measurement_readings">;
type MeasurementTypeRow = Tables<"measurement_types">;

type Tab = "timeline" | "journal" | "medications";

const entryTypeLabel = {
  general: { ar: "ملاحظة عامة", en: "General note" },
  symptom_note: { ar: "ملاحظة أعراض", en: "Symptom note" },
  mood: { ar: "مزاج وحالة عامة", en: "Mood & wellbeing" },
  care_note: { ar: "ملاحظة رعاية", en: "Care note" },
} as const;

function HealthJournalPage() {
  const { user, loading } = useAuth();
  const { lang } = useI18n();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("timeline");
  const [journalType, setJournalType] =
    useState<JournalRow["entry_type"]>("general");
  const [journalTitle, setJournalTitle] = useState("");
  const [journalNote, setJournalNote] = useState("");
  const [moodScore, setMoodScore] = useState("");
  const [energyScore, setEnergyScore] = useState("");
  const [relatedMeasurementId, setRelatedMeasurementId] = useState("");
  const [relatedSessionId, setRelatedSessionId] = useState("");
  const [timelineKind, setTimelineKind] =
    useState<HealthTimelineFilter["kind"]>("all");
  const [timelineRange, setTimelineRange] =
    useState<HealthTimelineRangeDays>(30);
  const [timelineQuery, setTimelineQuery] = useState("");
  const [medicationName, setMedicationName] = useState("");
  const [doseText, setDoseText] = useState("");
  const [scheduleText, setScheduleText] = useState("");
  const [clockNow, setClockNow] = useState(() => new Date());
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >("unsupported");

  const journalQuery = useQuery({
    queryKey: ["health-journal", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("health_journal_entries")
        .select("*")
        .eq("user_id", user!.id)
        .order("occurred_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const medicationsQuery = useQuery({
    queryKey: ["user-medications", user?.id],
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

  const eventsQuery = useQuery({
    queryKey: ["medication-dose-events", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medication_dose_events")
        .select("*")
        .eq("user_id", user!.id)
        .order("event_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const schedulesQuery = useQuery({
    queryKey: ["medication-schedules", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medication_schedules")
        .select("*")
        .eq("user_id", user!.id)
        .order("time_local", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const measurementsQuery = useQuery({
    queryKey: ["journal-measurements", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("measurement_readings")
        .select("*")
        .eq("user_id", user!.id)
        .order("measured_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const measurementTypesQuery = useQuery({
    queryKey: ["journal-measurement-types"],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("measurement_types")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const symptomSessionsQuery = useQuery({
    queryKey: ["journal-symptom-sessions", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("symptom_sessions")
        .select("id, created_at, completed_at, status, care_level")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const invalidatePersonalHealth = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["health-journal", user?.id] }),
      qc.invalidateQueries({ queryKey: ["user-medications", user?.id] }),
      qc.invalidateQueries({ queryKey: ["medication-dose-events", user?.id] }),
      qc.invalidateQueries({ queryKey: ["medication-schedules", user?.id] }),
    ]);
  };

  const addJournal = useMutation({
    mutationFn: async () => {
      const note = journalNote.trim();
      if (!user || !note) return;

      const { error } = await supabase.from("health_journal_entries").insert({
        user_id: user.id,
        entry_type: journalType,
        title: journalTitle.trim() || null,
        note,
        mood_score: moodScore ? Number(moodScore) : null,
        energy_score: energyScore ? Number(energyScore) : null,
        related_measurement_reading_id: relatedMeasurementId || null,
        related_symptom_session_id: relatedSessionId || null,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setJournalTitle("");
      setJournalNote("");
      setMoodScore("");
      setEnergyScore("");
      setRelatedMeasurementId("");
      setRelatedSessionId("");
      await invalidatePersonalHealth();
    },
  });

  const addMedication = useMutation({
    mutationFn: async () => {
      const name = medicationName.trim();
      if (!user || !name) return;

      const { error } = await supabase.from("user_medications").insert({
        user_id: user.id,
        name,
        dose_text: doseText.trim() || null,
        schedule_text: scheduleText.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setMedicationName("");
      setDoseText("");
      setScheduleText("");
      await invalidatePersonalHealth();
    },
  });

  const addDoseEvent = useMutation({
    mutationFn: async ({
      medicationId,
      status,
    }: {
      medicationId: string;
      status: DoseEventRow["status"];
    }) => {
      if (!user) return;
      const { error } = await supabase.from("medication_dose_events").insert({
        user_id: user.id,
        medication_id: medicationId,
        status,
      });
      if (error) throw error;
    },
    onSuccess: invalidatePersonalHealth,
  });

  const createMedicationSchedule = useMutation({
    mutationFn: async ({
      medicationId,
      timeLocal,
      daysOfWeek,
      reminderEnabled,
    }: {
      medicationId: string;
      timeLocal: string;
      daysOfWeek: MedicationDayCode[];
      reminderEnabled: boolean;
    }) => {
      if (!user) return;
      const { error } = await supabase.from("medication_schedules").insert({
        user_id: user.id,
        medication_id: medicationId,
        time_local: timeLocal,
        days_of_week: daysOfWeek,
        reminder_enabled: reminderEnabled,
        timezone: browserTimezone(),
      });
      if (error) throw error;
    },
    onSuccess: invalidatePersonalHealth,
  });

  const deleteMedicationSchedule = useMutation({
    mutationFn: async (scheduleId: string) => {
      const { error } = await supabase
        .from("medication_schedules")
        .delete()
        .eq("id", scheduleId);
      if (error) throw error;
    },
    onSuccess: invalidatePersonalHealth,
  });

  const recordScheduledDose = useMutation({
    mutationFn: async ({
      occurrence,
      status,
    }: {
      occurrence: MedicationOccurrence;
      status: DoseEventRow["status"];
    }) => {
      if (!user) return;

      const { data: existing, error: readError } = await supabase
        .from("medication_dose_events")
        .select("id")
        .eq("user_id", user.id)
        .eq("schedule_id", occurrence.scheduleId)
        .eq("scheduled_for", occurrence.scheduledFor)
        .maybeSingle();

      if (readError) throw readError;

      if (existing) {
        const { error } = await supabase
          .from("medication_dose_events")
          .update({
            status,
            event_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from("medication_dose_events").insert({
        user_id: user.id,
        medication_id: occurrence.medicationId,
        schedule_id: occurrence.scheduleId,
        scheduled_for: occurrence.scheduledFor,
        event_at: new Date().toISOString(),
        status,
      });
      if (error) throw error;
    },
    onSuccess: invalidatePersonalHealth,
  });

  const toggleMedication = useMutation({
    mutationFn: async ({
      medicationId,
      isActive,
    }: {
      medicationId: string;
      isActive: boolean;
    }) => {
      const { error } = await supabase
        .from("user_medications")
        .update({ is_active: isActive })
        .eq("id", medicationId);
      if (error) throw error;
    },
    onSuccess: invalidatePersonalHealth,
  });

  const medicationsById = useMemo(
    () =>
      new Map(
        (medicationsQuery.data ?? []).map((item) => [item.id, item] as const),
      ),
    [medicationsQuery.data],
  );

  const measurementTypesById = useMemo(
    () =>
      new Map(
        (measurementTypesQuery.data ?? []).map((item) => [item.id, item] as const),
      ),
    [measurementTypesQuery.data],
  );


  const measurementLinkOptions = useMemo(
    () =>
      (measurementsQuery.data ?? []).map((reading) => {
        const type = measurementTypesById.get(reading.measurement_type_id);
        const typeName =
          (lang === "ar" ? type?.name_ar : type?.name_en) ||
          type?.name_ar ||
          (lang === "ar" ? "قياس صحي" : "Health measurement");

        return {
          id: reading.id,
          label: `${typeName}: ${formatReading(reading)} — ${new Date(
            reading.measured_at,
          ).toLocaleString(lang === "ar" ? "ar-SA" : "en")}`,
        };
      }),
    [lang, measurementTypesById, measurementsQuery.data],
  );

  const symptomSessionLinkOptions = useMemo(
    () =>
      (symptomSessionsQuery.data ?? []).map((session) => ({
        id: session.id,
        label: `${lang === "ar" ? "فحص أعراض" : "Symptom check"} — ${new Date(
          session.completed_at ?? session.created_at,
        ).toLocaleString(lang === "ar" ? "ar-SA" : "en")}`,
      })),
    [lang, symptomSessionsQuery.data],
  );

  const timeline = useMemo(() => {
    const items: HealthTimelineItem[] = [];

    for (const item of journalQuery.data ?? []) {
      const typeLabel = entryTypeLabel[item.entry_type][lang];
      items.push({
        id: `journal-${item.id}`,
        kind: "journal",
        occurredAt: item.occurred_at,
        title: item.title?.trim() || typeLabel,
        subtitle: item.note,
      });
    }

    for (const event of eventsQuery.data ?? []) {
      const medication = medicationsById.get(event.medication_id);
      const action =
        event.status === "taken"
          ? lang === "ar"
            ? "تم أخذ الجرعة"
            : "Dose taken"
          : lang === "ar"
            ? "تم تخطي الجرعة"
            : "Dose skipped";

      items.push({
        id: `medication-${event.id}`,
        kind: "medication",
        occurredAt: event.event_at,
        title: medication?.name ?? (lang === "ar" ? "دواء" : "Medication"),
        subtitle: action,
      });
    }

    for (const reading of measurementsQuery.data ?? []) {
      const type = measurementTypesById.get(reading.measurement_type_id);
      items.push({
        id: `measurement-${reading.id}`,
        kind: "measurement",
        occurredAt: reading.measured_at,
        title:
          (lang === "ar" ? type?.name_ar : type?.name_en) ||
          type?.name_ar ||
          (lang === "ar" ? "قياس صحي" : "Health measurement"),
        subtitle: formatReading(reading),
      });
    }

    for (const session of symptomSessionsQuery.data ?? []) {
      items.push({
        id: `symptom-${session.id}`,
        kind: "symptom_check",
        occurredAt: session.completed_at ?? session.created_at,
        title: lang === "ar" ? "فحص أعراض" : "Symptom check",
        subtitle:
          session.care_level ??
          (lang === "ar" ? "تم حفظ الفحص" : "Saved check"),
      });
    }

    return sortHealthTimeline(items).slice(0, 100);
  }, [
    eventsQuery.data,
    journalQuery.data,
    lang,
    measurementTypesById,
    measurementsQuery.data,
    medicationsById,
    symptomSessionsQuery.data,
  ]);

  const filteredTimeline = useMemo(
    () =>
      filterHealthTimeline(timeline, {
        kind: timelineKind,
        query: timelineQuery,
        rangeDays: timelineRange,
      }),
    [timeline, timelineKind, timelineQuery, timelineRange],
  );

  const activeMedicationIds = useMemo(
    () =>
      new Set(
        (medicationsQuery.data ?? [])
          .filter((medication) => medication.is_active)
          .map((medication) => medication.id),
      ),
    [medicationsQuery.data],
  );

  const todayOccurrences = useMemo(
    () =>
      buildTodayMedicationOccurrences(
        (schedulesQuery.data ?? []).filter((schedule) =>
          activeMedicationIds.has(schedule.medication_id),
        ),
        clockNow,
      ),
    [activeMedicationIds, clockNow, schedulesQuery.data],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof Notification === "undefined") {
      setNotificationPermission("unsupported");
      return;
    }
    setNotificationPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof Notification === "undefined" ||
      Notification.permission !== "granted"
    ) {
      return;
    }

    const currentTimezone = browserTimezone();

    for (const occurrence of todayOccurrences) {
      if (occurrence.timezone !== currentTimezone) continue;
      if (!isReminderDue(occurrence, eventsQuery.data ?? [], clockNow)) continue;

      const key = `health-med-reminder:${occurrence.scheduleId}:${occurrence.scheduledFor}`;
      if (window.localStorage.getItem(key)) continue;

      new Notification(
        lang === "ar" ? "تذكير صحي" : "Health reminder",
        {
          body:
            lang === "ar"
              ? "لديك موعد دواء مسجل في مؤشر صحي."
              : "You have a medication time recorded in Health Indicator.",
          tag: key,
        },
      );
      window.localStorage.setItem(key, "shown");
    }
  }, [clockNow, eventsQuery.data, lang, todayOccurrences]);

  const requestMedicationNotifications = async () => {
    if (typeof Notification === "undefined") {
      setNotificationPermission("unsupported");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  const eventSummary = medicationEventSummary(eventsQuery.data ?? []);
  const isLoading =
    journalQuery.isLoading ||
    medicationsQuery.isLoading ||
    eventsQuery.isLoading ||
    schedulesQuery.isLoading ||
    measurementsQuery.isLoading ||
    measurementTypesQuery.isLoading ||
    symptomSessionsQuery.isLoading;

  const hasError =
    journalQuery.error ||
    medicationsQuery.error ||
    eventsQuery.error ||
    schedulesQuery.error ||
    measurementsQuery.error ||
    measurementTypesQuery.error ||
    symptomSessionsQuery.error;

  if (loading) return <LoadingState />;

  if (!user) {
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader
          title={lang === "ar" ? "السجل الصحي" : "Health journal"}
          subtitle={
            lang === "ar"
              ? "سجّل يومياتك وأدويتك واربطها بنشاطك الصحي."
              : "Record journal notes and medications alongside your health activity."
          }
        />
        <div className="glass rounded-3xl p-8 text-center">
          <BookHeart className="mx-auto size-11 text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">
            {lang === "ar"
              ? "سجّل الدخول لحفظ سجل صحي شخصي خاص بحسابك."
              : "Sign in to keep a private personal health journal."}
          </p>
          <Link
            to="/auth"
            search={{ redirect: "/journal" }}
            className="mt-5 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
          >
            {lang === "ar" ? "تسجيل الدخول" : "Sign in"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={lang === "ar" ? "السجل الصحي" : "Health journal"}
        subtitle={
          lang === "ar"
            ? "يوميات وأدوية وخط زمني شخصي. البيانات المسجلة لا تستخدم لوصف علاج أو تغيير جرعات."
            : "A personal journal, medication log, and health timeline. Entries do not prescribe or change treatment."
        }
      >
        <Link
          to="/health-summary"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-card px-4 py-2.5 text-sm font-bold text-primary ring-1 ring-border"
        >
          <FileText className="size-4" />
          {lang === "ar" ? "ملخص صحي للطباعة" : "Printable health summary"}
        </Link>
      </PageHeader>

      <div className="mb-5 grid grid-cols-3 gap-2 rounded-2xl bg-card p-1.5 ring-1 ring-border">
        {([
          ["timeline", lang === "ar" ? "الخط الزمني" : "Timeline", History],
          ["journal", lang === "ar" ? "اليوميات" : "Journal", NotebookPen],
          ["medications", lang === "ar" ? "الأدوية" : "Medications", Pill],
        ] as const).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold transition",
              tab === value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-primary-soft hover:text-primary",
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingState />
      ) : hasError ? (
        <ErrorState />
      ) : tab === "timeline" ? (
        <div className="space-y-4">
          <TimelineFilters
            lang={lang}
            query={timelineQuery}
            setQuery={setTimelineQuery}
            kind={timelineKind}
            setKind={setTimelineKind}
            range={timelineRange}
            setRange={setTimelineRange}
          />
          <TimelinePanel items={filteredTimeline} lang={lang} />
        </div>
      ) : tab === "journal" ? (
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <JournalForm
            lang={lang}
            entryType={journalType}
            setEntryType={setJournalType}
            title={journalTitle}
            setTitle={setJournalTitle}
            note={journalNote}
            setNote={setJournalNote}
            moodScore={moodScore}
            setMoodScore={setMoodScore}
            energyScore={energyScore}
            setEnergyScore={setEnergyScore}
            measurementOptions={measurementLinkOptions}
            relatedMeasurementId={relatedMeasurementId}
            setRelatedMeasurementId={setRelatedMeasurementId}
            sessionOptions={symptomSessionLinkOptions}
            relatedSessionId={relatedSessionId}
            setRelatedSessionId={setRelatedSessionId}
            saving={addJournal.isPending}
            onSave={() => addJournal.mutate()}
          />
          <JournalList entries={journalQuery.data ?? []} lang={lang} />
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <MedicationForm
            lang={lang}
            name={medicationName}
            setName={setMedicationName}
            dose={doseText}
            setDose={setDoseText}
            schedule={scheduleText}
            setSchedule={setScheduleText}
            saving={addMedication.isPending}
            onSave={() => addMedication.mutate()}
          />
          <MedicationList
            medications={medicationsQuery.data ?? []}
            events={eventsQuery.data ?? []}
            summary={eventSummary}
            lang={lang}
            busy={addDoseEvent.isPending || toggleMedication.isPending}
            onEvent={(medicationId, status) =>
              addDoseEvent.mutate({ medicationId, status })
            }
            onToggle={(medicationId, isActive) =>
              toggleMedication.mutate({ medicationId, isActive })
            }
          />
        </div>
      )}
    </div>
  );
}

function JournalForm({
  lang,
  entryType,
  setEntryType,
  title,
  setTitle,
  note,
  setNote,
  moodScore,
  setMoodScore,
  energyScore,
  setEnergyScore,
  measurementOptions,
  relatedMeasurementId,
  setRelatedMeasurementId,
  sessionOptions,
  relatedSessionId,
  setRelatedSessionId,
  saving,
  onSave,
}: {
  lang: "ar" | "en";
  entryType: JournalRow["entry_type"];
  setEntryType: (value: JournalRow["entry_type"]) => void;
  title: string;
  setTitle: (value: string) => void;
  note: string;
  setNote: (value: string) => void;
  moodScore: string;
  setMoodScore: (value: string) => void;
  energyScore: string;
  setEnergyScore: (value: string) => void;
  measurementOptions: { id: string; label: string }[];
  relatedMeasurementId: string;
  setRelatedMeasurementId: (value: string) => void;
  sessionOptions: { id: string; label: string }[];
  relatedSessionId: string;
  setRelatedSessionId: (value: string) => void;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <section className="glass rounded-3xl p-5 md:p-6">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Plus className="size-5" />
        </span>
        <div>
          <h2 className="font-extrabold">
            {lang === "ar" ? "إضافة يومية" : "Add journal entry"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {lang === "ar"
              ? "اكتب ما تريد تذكره ومشاركته لاحقًا مع طبيبك."
              : "Record information you may want to remember or share later."}
          </p>
        </div>
      </div>

      <label className="mt-5 block">
        <span className="text-xs font-bold text-muted-foreground">
          {lang === "ar" ? "نوع اليومية" : "Entry type"}
        </span>
        <select
          value={entryType}
          onChange={(event) =>
            setEntryType(event.target.value as JournalRow["entry_type"])
          }
          className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
        >
          {Object.entries(entryTypeLabel).map(([value, label]) => (
            <option key={value} value={value}>
              {label[lang]}
            </option>
          ))}
        </select>
      </label>

      <Field
        label={lang === "ar" ? "عنوان اختياري" : "Optional title"}
        value={title}
        onChange={setTitle}
      />

      <label className="mt-3 block">
        <span className="text-xs font-bold text-muted-foreground">
          {lang === "ar" ? "الملاحظة" : "Note"}
        </span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={5}
          className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
        />
      </label>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <ScoreField
          label={lang === "ar" ? "المزاج 1–5" : "Mood 1–5"}
          value={moodScore}
          onChange={setMoodScore}
        />
        <ScoreField
          label={lang === "ar" ? "الطاقة 1–5" : "Energy 1–5"}
          value={energyScore}
          onChange={setEnergyScore}
        />
      </div>


      <div className="mt-4 rounded-2xl bg-card/70 p-4 ring-1 ring-border">
        <p className="text-xs font-extrabold">
          {lang === "ar" ? "ربط اختياري بسجل سابق" : "Optional link to prior activity"}
        </p>
        <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
          {lang === "ar"
            ? "اربط اليومية بقياس أو فحص أعراض لتظهر العلاقة بوضوح في السجل، بدون استنتاج طبي تلقائي."
            : "Link the note to a measurement or symptom check for context, without automatic clinical inference."}
        </p>

        <label className="mt-3 block">
          <span className="text-xs font-bold text-muted-foreground">
            {lang === "ar" ? "قياس مرتبط" : "Related measurement"}
          </span>
          <select
            value={relatedMeasurementId}
            onChange={(event) => setRelatedMeasurementId(event.target.value)}
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
          >
            <option value="">
              {lang === "ar" ? "بدون ربط" : "No link"}
            </option>
            {measurementOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-3 block">
          <span className="text-xs font-bold text-muted-foreground">
            {lang === "ar" ? "فحص أعراض مرتبط" : "Related symptom check"}
          </span>
          <select
            value={relatedSessionId}
            onChange={(event) => setRelatedSessionId(event.target.value)}
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
          >
            <option value="">
              {lang === "ar" ? "بدون ربط" : "No link"}
            </option>
            {sessionOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="button"
        disabled={!note.trim() || saving}
        onClick={onSave}
        className="mt-5 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-45"
      >
        {saving
          ? lang === "ar"
            ? "جارٍ الحفظ..."
            : "Saving..."
          : lang === "ar"
            ? "حفظ اليومية"
            : "Save entry"}
      </button>
    </section>
  );
}

function JournalList({
  entries,
  lang,
}: {
  entries: JournalRow[];
  lang: "ar" | "en";
}) {
  return (
    <section className="space-y-3">
      {!entries.length ? (
        <EmptyCard
          icon={NotebookPen}
          text={
            lang === "ar"
              ? "لا توجد يوميات محفوظة بعد."
              : "No journal entries yet."
          }
        />
      ) : (
        entries.map((item) => (
          <article key={item.id} className="glass rounded-3xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-primary">
                  {entryTypeLabel[item.entry_type][lang]}
                </p>
                <h3 className="mt-1 font-extrabold">
                  {item.title ||
                    (lang === "ar" ? "يومية صحية" : "Health journal entry")}
                </h3>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {new Date(item.occurred_at).toLocaleString(
                  lang === "ar" ? "ar-SA" : "en",
                )}
              </span>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
              {item.note}
            </p>
            {item.mood_score || item.energy_score ? (
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {item.mood_score ? (
                  <span className="rounded-full bg-primary-soft px-3 py-1 text-primary">
                    {lang === "ar" ? "المزاج" : "Mood"}: {item.mood_score}/5
                  </span>
                ) : null}
                {item.energy_score ? (
                  <span className="rounded-full bg-primary-soft px-3 py-1 text-primary">
                    {lang === "ar" ? "الطاقة" : "Energy"}: {item.energy_score}/5
                  </span>
                ) : null}
              </div>
            ) : null}
            {item.related_measurement_reading_id || item.related_symptom_session_id ? (
              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                {item.related_measurement_reading_id ? (
                  <span className="rounded-full bg-card px-3 py-1 text-muted-foreground ring-1 ring-border">
                    {lang === "ar" ? "مرتبطة بقياس" : "Linked measurement"}
                  </span>
                ) : null}
                {item.related_symptom_session_id ? (
                  <span className="rounded-full bg-card px-3 py-1 text-muted-foreground ring-1 ring-border">
                    {lang === "ar" ? "مرتبطة بفحص أعراض" : "Linked symptom check"}
                  </span>
                ) : null}
              </div>
            ) : null}
          </article>
        ))
      )}
    </section>
  );
}

function MedicationForm({
  lang,
  name,
  setName,
  dose,
  setDose,
  schedule,
  setSchedule,
  saving,
  onSave,
}: {
  lang: "ar" | "en";
  name: string;
  setName: (value: string) => void;
  dose: string;
  setDose: (value: string) => void;
  schedule: string;
  setSchedule: (value: string) => void;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <section className="glass rounded-3xl p-5 md:p-6">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Pill className="size-5" />
        </span>
        <div>
          <h2 className="font-extrabold">
            {lang === "ar" ? "إضافة دواء" : "Add medication"}
          </h2>
          <p className="text-xs leading-5 text-muted-foreground">
            {lang === "ar"
              ? "سجل المعلومات كما وصفها لك مختص الرعاية. التطبيق لا يحدد الجرعة."
              : "Record it as instructed by your clinician. The app does not determine dosage."}
          </p>
        </div>
      </div>

      <Field
        label={lang === "ar" ? "اسم الدواء" : "Medication name"}
        value={name}
        onChange={setName}
      />
      <Field
        label={lang === "ar" ? "الجرعة كما وصفت لك" : "Dose as prescribed"}
        value={dose}
        onChange={setDose}
      />
      <Field
        label={lang === "ar" ? "جدول الاستخدام" : "Schedule"}
        value={schedule}
        onChange={setSchedule}
      />

      <button
        type="button"
        disabled={!name.trim() || saving}
        onClick={onSave}
        className="mt-5 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-45"
      >
        {saving
          ? lang === "ar"
            ? "جارٍ الحفظ..."
            : "Saving..."
          : lang === "ar"
            ? "حفظ الدواء"
            : "Save medication"}
      </button>
    </section>
  );
}

function MedicationList({
  medications,
  events,
  summary,
  lang,
  busy,
  onEvent,
  onToggle,
}: {
  medications: MedicationRow[];
  events: DoseEventRow[];
  summary: { total: number; taken: number; skipped: number };
  lang: "ar" | "en";
  busy: boolean;
  onEvent: (medicationId: string, status: DoseEventRow["status"]) => void;
  onToggle: (medicationId: string, isActive: boolean) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="glass grid grid-cols-3 gap-2 rounded-3xl p-4 text-center">
        <Metric
          value={summary.total}
          label={lang === "ar" ? "أحداث مسجلة" : "Recorded"}
        />
        <Metric
          value={summary.taken}
          label={lang === "ar" ? "تم أخذها" : "Taken"}
        />
        <Metric
          value={summary.skipped}
          label={lang === "ar" ? "تم تخطيها" : "Skipped"}
        />
      </div>

      {!medications.length ? (
        <EmptyCard
          icon={Pill}
          text={
            lang === "ar"
              ? "لم تسجل أدوية بعد."
              : "No medications recorded yet."
          }
        />
      ) : (
        medications.map((medication) => {
          const latestEvents = events
            .filter((item) => item.medication_id === medication.id)
            .slice(0, 3);

          return (
            <article key={medication.id} className="glass rounded-3xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-extrabold">{medication.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[medication.dose_text, medication.schedule_text]
                      .filter(Boolean)
                      .join(" • ") ||
                      (lang === "ar"
                        ? "لا توجد تفاصيل إضافية"
                        : "No additional details")}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    onToggle(medication.id, !medication.is_active)
                  }
                  className={cn(
                    "rounded-full px-3 py-1 text-[11px] font-bold",
                    medication.is_active
                      ? "bg-success-soft text-success"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {medication.is_active
                    ? lang === "ar"
                      ? "نشط"
                      : "Active"
                    : lang === "ar"
                      ? "متوقف"
                      : "Inactive"}
                </button>
              </div>

              {medication.is_active ? (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onEvent(medication.id, "taken")}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-success-soft px-3 py-2.5 text-xs font-bold text-success"
                  >
                    <Check className="size-4" />
                    {lang === "ar" ? "تم أخذ الجرعة" : "Taken"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onEvent(medication.id, "skipped")}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-card px-3 py-2.5 text-xs font-bold text-muted-foreground ring-1 ring-border"
                  >
                    <SkipForward className="size-4" />
                    {lang === "ar" ? "تم التخطي" : "Skipped"}
                  </button>
                </div>
              ) : null}

              {latestEvents.length ? (
                <div className="mt-4 space-y-2 border-t border-border pt-4">
                  {latestEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="font-semibold">
                        {event.status === "taken"
                          ? lang === "ar"
                            ? "تم أخذ الجرعة"
                            : "Dose taken"
                          : lang === "ar"
                            ? "تم تخطي الجرعة"
                            : "Dose skipped"}
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(event.event_at).toLocaleString(
                          lang === "ar" ? "ar-SA" : "en",
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })
      )}
    </section>
  );
}

function TimelineFilters({
  lang,
  query,
  setQuery,
  kind,
  setKind,
  range,
  setRange,
}: {
  lang: "ar" | "en";
  query: string;
  setQuery: (value: string) => void;
  kind: HealthTimelineFilter["kind"];
  setKind: (value: HealthTimelineFilter["kind"]) => void;
  range: HealthTimelineRangeDays;
  setRange: (value: HealthTimelineRangeDays) => void;
}) {
  const kinds: { value: HealthTimelineFilter["kind"]; label: string }[] = [
    { value: "all", label: lang === "ar" ? "الكل" : "All" },
    { value: "journal", label: lang === "ar" ? "اليوميات" : "Journal" },
    { value: "medication", label: lang === "ar" ? "الأدوية" : "Medication" },
    { value: "measurement", label: lang === "ar" ? "القياسات" : "Measurements" },
    { value: "symptom_check", label: lang === "ar" ? "الفحوصات" : "Checks" },
  ];

  return (
    <section className="glass rounded-3xl p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            lang === "ar"
              ? "ابحث في السجل الصحي..."
              : "Search your health timeline..."
          }
          className="w-full rounded-xl border border-border bg-background py-2.5 pe-3 ps-10 text-sm"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {kinds.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setKind(option.value)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-bold",
              kind === option.value
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground ring-1 ring-border",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
        {([
          [7, lang === "ar" ? "7 أيام" : "7 days"],
          [30, lang === "ar" ? "30 يوم" : "30 days"],
          [90, lang === "ar" ? "90 يوم" : "90 days"],
          ["all", lang === "ar" ? "كل المدة" : "All time"],
        ] as const).map(([value, label]) => (
          <button
            key={String(value)}
            type="button"
            onClick={() => setRange(value)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-[11px] font-semibold",
              range === value
                ? "bg-primary-soft text-primary"
                : "text-muted-foreground hover:bg-card",
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}

function TimelinePanel({
  items,
  lang,
}: {
  items: HealthTimelineItem[];
  lang: "ar" | "en";
}) {
  const iconByKind = {
    journal: NotebookPen,
    medication: Pill,
    measurement: Activity,
    symptom_check: ClipboardList,
  } as const;

  if (!items.length) {
    return (
      <EmptyCard
        icon={CalendarClock}
        text={
          lang === "ar"
            ? "لا يوجد نشاط صحي محفوظ بعد."
            : "No saved health activity yet."
        }
      />
    );
  }

  return (
    <section className="space-y-3">
      {items.map((item) => {
        const Icon = iconByKind[item.kind];
        return (
          <article
            key={item.id}
            className="glass flex items-start gap-4 rounded-3xl p-4 md:p-5"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
              <Icon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="font-extrabold">{item.title}</h2>
                <time className="text-[11px] text-muted-foreground">
                  {new Date(item.occurredAt).toLocaleString(
                    lang === "ar" ? "ar-SA" : "en",
                  )}
                </time>
              </div>
              {item.subtitle ? (
                <p className="mt-1 line-clamp-3 text-sm leading-6 text-muted-foreground">
                  {item.subtitle}
                </p>
              ) : null}
            </div>
          </article>
        );
      })}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="mt-3 block">
      <span className="text-xs font-bold text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
      />
    </label>
  );
}

function ScoreField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
      >
        <option value="">—</option>
        {[1, 2, 3, 4, 5].map((score) => (
          <option key={score} value={score}>
            {score}
          </option>
        ))}
      </select>
    </label>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-card p-3 ring-1 ring-border">
      <strong className="text-xl font-extrabold">{value}</strong>
      <p className="mt-1 text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function EmptyCard({
  icon: Icon,
  text,
}: {
  icon: typeof BookHeart;
  text: string;
}) {
  return (
    <div className="glass rounded-3xl p-8 text-center">
      <Icon className="mx-auto size-10 text-primary" />
      <p className="mt-3 text-sm text-muted-foreground">{text}</p>
    </div>
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
