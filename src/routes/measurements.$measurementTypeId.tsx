import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarRange,
  History,
  LineChart as LineChartIcon,
  ShieldCheck,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ErrorState, LoadingState, PageHeader } from "@/components/health/cards";
import { MedicalDisclaimer } from "@/components/health/MedicalDisclaimer";
import { MeasurementQualityBadge } from "@/components/health/MeasurementQualityBadge";
import { useAuth } from "@/hooks/use-auth";
import {
  measurementsDb,
  type MeasurementKnowledgeArticleRow,
  type MeasurementKnowledgeSectionRow,
  type MeasurementReadingRow,
} from "@/lib/measurements-db";
import {
  assessMeasurementCaptureQuality,
  captureIssueAr,
} from "@/lib/measurement-capture";
import {
  buildTrendPoints,
  filterReadingsByRange,
  summarizeQuality,
  summarizeTrend,
  type TrendRange,
} from "@/lib/measurement-trends";
import { appConfig } from "@/config/app";
import { isMeasurementTypeVisible } from "@/lib/measurement-visibility";
import type { MeasurementContext } from "@/types/measurements";

export const Route = createFileRoute("/measurements/$measurementTypeId")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "تفاصيل القياس — مؤشر صحي" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MeasurementDetailPage,
});

const rangeOptions: Array<{ value: TrendRange; label: string }> = [
  { value: "7d", label: "7 أيام" },
  { value: "30d", label: "30 يوم" },
  { value: "90d", label: "90 يوم" },
  { value: "all", label: "الكل" },
];

