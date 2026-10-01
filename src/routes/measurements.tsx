import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Activity,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Droplets,
  Gauge,
  HeartPulse,
  History,
  Plus,
  Ruler,
  Scale,
  Thermometer,
  Wind,
  X,
} from "lucide-react";
import { PageHeader, ErrorState, LoadingState } from "@/components/health/cards";
import { MeasurementQualityBadge } from "@/components/health/MeasurementQualityBadge";
import { MedicalDisclaimer } from "@/components/health/MedicalDisclaimer";
import { useAuth } from "@/hooks/use-auth";
import {
  measurementsDb,
  type MeasurementKnowledgeArticleRow,
  type MeasurementKnowledgeSectionRow,
  type MeasurementReadingRow,
  type MeasurementTypeRow,
} from "@/lib/measurements-db";
import { appConfig } from "@/config/app";
import { cn } from "@/lib/utils";
import { normalizeTemperatureReading } from "@/engines/temperature-quality";
import { normalizeGlucoseReading } from "@/engines/glucose-quality";
import {
  calculateBmi,
  normalizeHeightReading,
  normalizeWeightReading,
} from "@/engines/body-metrics-quality";
import type { MeasurementContext, MeasurementReading } from "@/types/measurements";
import {
  assessMeasurementCaptureQuality,
  captureIssueAr,
  getCaptureQuestions,
  isCaptureComplete,
  type CaptureQuestion,
} from "@/lib/measurement-capture";

export const Route = createFileRoute("/measurements")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "قياساتي الصحية — مؤشر صحي" },
      {
        name: "description",
        content:
          "سجّل قياساتك الصحية وتابع اتجاهاتها واقرأ الإرشادات المرتبطة بها داخل مؤشر صحي.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MeasurementsPage,
});

const iconByCode = {
  blood_pressure: Gauge,
  oxygen_saturation: Droplets,
  temperature: Thermometer,
  pulse: HeartPulse,
  blood_glucose: Activity,
  respiratory_rate: Wind,
  weight: Scale,
  height: Ruler,
  bmi: Activity,
} as const;

const labelByCode: Record<string, string> = {
  blood_pressure: "ضغط الدم",
  oxygen_saturation: "تشبع الأكسجين",
  temperature: "درجة الحرارة",
  pulse: "النبض",
  blood_glucose: "سكر الدم",
  respiratory_rate: "معدل التنفس",
  weight: "الوزن",
  height: "الطول",
  bmi: "مؤشر كتلة الجسم",
};

type DraftValue = {
  scalar: string;
  systolic: string;
  diastolic: string;
  unit: string;
  notes: string;
  context: MeasurementContext;
};