function MeasurementDetailPage() {
  const { measurementTypeId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const [range, setRange] = useState<TrendRange>("30d");

  const typeQuery = useQuery({
    queryKey: ["measurement-type", measurementTypeId, appConfig.contentMode],
    queryFn: async () => {
      const { data, error } = await measurementsDb
        .from("measurement_types")
        .select(
          "id,code,name_ar,name_en,description_ar,value_kind,canonical_unit,allowed_units,component_schema,capture_context_schema,review_status,is_active,is_demo,version",
        )
        .eq("id", measurementTypeId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return isMeasurementTypeVisible(data, appConfig.contentMode)
        ? data
        : null;
    },
  });

  const readingsQuery = useQuery({
    queryKey: ["measurement-detail-readings", user?.id, measurementTypeId],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await measurementsDb
        .from("measurement_readings")
        .select(
          "id,user_id,measurement_type_id,measured_at,scalar_value,unit,components,context,quality,notes,created_at,updated_at",
        )
        .eq("user_id", user!.id)
        .eq("measurement_type_id", measurementTypeId)
        .order("measured_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const knowledgeQuery = useQuery({
    queryKey: ["measurement-detail-knowledge", measurementTypeId, appConfig.contentMode],
    queryFn: async () => {
      const { data: articles, error: articleError } = await measurementsDb
        .from("measurement_knowledge_articles")
        .select(
          "id,measurement_type_id,code,audience,title_ar,title_en,summary_ar,summary_en,review_status,is_active,is_demo,version,last_medical_review_at",
        )
        .eq("measurement_type_id", measurementTypeId)
        .eq("audience", "general")
        .order("version", { ascending: false });
      if (articleError) throw articleError;

      const article = chooseKnowledgeArticle(articles);
      if (!article) return null;

      const { data: sections, error: sectionsError } = await measurementsDb
        .from("measurement_knowledge_sections")
        .select(
          "id,article_id,section_type,title_ar,title_en,body_ar,body_en,sort_order",
        )
        .eq("article_id", article.id)
        .order("sort_order");
      if (sectionsError) throw sectionsError;

      return { article, sections };
    },
  });

  const allReadings = readingsQuery.data ?? [];
  const filteredReadings = useMemo(
    () => filterReadingsByRange(allReadings, range),
    [allReadings, range],
  );

  const points = useMemo(
    () =>
      typeQuery.data
        ? buildTrendPoints(typeQuery.data.code, filteredReadings)
        : [],
    [typeQuery.data, filteredReadings],
  );

  const primarySummary = useMemo(() => summarizeTrend(points), [points]);
  const secondarySummary = useMemo(
    () => summarizeTrend(points, "secondaryValue"),
    [points],
  );
  const qualitySummary = useMemo(
    () => summarizeQuality(filteredReadings),
    [filteredReadings],
  );

  if (authLoading || typeQuery.isLoading) return <LoadingState />;
  if (typeQuery.error) return <ErrorState text="تعذر تحميل نوع القياس." />;
  if (!typeQuery.data) {
    return (
      <div className="glass mx-auto max-w-xl rounded-3xl p-8 text-center">
        <p className="font-bold">هذا القياس غير متاح حاليًا.</p>
        <Link
          to="/measurements"
          className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          العودة للقياسات
        </Link>
      </div>
    );
  }

  const type = typeQuery.data;
  const isBloodPressure = type.code === "blood_pressure";
  const unit = isBloodPressure ? "mmHg" : type.canonical_unit ?? "";
  const latestReading = allReadings[0];

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        to="/measurements"
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"
      >
        <ArrowRight className="size-4" />
        العودة إلى القياسات
      </Link>

      <PageHeader
        title={type.name_ar}
        subtitle={type.description_ar ?? "تابع قراءاتك عبر الوقت مع جودة القياس والمحتوى التوضيحي."}
      />

      <MedicalDisclaimer className="mb-6" />

      {!user ? (
        <section className="glass rounded-3xl p-6 ring-1 ring-border">
          <h2 className="font-extrabold">سجل القياسات خاص بحسابك</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            يمكنك قراءة المحتوى التوضيحي هنا، لكن عرض الرسوم والسجل يحتاج إلى تسجيل الدخول.
          </p>
          <Link
            to="/auth"
            search={{ redirect: `/measurements/${measurementTypeId}` }}
            className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
          >
            تسجيل الدخول
          </Link>
        </section>
      ) : readingsQuery.isLoading ? (
        <LoadingState />
      ) : readingsQuery.error ? (
        <ErrorState text="تعذر تحميل سجل القياسات." />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <SummaryCard
              label="آخر قراءة"
              value={latestReading ? formatReading(latestReading, type.code) : "—"}
              hint={
                latestReading
                  ? new Date(latestReading.measured_at).toLocaleString("ar-SA")
                  : "لا توجد قراءات محفوظة"
              }
            />
            <SummaryCard
              label="عدد القراءات"
              value={String(filteredReadings.length)}
              hint={rangeLabel(range)}
            />
            <SummaryCard
              label="جودة آخر قراءة"
              valueNode={
                latestReading ? (
                  <MeasurementQualityBadge quality={latestReading.quality} />
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )
              }
              hint="تعكس طريقة أخذ القياس، وليس تشخيصًا طبيًا"
            />
          </section>

          <section className="glass mt-5 rounded-3xl p-5 ring-1 ring-border md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <LineChartIcon className="size-5 text-primary" />
                  <h2 className="text-lg font-extrabold">الاتجاه الزمني</h2>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  الرسم وصفي فقط. تغير الرقم لا يعني تلقائيًا تحسنًا أو تدهورًا.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {rangeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRange(option.value)}
                    className={
                      range === option.value
                        ? "rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                        : "rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground ring-1 ring-border"
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {points.length >= 2 ? (
              <div className="mt-6 h-72 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={points} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      width={48}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "12px",
                        color: "var(--foreground)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name={isBloodPressure ? "الانقباضي" : type.name_ar}
                      unit={unit}
                      stroke="var(--primary)"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    {isBloodPressure ? (
                      <Line
                        type="monotone"
                        dataKey="secondaryValue"
                        name="الانبساطي"
                        unit="mmHg"
                        stroke="var(--accent)"
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    ) : null}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl bg-card/70 p-8 text-center ring-1 ring-border">
                <CalendarRange className="mx-auto size-8 text-primary" />
                <p className="mt-3 text-sm font-bold">نحتاج قراءتين على الأقل للرسم</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  ستظهر الاتجاهات هنا بعد تسجيل مزيد من القراءات.
                </p>
              </div>
            )}
          </section>

          <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label={isBloodPressure ? "متوسط الانقباضي" : "المتوسط"}
              value={formatNumber(primarySummary.average, unit)}
            />
            <MetricCard
              label={isBloodPressure ? "أدنى انقباضي" : "الأدنى"}
              value={formatNumber(primarySummary.min, unit)}
            />
            <MetricCard
              label={isBloodPressure ? "أعلى انقباضي" : "الأعلى"}
              value={formatNumber(primarySummary.max, unit)}
            />
            <MetricCard
              label="التغير عن القراءة السابقة"
              value={formatDelta(primarySummary.delta, unit)}
            />
          </section>

          {isBloodPressure && secondarySummary.count ? (
            <section className="mt-4 grid gap-4 md:grid-cols-3">
              <MetricCard
                label="متوسط الانبساطي"
                value={formatNumber(secondarySummary.average, "mmHg")}
              />
              <MetricCard
                label="أدنى انبساطي"
                value={formatNumber(secondarySummary.min, "mmHg")}
              />
              <MetricCard
                label="أعلى انبساطي"
                value={formatNumber(secondarySummary.max, "mmHg")}
              />
            </section>
          ) : null}

          <section className="glass mt-5 rounded-3xl p-5 ring-1 ring-border md:p-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              <h2 className="text-lg font-extrabold">جودة القياسات</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <QualityCount label="جيدة" count={qualitySummary.good} quality="good" />
              <QualityCount
                label="تحتاج مراجعة"
                count={qualitySummary.questionable}
                quality="questionable"
              />
              <QualityCount
                label="غير مقيّمة"
                count={qualitySummary.unknown}
                quality="unknown"
              />
            </div>
          </section>

          <section className="glass mt-5 overflow-hidden rounded-3xl ring-1 ring-border">
            <div className="flex items-center gap-2 p-5 md:p-6">
              <History className="size-5 text-primary" />
              <div>
                <h2 className="text-lg font-extrabold">سجل القراءات</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  آخر {Math.min(filteredReadings.length, 50)} قراءة ضمن الفترة المحددة
                </p>
              </div>
            </div>
            {!filteredReadings.length ? (
              <p className="border-t border-border p-6 text-sm text-muted-foreground">
                لا توجد قراءات في هذه الفترة.
              </p>
            ) : (
              <div className="divide-y divide-border border-t border-border">
                {filteredReadings.slice(0, 50).map((reading) => (
                  <ReadingRow
                    key={reading.id}
                    reading={reading}
                    code={type.code}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <KnowledgeSection
        loading={knowledgeQuery.isLoading}
        error={Boolean(knowledgeQuery.error)}
        data={knowledgeQuery.data}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  valueNode,
}: {
  label: string;
  value?: string;
  hint: string;
  valueNode?: React.ReactNode;
}) {
  return (
    <div className="glass rounded-3xl p-5 ring-1 ring-border">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <div className="mt-2 text-xl font-extrabold">{valueNode ?? value}</div>
      <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{hint}</p>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-extrabold">{value}</p>
    </div>
  );
}

function QualityCount({
  label,
  count,
  quality,
}: {
  label: string;
  count: number;
  quality: MeasurementReadingRow["quality"];
}) {
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
      <MeasurementQualityBadge quality={quality} />
      <p className="mt-3 text-2xl font-extrabold">{count}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ReadingRow({
  reading,
  code,
}: {
  reading: MeasurementReadingRow;
  code: string;
}) {
  const context = asMeasurementContext(reading.context);
  const quality = assessMeasurementCaptureQuality(code, context);

  return (
    <details className="group px-5 py-4 md:px-6">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
        <div>
          <p className="font-bold">{formatReading(reading, code)}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {new Date(reading.measured_at).toLocaleString("ar-SA")}
          </p>
        </div>
        <MeasurementQualityBadge quality={reading.quality} />
      </summary>

      <div className="mt-4 rounded-2xl bg-card/70 p-4 ring-1 ring-border">
        {reading.notes ? (
          <div>
            <p className="text-xs font-bold text-muted-foreground">ملاحظتك</p>
            <p className="mt-1 text-sm leading-6">{reading.notes}</p>
          </div>
        ) : null}
        {quality.issues.length ? (
          <div className={reading.notes ? "mt-4" : ""}>
            <p className="text-xs font-bold text-muted-foreground">ملاحظات جودة الالتقاط</p>
            <ul className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">
              {quality.issues.map((issue) => (
                <li key={issue}>• {captureIssueAr[issue] ?? issue}</li>
              ))}
            </ul>
          </div>
        ) : reading.quality === "good" ? (
          <p className="text-xs leading-5 text-muted-foreground">
            ظروف القياس المسجلة اجتازت فحوص جودة الالتقاط الحالية.
          </p>
        ) : (
          <p className="text-xs leading-5 text-muted-foreground">
            لا تتوفر تفاصيل كافية لإعادة تقييم جودة هذه القراءة.
          </p>
        )}
      </div>
    </details>
  );
}

function KnowledgeSection({
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
  return (
    <section className="glass mt-5 rounded-3xl p-5 ring-1 ring-border md:p-6">
      <div className="flex items-center gap-2">
        <BookOpen className="size-5 text-primary" />
        <h2 className="text-lg font-extrabold">دليل القياس والتفسير</h2>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">جارٍ تحميل المحتوى...</p>
      ) : error ? (
        <p className="mt-4 text-sm text-destructive">تعذر تحميل المحتوى التوضيحي.</p>
      ) : !data ? (
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          المحتوى التوضيحي لهذا القياس ما زال قيد المراجعة أو غير منشور.
        </p>
      ) : (
        <>
          <div className="mt-4">
            <h3 className="font-extrabold">{data.article.title_ar}</h3>
            <p className="mt-1 text-sm leading-7 text-muted-foreground">
              {data.article.summary_ar}
            </p>
          </div>
          <div className="mt-4 space-y-3">
            {data.sections.map((section) => (
              <details
                key={section.id}
                className="rounded-2xl bg-card/70 p-4 ring-1 ring-border"
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
        </>
      )}
    </section>
  );
}

function chooseKnowledgeArticle(
  articles: MeasurementKnowledgeArticleRow[],
): MeasurementKnowledgeArticleRow | null {
  if (appConfig.contentMode === "production") {
    return (
      articles.find(
        (article) =>
          article.review_status === "published" &&
          article.is_active &&
          !article.is_demo,
      ) ?? null
    );
  }

  return articles.find((article) => article.review_status !== "retired") ?? null;
}

function asMeasurementContext(value: MeasurementReadingRow["context"]): MeasurementContext {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};
  return value as MeasurementContext;
}

function formatReading(reading: MeasurementReadingRow, code: string): string {
  if (code === "blood_pressure" && reading.components && !Array.isArray(reading.components)) {
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

function formatNumber(value: number | null, unit: string): string {
  if (value == null) return "—";
  return `${round(value)} ${unit}`.trim();
}

function formatDelta(value: number | null, unit: string): string {
  if (value == null) return "—";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${round(value)} ${unit}`.trim();
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function rangeLabel(range: TrendRange): string {
  return rangeOptions.find((option) => option.value === range)?.label ?? "الفترة المحددة";
}