function MeasurementsPage() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [knowledgeTypeId, setKnowledgeTypeId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftValue>({
    scalar: "",
    systolic: "",
    diastolic: "",
    unit: "",
    notes: "",
    context: {},
  });

  const typesQuery = useQuery({
    queryKey: ["measurement-types", appConfig.contentMode],
    queryFn: async () => {
      const { data, error } = await measurementsDb
        .from("measurement_types")
        .select(
          "id,code,name_ar,name_en,description_ar,value_kind,canonical_unit,allowed_units,component_schema,capture_context_schema,review_status,is_active,is_demo,version",
        )
        .order("name_ar");
      if (error) throw error;
      return data;
    },
  });

  const readingsQuery = useQuery({
    queryKey: ["measurement-readings", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await measurementsDb
        .from("measurement_readings")
        .select(
          "id,user_id,measurement_type_id,measured_at,scalar_value,unit,components,context,quality,notes,created_at,updated_at",
        )
        .eq("user_id", user!.id)
        .order("measured_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const knowledgeQuery = useQuery({
    queryKey: ["measurement-knowledge", knowledgeTypeId, appConfig.contentMode],
    enabled: Boolean(knowledgeTypeId),
    queryFn: async () => {
      const { data: articles, error: articleError } = await measurementsDb
        .from("measurement_knowledge_articles")
        .select(
          "id,measurement_type_id,code,audience,title_ar,title_en,summary_ar,summary_en,review_status,is_active,is_demo,version,last_medical_review_at",
        )
        .eq("measurement_type_id", knowledgeTypeId!)
        .eq("audience", "general")
        .order("version", { ascending: false });

      if (articleError) throw articleError;

      const visible = chooseArticle(articles);
      if (!visible) return null;

      const { data: sections, error: sectionError } = await measurementsDb
        .from("measurement_knowledge_sections")
        .select(
          "id,article_id,section_type,title_ar,title_en,body_ar,body_en,sort_order",
        )
        .eq("article_id", visible.id)
        .order("sort_order");

      if (sectionError) throw sectionError;
      return { article: visible, sections };
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({
      type,
      form,
    }: {
      type: MeasurementTypeRow;
      form: DraftValue;
    }) => {
      if (!user) throw new Error("LOGIN_REQUIRED");

      const payload = buildReadingPayload(type, form);
      const capture = assessMeasurementCaptureQuality(type.code, form.context);
      if (capture.quality === "unknown") throw new Error("CAPTURE_INCOMPLETE");

      const { error } = await measurementsDb.from("measurement_readings").insert({
        user_id: user.id,
        measurement_type_id: type.id,
        measured_at: new Date().toISOString(),
        scalar_value: payload.scalarValue,
        unit: payload.unit,
        components: payload.components,
        context: form.context,
        quality: capture.quality,
        notes: form.notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setSelectedTypeId(null);
      setDraft({ scalar: "", systolic: "", diastolic: "", unit: "", notes: "", context: {} });
      await queryClient.invalidateQueries({
        queryKey: ["measurement-readings", user?.id],
      });
    },
  });

  const types = typesQuery.data ?? [];
  const readings = readingsQuery.data ?? [];

  const latestByType = useMemo(() => {
    const map = new Map<string, MeasurementReadingRow>();
    for (const reading of readings) {
      if (!map.has(reading.measurement_type_id)) {
        map.set(reading.measurement_type_id, reading);
      }
    }
    return map;
  }, [readings]);

  const derivedBmi = useMemo(() => {
    const weightType = types.find((item) => item.code === "weight");
    const heightType = types.find((item) => item.code === "height");
    if (!weightType || !heightType) return null;

    const weight = latestByType.get(weightType.id)?.scalar_value;
    const height = latestByType.get(heightType.id)?.scalar_value;
    if (weight == null || height == null) return null;
    return calculateBmi(weight, height);
  }, [types, latestByType]);

  if (authLoading || typesQuery.isLoading) return <LoadingState />;
  if (typesQuery.error) return <ErrorState text="تعذر تحميل القياسات الصحية." />;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="قياساتي الصحية"
        subtitle="سجّل قراءاتك، تابع الاتجاهات، واقرأ إرشادات القياس والتفسير داخل التطبيق."
      />

      <MedicalDisclaimer className="mb-6" />

      {!user ? (
        <section className="glass mb-6 rounded-3xl p-5 ring-1 ring-border">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-extrabold">يمكنك استعراض القياسات بدون حساب</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                تسجيل القراءات وحفظ السجل الشخصي يحتاج إلى تسجيل الدخول.
              </p>
            </div>
            <Link
              to="/auth"
              search={{ redirect: "/measurements" }}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              تسجيل الدخول
            </Link>
          </div>
        </section>
      ) : null}

      {!types.length ? (
        <section className="glass rounded-3xl p-8 text-center">
          <Activity className="mx-auto size-10 text-primary" />
          <h2 className="mt-3 font-extrabold">القياسات قيد المراجعة الطبية</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-muted-foreground">
            لا توجد أنواع قياس منشورة ومتاحة لحسابك حتى الآن. لن نعرض قواعد أو
            محتوى طبي غير منشور لمجرد إكمال الواجهة.
          </p>
        </section>
      ) : (
        <>
          {derivedBmi != null ? (
            <section className="mb-5 rounded-3xl bg-primary-soft p-5 ring-1 ring-primary/15">
              <p className="text-xs font-bold text-primary">BMI محسوب من آخر وزن وطول</p>
              <div className="mt-1 flex items-end gap-2">
                <strong className="text-3xl font-extrabold">
                  {derivedBmi.toFixed(1)}
                </strong>
                <span className="pb-1 text-sm text-muted-foreground">kg/m²</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                قيمة مشتقة للمتابعة فقط؛ التفسير الطبي يعتمد على المحتوى المنشور
                والسياق المناسب.
              </p>
            </section>
          ) : null}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {types.map((type) => {
              const Icon =
                iconByCode[type.code as keyof typeof iconByCode] ?? Activity;
              const latest = latestByType.get(type.id);
              const isDraft = type.review_status !== "published" || !type.is_active;
              const history = readings
                .filter((item) => item.measurement_type_id === type.id)
                .slice(0, 5);

              return (
                <article
                  key={type.id}
                  className="glass overflow-hidden rounded-3xl ring-1 ring-border"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary">
                        <Icon className="size-5" />
                      </span>
                      {isDraft ? (
                        <span className="rounded-full bg-warning-soft px-2.5 py-1 text-[11px] font-semibold text-warning">
                          معاينة — قيد المراجعة
                        </span>
                      ) : latest ? (
                        <MeasurementQualityBadge quality={latest.quality} />
                      ) : null}
                    </div>

                    <h2 className="mt-4 text-lg font-extrabold">
                      {type.name_ar || labelByCode[type.code] || type.code}
                    </h2>
                    <p className="mt-1 min-h-12 text-sm leading-6 text-muted-foreground">
                      {type.description_ar ?? "سجل القراءة وتابعها عبر الوقت."}
                    </p>

                    <div className="mt-4 rounded-2xl bg-card/70 p-4 ring-1 ring-border">
                      <p className="text-xs font-bold text-muted-foreground">
                        آخر قراءة
                      </p>
                      {latest ? (
                        <div className="mt-2">
                          <p className="text-xl font-extrabold">
                            {formatReading(latest)}
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {new Date(latest.measured_at).toLocaleString("ar-SA")}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground">
                          لا توجد قراءة محفوظة.
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={!user || isDraft}
                        onClick={() => {
                          setSelectedTypeId(
                            selectedTypeId === type.id ? null : type.id,
                          );
                          setDraft({
                            scalar: "",
                            systolic: "",
                            diastolic: "",
                            unit: type.canonical_unit ?? type.allowed_units[0] ?? "",
                            notes: "",
                            context: {},
                          });
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-xs font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <Plus className="size-4" />
                        إضافة قراءة
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setKnowledgeTypeId(
                            knowledgeTypeId === type.id ? null : type.id,
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-card px-3.5 py-2.5 text-xs font-bold text-primary ring-1 ring-border"
                      >
                        <BookOpen className="size-4" />
                        دليل القياس
                      </button>
                    </div>

                    {selectedTypeId === type.id ? (
                      <MeasurementEntryForm
                        type={type}
                        draft={draft}
                        setDraft={setDraft}
                        saving={saveMutation.isPending}
                        error={saveMutation.error}
                        onCancel={() => setSelectedTypeId(null)}
                        onSave={() => saveMutation.mutate({ type, form: draft })}
                      />
                    ) : null}
                  </div>

                  {history.length ? (
                    <HistoryList history={history} />
                  ) : null}

                  {knowledgeTypeId === type.id ? (
                    <KnowledgePanel
                      loading={knowledgeQuery.isLoading}
                      error={Boolean(knowledgeQuery.error)}
                      data={knowledgeQuery.data}
                    />
                  ) : null}
                </article>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}

function MeasurementEntryForm({
  type,
  draft,
  setDraft,
  saving,
  error,
  onCancel,
  onSave,
}: {
  type: MeasurementTypeRow;
  draft: DraftValue;
  setDraft: (next: DraftValue) => void;
  saving: boolean;
  error: Error | null;
  onCancel: () => void;
  onSave: () => void;
}) {
  const isBloodPressure = type.code === "blood_pressure";
  const valueValid = isBloodPressure
    ? Number(draft.systolic) > 0 && Number(draft.diastolic) > 0
    : Number(draft.scalar) > 0;
  const captureComplete = isCaptureComplete(type.code, draft.context);
  const capture = assessMeasurementCaptureQuality(type.code, draft.context);
  const valid = valueValid && captureComplete;

  return (
    <div className="mt-4 rounded-2xl bg-card p-4 ring-1 ring-primary/15">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-extrabold">قراءة جديدة</p>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
          aria-label="إغلاق"
        >
          <X className="size-4" />
        </button>
      </div>

      {isBloodPressure ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <NumberField
            label="الانقباضي"
            value={draft.systolic}
            unit="mmHg"
            onChange={(value) => setDraft({ ...draft, systolic: value })}
          />
          <NumberField
            label="الانبساطي"
            value={draft.diastolic}
            unit="mmHg"
            onChange={(value) => setDraft({ ...draft, diastolic: value })}
          />
        </div>
      ) : (
        <div className="mt-4">
          <NumberField
            label="القيمة"
            value={draft.scalar}
            unit={draft.unit}
            onChange={(value) => setDraft({ ...draft, scalar: value })}
          />
        </div>
      )}

      {!isBloodPressure && type.allowed_units.length > 1 ? (
        <label className="mt-3 block">
          <span className="text-xs font-bold text-muted-foreground">الوحدة</span>
          <select
            value={draft.unit}
            onChange={(event) =>
              setDraft({ ...draft, unit: event.target.value })
            }
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
          >
            {type.allowed_units.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <CaptureQuestions
        code={type.code}
        context={draft.context}
        onChange={(context) => setDraft({ ...draft, context })}
      />

      {capture.quality !== "unknown" ? (
        <div className="mt-3 rounded-xl bg-background/70 p-3 ring-1 ring-border">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold">جودة ظروف القياس</span>
            <MeasurementQualityBadge quality={capture.quality} />
          </div>
          {capture.issues.length ? (
            <ul className="mt-2 space-y-1 text-[11px] leading-5 text-muted-foreground">
              {capture.issues.map((issue) => (
                <li key={issue}>• {captureIssueAr[issue] ?? issue}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[11px] text-muted-foreground">
              ظروف القياس المسجلة مناسبة لتقييم الجودة.
            </p>
          )}
        </div>
      ) : null}

      <label className="mt-3 block">
        <span className="text-xs font-bold text-muted-foreground">
          ملاحظة اختيارية
        </span>
        <input
          value={draft.notes}
          onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
          className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
          placeholder="مثال: قبل الإفطار"
        />
      </label>

      {!captureComplete ? (
        <p className="mt-3 text-[11px] leading-5 text-warning">
          أكمل أسئلة ظروف القياس قبل الحفظ حتى نستطيع تقييم جودة القراءة.
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 text-xs font-semibold text-destructive">
          تعذر حفظ القراءة. تحقق من البيانات وحاول مرة أخرى.
        </p>
      ) : null}

      <button
        type="button"
        disabled={!valid || saving}
        onClick={onSave}
        className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-45"
      >
        {saving ? "جارٍ الحفظ..." : "حفظ القراءة"}
      </button>
    </div>
  );
}

function CaptureQuestions({
  code,
  context,
  onChange,
}: {
  code: string;
  context: MeasurementContext;
  onChange: (context: MeasurementContext) => void;
}) {
  const questions = getCaptureQuestions(code, context);
  if (!questions.length) return null;

  const setValue = (question: CaptureQuestion, value: string | number | boolean) => {
    const next = { ...context, [question.key]: value };
    onChange(next);
  };

  return (
    <div className="mt-4 space-y-3 border-t border-border pt-4">
      <div>
        <p className="text-xs font-extrabold">ظروف القياس</p>
        <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
          هذه الأسئلة لا تشخّص حالة؛ هدفها تقييم موثوقية طريقة أخذ القراءة.
        </p>
      </div>
      {questions.map((question) => (
        <CaptureQuestionField
          key={question.key}
          question={question}
          value={context[question.key]}
          onChange={(value) => setValue(question, value)}
        />
      ))}
    </div>
  );
}

function CaptureQuestionField({
  question,
  value,
  onChange,
}: {
  question: CaptureQuestion;
  value: MeasurementContext[string];
  onChange: (value: string | number | boolean) => void;
}) {
  if (question.type === "boolean") {
    return (
      <fieldset>
        <legend className="text-xs font-bold text-muted-foreground">{question.label}</legend>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {[
            { value: true, label: "نعم" },
            { value: false, label: "لا" },
          ].map((option) => (
            <button
              key={String(option.value)}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "rounded-xl border px-3 py-2 text-xs font-semibold transition",
                value === option.value
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border bg-background text-muted-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>
    );
  }

  if (question.type === "select") {
    return (
      <label className="block">
        <span className="text-xs font-bold text-muted-foreground">{question.label}</span>
        <select
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
        >
          <option value="">اختر...</option>
          {question.options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="block">
      <span className="text-xs font-bold text-muted-foreground">{question.label}</span>
      <input
        type="number"
        inputMode="decimal"
        min={question.min}
        value={typeof value === "number" ? value : ""}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  unit,
  onChange,
}: {
  label: string;
  value: string;
  unit: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-muted-foreground">{label}</span>
      <div className="mt-1.5 flex overflow-hidden rounded-xl border border-border bg-background">
        <input
          inputMode="decimal"
          type="number"
          min="0"
          step="any"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
        />
        {unit ? (
          <span className="grid place-items-center border-s border-border px-3 text-xs text-muted-foreground">
            {unit}
          </span>
        ) : null}
      </div>
    </label>
  );
}

function HistoryList({ history }: { history: MeasurementReadingRow[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-border/80">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 px-5 py-3 text-xs font-bold text-muted-foreground"
      >
        <span className="inline-flex items-center gap-2">
          <History className="size-4" />
          آخر القراءات
        </span>
        {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>
      {open ? (
        <div className="space-y-2 border-t border-border/70 px-5 py-4">
          {history.map((reading) => (
            <div
              key={reading.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-card p-3 ring-1 ring-border"
            >
              <div>
                <p className="text-sm font-bold">{formatReading(reading)}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {new Date(reading.measured_at).toLocaleString("ar-SA")}
                </p>
              </div>
              <MeasurementQualityBadge quality={reading.quality} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function KnowledgePanel({
  loading,
  error,
  data,
}: {
  loading: boolean;
  error: boolean;
  data:
    | {
        article: MeasurementKnowledgeArticleRow;
        sections: MeasurementKnowledgeSectionRow[];
      }
    | null
    | undefined;
}) {
  if (loading) {
    return (
      <div className="border-t border-border/80 p-5 text-sm text-muted-foreground">
        جارٍ تحميل دليل القياس...
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-t border-border/80 p-5 text-sm text-destructive">
        تعذر تحميل المحتوى التوضيحي.
      </div>
    );
  }

  if (!data) {
    return (
      <div className="border-t border-border/80 p-5">
        <p className="text-sm font-bold">المحتوى قيد المراجعة</p>
        <p className="mt-1 text-xs leading-6 text-muted-foreground">
          لن نعرض نصًا طبيًا غير متاح وفق دورة المراجعة الحالية.
        </p>
      </div>
    );
  }

  return (
    <section className="border-t border-border/80 bg-card/40 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-extrabold">{data.article.title_ar}</p>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            {data.article.summary_ar}
          </p>
        </div>
        {data.article.review_status !== "published" ? (
          <span className="shrink-0 rounded-full bg-warning-soft px-2.5 py-1 text-[10px] font-bold text-warning">
            معاينة داخلية
          </span>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        {data.sections.map((section) => (
          <details
            key={section.id}
            className="rounded-2xl bg-background/70 p-4 ring-1 ring-border"
          >
            <summary className="cursor-pointer text-sm font-bold">
              {section.title_ar}
            </summary>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground">
              {section.body_ar}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

function chooseArticle(
  articles: MeasurementKnowledgeArticleRow[],
): MeasurementKnowledgeArticleRow | null {
  if (appConfig.contentMode === "production") {
    return (
      articles.find(
        (item) =>
          item.review_status === "published" &&
          item.is_active &&
          !item.is_demo,
      ) ?? null
    );
  }

  return (
    articles.find((item) => item.review_status !== "retired") ?? null
  );
}

function buildReadingPayload(type: MeasurementTypeRow, form: DraftValue) {
  if (type.code === "blood_pressure") {
    return {
      scalarValue: null,
      unit: null,
      components: {
        systolic: Number(form.systolic),
        diastolic: Number(form.diastolic),
      },
    };
  }

  let reading: MeasurementReading = {
    measurementTypeId: type.id,
    measuredAt: new Date().toISOString(),
    scalarValue: Number(form.scalar),
    unit: form.unit || type.canonical_unit || "",
    context: {},
  };

  if (type.code === "temperature") {
    reading = normalizeTemperatureReading(reading);
  } else if (type.code === "blood_glucose") {
    reading = normalizeGlucoseReading(reading);
  } else if (type.code === "weight") {
    reading = normalizeWeightReading(reading);
  } else if (type.code === "height") {
    reading = normalizeHeightReading(reading);
  }

  return {
    scalarValue: reading.scalarValue ?? null,
    unit: reading.unit,
    components: null,
  };
}

function formatReading(reading: MeasurementReadingRow): string {
  if (reading.components && !Array.isArray(reading.components)) {
    const components = reading.components as Record<string, unknown>;
    const systolic = components.systolic;
    const diastolic = components.diastolic;
    if (typeof systolic === "number" && typeof diastolic === "number") {
      return `${systolic}/${diastolic} mmHg`;
    }
  }

  if (reading.scalar_value == null) return "—";
  const rounded = Math.round(reading.scalar_value * 100) / 100;
  return `${rounded} ${reading.unit ?? ""}`.trim();
}
