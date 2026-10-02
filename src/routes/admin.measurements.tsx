import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  FlagTriangleRight,
  Gauge,
  History,
  Link2,
  Power,
  PowerOff,
  ScrollText,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAdminAccess } from "@/hooks/use-admin-access";
import {
  normalizeStatus,
  type Role,
  type WorkflowStatus,
} from "@/lib/governance";
import {
  filterMeasurementAdminQueue,
  summarizeMeasurementAdminQueue,
  type MeasurementAdminReadinessFilter,
  type MeasurementAdminStatusFilter,
} from "@/lib/measurement-admin-review-queue";
import {
  measurementReviewPriorityReason,
  sortMeasurementReviewQueue,
} from "@/lib/measurement-review-priority";
import {
  measurementReviewPermissions,
  type MeasurementReviewPermissions,
} from "@/lib/measurement-review-permissions";
import {
  measurementReleaseReadiness,
  readinessReasonAr,
  type MeasurementReleaseReadiness,
} from "@/lib/measurement-release-readiness";
import {
  diffMeasurementSnapshot,
  formatMeasurementDiffValue,
} from "@/lib/measurement-snapshot-diff";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/admin/measurements")({
  staticData: { sitemap: false },
  component: MeasurementAdminPage,
});

type EntityKind = "type" | "reference" | "red_flag" | "knowledge";
type Tab = "types" | "reference" | "red_flags" | "knowledge" | "versions";

type MeasurementTypeRow = Tables<"measurement_types">;
type MeasurementRuleRow = Tables<"measurement_reference_rules">;
type MeasurementRedFlagRow = Tables<"measurement_red_flags">;
type MeasurementKnowledgeRow = Tables<"measurement_knowledge_articles">;
type MeasurementSectionRow = Tables<"measurement_knowledge_sections">;
type MeasurementSourceRow = Tables<"measurement_sources">;
type MeasurementKnowledgeSourceRow = Tables<"measurement_knowledge_sources">;
type MedicalSourceRow = Tables<"medical_sources">;
type ContentVersionRow = Tables<"content_versions">;
type AuditRow = Tables<"audit_logs">;

type ReviewQueueItem = {
  id: string;
  kind: EntityKind;
  title: string;
  measurementTypeId: string;
  searchText: string;
  reviewStatus: WorkflowStatus;
  priority: number | null;
  submittedAt: string | null;
  updatedAt: string | null;
  readiness: MeasurementReleaseReadiness;
};

type GovernedRow =
  | MeasurementTypeRow
  | MeasurementRuleRow
  | MeasurementRedFlagRow
  | MeasurementKnowledgeRow;

type TypeRow = MeasurementTypeRow;
type RuleRow = MeasurementRuleRow;
type FlagRow = MeasurementRedFlagRow;
type KnowledgeRow = MeasurementKnowledgeRow;
type SectionRow = MeasurementSectionRow;
type KnowledgeSourceRow = MeasurementKnowledgeSourceRow;

type SourceRow = Pick<
  MedicalSourceRow,
  | "id"
  | "title"
  | "organization"
  | "url"
  | "is_active"
  | "last_verified_at"
  | "expires_review_at"
>;

type VersionRow = Pick<
  ContentVersionRow,
  | "id"
  | "entity_type"
  | "entity_id"
  | "version"
  | "status"
  | "snapshot"
  | "change_reason"
  | "published_at"
  | "created_at"
>;

const tabs: Array<{ value: Tab; label: string; icon: typeof Activity }> = [
  { value: "types", label: "أنواع القياس", icon: Gauge },
  { value: "reference", label: "القواعد المرجعية", icon: FileCheck2 },
  { value: "red_flags", label: "Red Flags", icon: FlagTriangleRight },
  { value: "knowledge", label: "المحتوى الداخلي", icon: BookOpenCheck },
  { value: "versions", label: "الإصدارات المنشورة", icon: ScrollText },
];

function MeasurementAdminPage() {
  const { t } = useI18n();
  const access = useAdminAccess();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("types");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<MeasurementAdminStatusFilter>("all");
  const [readinessFilter, setReadinessFilter] =
    useState<MeasurementAdminReadinessFilter>("all");
  const [measurementTypeFilter, setMeasurementTypeFilter] = useState("all");
  const [focusTargetId, setFocusTargetId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["admin", "measurements", "review"],
    queryFn: async () => {
      const [
        typesResult,
        referenceResult,
        flagsResult,
        knowledgeResult,
        sectionsResult,
        measurementSourcesResult,
        knowledgeSourcesResult,
        sourcesResult,
        versionsResult,
        auditResult,
      ] = await Promise.all([
        supabase.from("measurement_types").select("*").order("name_ar"),
        supabase.from("measurement_reference_rules").select("*").order("priority"),
        supabase.from("measurement_red_flags").select("*").order("priority"),
        supabase.from("measurement_knowledge_articles").select("*").order("version", { ascending: false }),
        supabase.from("measurement_knowledge_sections").select("*").order("sort_order"),
        supabase.from("measurement_sources").select("*"),
        supabase.from("measurement_knowledge_sources").select("*"),
        supabase.from("medical_sources").select("id,title,organization,url,is_active,last_verified_at,expires_review_at"),
        supabase
          .from("content_versions")
          .select("id,entity_type,entity_id,version,status,snapshot,change_reason,published_at,created_at")
          .in("entity_type", [
            "measurement_types",
            "measurement_reference_rules",
            "measurement_red_flags",
            "measurement_knowledge_articles",
          ])
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("audit_logs")
          .select(
            "id,actor_user_id,action,entity_type,entity_id,entity_version,metadata,created_at",
          )
          .in("entity_type", [
            "measurement_types",
            "measurement_reference_rules",
            "measurement_red_flags",
            "measurement_knowledge_articles",
          ])
          .order("created_at", { ascending: false })
          .limit(400),
      ]);

      const results = [
        typesResult,
        referenceResult,
        flagsResult,
        knowledgeResult,
        sectionsResult,
        measurementSourcesResult,
        knowledgeSourcesResult,
        sourcesResult,
        versionsResult,
        auditResult,
      ];
      for (const result of results) {
        if (result.error) throw result.error;
      }

      return {
        types: typesResult.data ?? [],
        reference: referenceResult.data ?? [],
        flags: flagsResult.data ?? [],
        knowledge: knowledgeResult.data ?? [],
        sections: sectionsResult.data ?? [],
        measurementSources: measurementSourcesResult.data ?? [],
        knowledgeSources: knowledgeSourcesResult.data ?? [],
        sources: (sourcesResult.data ?? []) as SourceRow[],
        versions: (versionsResult.data ?? []) as VersionRow[],
        audits: auditResult.data ?? [],
      };
    },
  });

  const transition = useMutation({
    mutationFn: async ({
      kind,
      row,
      to,
    }: {
      kind: EntityKind;
      row: GovernedRow;
      to: WorkflowStatus;
    }) => {
      const note = notes[row.id]?.trim() || row.review_note || null;
      if (to === "changes_requested" && !note) {
        throw new Error("اكتب ملاحظة توضّح التعديلات المطلوبة قبل إرسال العنصر.");
      }

      const error = await updateGovernedMeasurement(kind, row.id, {
        review_status: to,
        review_note: note,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم تحديث حالة المراجعة.");
      qc.invalidateQueries({ queryKey: ["admin", "measurements"] });
      qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : t("common.error")),
  });

  const activation = useMutation({
    mutationFn: async ({
      kind,
      row,
    }: {
      kind: EntityKind;
      row: GovernedRow;
    }) => {
      const error = await updateGovernedMeasurement(kind, row.id, {
        is_active: !row.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم تحديث حالة التفعيل.");
      qc.invalidateQueries({ queryKey: ["admin", "measurements"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : t("common.error")),
  });

  const data = query.data;
  const sourceMap = useMemo(
    () => new Map((data?.sources ?? []).map((source) => [source.id, source])),
    [data?.sources],
  );
  const typeMap = useMemo(
    () => new Map((data?.types ?? []).map((type) => [type.id, type])),
    [data?.types],
  );
  const versionMap = useMemo(() => {
    const map = new Map<string, VersionRow>();
    for (const version of data?.versions ?? []) {
      const key = `${version.entity_type}:${version.entity_id}`;
      if (!map.has(key)) map.set(key, version);
    }
    return map;
  }, [data?.versions]);
  useEffect(() => {
    if (!focusTargetId) return;

    const frame = window.requestAnimationFrame(() => {
      const element = document.getElementById(
        `measurement-review-${focusTargetId}`,
      );
      if (!element) return;

      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      setFocusTargetId(null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [focusTargetId, tab]);


  if (query.isPending) {
    return (
      <div className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  if (query.error || !data) {
    return (
      <div className="rounded-3xl bg-destructive-soft p-5 text-sm text-destructive">
        {query.error instanceof Error ? query.error.message : t("common.error")}
      </div>
    );
  }

  const counts = summarizeStatuses([
    ...data.types,
    ...data.reference,
    ...data.flags,
    ...data.knowledge,
  ]);

  const auditMap = new Map<string, AuditRow[]>();
  for (const audit of data.audits) {
    if (!audit.entity_id) continue;
    const key = `${audit.entity_type}:${audit.entity_id}`;
    const existing = auditMap.get(key) ?? [];
    existing.push(audit);
    auditMap.set(key, existing);
  }

  const typeQueueItems: ReviewQueueItem[] = data.types.map((row) => {
    const sources = data.measurementSources
      .filter((link) => link.measurement_type_id === row.id)
      .map((link) => sourceMap.get(link.source_id));

    return {
      id: row.id,
      kind: "type",
      title: row.name_ar,
      measurementTypeId: row.id,
      searchText: `${row.name_ar} ${row.name_en ?? ""} ${row.code}`,
      reviewStatus: normalizeStatus(row.review_status),
      priority: null,
      submittedAt: row.submitted_at,
      updatedAt: row.updated_at,
      readiness: measurementReleaseReadiness({
        kind: "type",
        reviewStatus: row.review_status,
        isDemo: row.is_demo,
        sourceCount: sources.length,
        activeSourceCount: sources.filter((source) => source?.is_active).length,
      }),
    };
  });

  const referenceQueueItems: ReviewQueueItem[] = data.reference.map((row) => ({
    id: row.id,
    kind: "reference",
    title: row.label_ar,
    measurementTypeId: row.measurement_type_id,
    searchText: `${row.label_ar} ${row.label_en ?? ""} ${row.code} ${typeMap.get(row.measurement_type_id)?.name_ar ?? ""}`,
    reviewStatus: normalizeStatus(row.review_status),
    priority: row.priority,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
    readiness: measurementReleaseReadiness({
      kind: "reference",
      reviewStatus: row.review_status,
      isDemo: row.is_demo,
      sourceCount: sourceMap.get(row.source_id) ? 1 : 0,
      sourceActive: sourceMap.get(row.source_id)?.is_active ?? false,
      parentReviewStatus:
        typeMap.get(row.measurement_type_id)?.review_status ?? null,
      parentActive:
        typeMap.get(row.measurement_type_id)?.is_active ?? false,
    }),
  }));

  const redFlagQueueItems: ReviewQueueItem[] = data.flags.map((row) => ({
    id: row.id,
    kind: "red_flag",
    title: row.title_ar,
    measurementTypeId: row.measurement_type_id,
    searchText: `${row.title_ar} ${row.title_en ?? ""} ${row.code} ${typeMap.get(row.measurement_type_id)?.name_ar ?? ""}`,
    reviewStatus: normalizeStatus(row.review_status),
    priority: row.priority,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
    readiness: measurementReleaseReadiness({
      kind: "red_flag",
      reviewStatus: row.review_status,
      isDemo: row.is_demo,
      sourceCount: sourceMap.get(row.source_id) ? 1 : 0,
      sourceActive: sourceMap.get(row.source_id)?.is_active ?? false,
      parentReviewStatus:
        typeMap.get(row.measurement_type_id)?.review_status ?? null,
      parentActive:
        typeMap.get(row.measurement_type_id)?.is_active ?? false,
    }),
  }));

  const knowledgeQueueItems: ReviewQueueItem[] = data.knowledge.map((row) => {
    const sources = data.knowledgeSources
      .filter((link) => link.article_id === row.id)
      .map((link) => sourceMap.get(link.source_id));
    const sectionCount = data.sections.filter(
      (section) => section.article_id === row.id,
    ).length;

    return {
      id: row.id,
      kind: "knowledge",
      title: row.title_ar,
      measurementTypeId: row.measurement_type_id,
      searchText: `${row.title_ar} ${row.title_en ?? ""} ${row.code} ${typeMap.get(row.measurement_type_id)?.name_ar ?? ""}`,
      reviewStatus: normalizeStatus(row.review_status),
      priority: null,
      submittedAt: row.submitted_at,
      updatedAt: row.updated_at,
      readiness: measurementReleaseReadiness({
        kind: "knowledge",
        reviewStatus: row.review_status,
        isDemo: row.is_demo,
        sourceCount: sources.length,
        activeSourceCount: sources.filter((source) => source?.is_active).length,
        sectionCount,
        parentReviewStatus:
          typeMap.get(row.measurement_type_id)?.review_status ?? null,
        parentActive:
          typeMap.get(row.measurement_type_id)?.is_active ?? false,
      }),
    };
  });

  const globalQueueItems = sortMeasurementReviewQueue([
    ...typeQueueItems,
    ...referenceQueueItems,
    ...redFlagQueueItems,
    ...knowledgeQueueItems,
  ]);
  const globalActiveQueue = globalQueueItems.filter(
    (item) =>
      item.reviewStatus !== "published" &&
      item.reviewStatus !== "retired",
  );

  const queueItems =
    tab === "types"
      ? typeQueueItems
      : tab === "reference"
        ? referenceQueueItems
        : tab === "red_flags"
          ? redFlagQueueItems
          : tab === "knowledge"
            ? knowledgeQueueItems
            : [];

  const queueSummary = summarizeMeasurementAdminQueue(queueItems);
  const filteredQueueItems = filterMeasurementAdminQueue(queueItems, {
    search: searchQuery,
    status: statusFilter,
    readiness: readinessFilter,
    measurementTypeId: measurementTypeFilter,
  });
  const sortedQueueItems = sortMeasurementReviewQueue(filteredQueueItems);
  const queueOrder = new Map(
    sortedQueueItems.map((item, index) => [item.id, index]),
  );
  const visibleIds = new Set(sortedQueueItems.map((item) => item.id));
  const nextReviewItem =
    sortedQueueItems.find(
      (item) =>
        item.reviewStatus !== "published" &&
        item.reviewStatus !== "retired",
    ) ?? sortedQueueItems[0];

  const openReviewItem = (item: ReviewQueueItem) => {
    setSearchQuery("");
    setStatusFilter("all");
    setReadinessFilter("all");
    setMeasurementTypeFilter("all");
    setTab(tabForReviewKind(item.kind));
    setFocusTargetId(item.id);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold">مراجعة القياسات الصحية</h2>
          <p className="mt-1 max-w-3xl text-sm leading-7 text-muted-foreground">
            راجع القياسات والقواعد والمصادر والمحتوى العربي قبل الاعتماد والنشر.
            النشر لا يفعّل القاعدة تلقائيًا؛ التفعيل خطوة إدارية منفصلة تخضع
            لحواجز المصادر والأب المنشور.
          </p>
        </div>
        <Link
          to="/admin/sources"
          className="inline-flex items-center gap-2 rounded-xl bg-card px-4 py-2.5 text-sm font-semibold text-primary ring-1 ring-border"
        >
          <Link2 className="size-4" />
          إدارة المصادر
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatusMetric label="مسودات" value={counts.draft} />
        <StatusMetric label="قيد المراجعة" value={counts.review} />
        <StatusMetric label="معتمدة" value={counts.approved} />
        <StatusMetric label="منشورة" value={counts.published} />
      </div>

      <GlobalReviewQueue
        items={globalActiveQueue.slice(0, 5)}
        total={globalActiveQueue.length}
        onOpen={openReviewItem}
      />

      <div className="glass flex flex-wrap gap-2 rounded-2xl p-2">
        {tabs.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={
              tab === value
                ? "inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground"
                : "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-primary-soft hover:text-primary"
            }
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {tab !== "versions" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatusMetric label="عناصر هذا التبويب" value={queueSummary.total} />
            <StatusMetric
              label="بدون موانع نشر"
              value={queueSummary.publishReady}
            />
            <StatusMetric
              label="بها موانع نشر"
              value={queueSummary.publishBlocked}
            />
            <StatusMetric
              label="جاهزة للتفعيل الآن"
              value={queueSummary.activationReady}
            />
          </div>

          {nextReviewItem ? (
            <section className="rounded-3xl bg-primary-soft p-5 ring-1 ring-primary/15">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-primary">
                    التالي في قائمة المراجعة
                  </p>
                  <h3 className="mt-1 font-extrabold">
                    {nextReviewItem.title}
                  </h3>
                  <p className="mt-2 max-w-2xl text-xs leading-6 text-muted-foreground">
                    {measurementReviewPriorityReason(nextReviewItem)}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    ترتيب تشغيلي داخل التبويب الحالي · الحالة:{" "}
                    {workflowStatusAr(
                      normalizeStatus(nextReviewItem.reviewStatus),
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openReviewItem(nextReviewItem)}
                  className="rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground"
                >
                  فتح العنصر التالي
                </button>
              </div>
            </section>
          ) : null}

          <div className="glass rounded-3xl p-4">
            <div className="mb-3 flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-primary" />
              <p className="text-sm font-extrabold">فرز قائمة المراجعة</p>
              <span className="text-[10px] text-muted-foreground">
                {filteredQueueItems.length} من {queueSummary.total}
              </span>
            </div>
            <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_repeat(3,minmax(150px,220px))_auto]">
              <label className="relative">
                <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="ابحث بالاسم أو الكود..."
                  className="h-11 w-full rounded-xl border border-border bg-background ps-10 pe-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <FilterSelect
                label="الحالة"
                value={statusFilter}
                onChange={(value) =>
                  setStatusFilter(value as MeasurementAdminStatusFilter)
                }
                options={[
                  ["all", "كل الحالات"],
                  ["draft", "مسودة"],
                  ["in_review", "قيد المراجعة"],
                  ["changes_requested", "تعديلات مطلوبة"],
                  ["approved", "معتمد"],
                  ["published", "منشور"],
                  ["retired", "متقاعد"],
                ]}
              />

              <FilterSelect
                label="الجاهزية"
                value={readinessFilter}
                onChange={(value) =>
                  setReadinessFilter(value as MeasurementAdminReadinessFilter)
                }
                options={[
                  ["all", "كل حالات الجاهزية"],
                  ["publish_ready", "بدون موانع نشر"],
                  ["publish_blocked", "بها موانع نشر"],
                  ["activation_ready", "جاهز للتفعيل"],
                  ["activation_blocked", "غير جاهز للتفعيل"],
                ]}
              />

              <FilterSelect
                label="نوع القياس"
                value={measurementTypeFilter}
                onChange={setMeasurementTypeFilter}
                options={[
                  ["all", "كل أنواع القياس"],
                  ...data.types.map((type) => [type.id, type.name_ar] as [string, string]),
                ]}
              />

              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setReadinessFilter("all");
                  setMeasurementTypeFilter("all");
                }}
                className="h-11 rounded-xl bg-card px-4 text-xs font-bold text-primary ring-1 ring-border"
              >
                إعادة الضبط
              </button>
            </div>
          </div>
        </>
      ) : null}

      {tab === "types" ? (
        <div className="space-y-3">
          {sortRowsByQueueOrder(
            data.types.filter((row) => visibleIds.has(row.id)),
            queueOrder,
          ).map((row) => {
            const sources = data.measurementSources
              .filter((link) => link.measurement_type_id === row.id)
              .map((link) => ({ link, source: sourceMap.get(link.source_id) }));
            const refs = data.reference.filter((rule) => rule.measurement_type_id === row.id);
            const flags = data.flags.filter((flag) => flag.measurement_type_id === row.id);
            const articles = data.knowledge.filter((article) => article.measurement_type_id === row.id);

            return (
              <ReviewCard
                key={row.id}
                kind="type"
                row={row}
                title={row.name_ar}
                subtitle={`${row.code} · ${row.value_kind} · ${row.canonical_unit ?? "بدون وحدة"}`}
                accessRoles={access.roles as Role[]}
                readiness={measurementReleaseReadiness({
                  kind: "type",
                  reviewStatus: row.review_status,
                  isDemo: row.is_demo,
                  sourceCount: sources.length,
                  activeSourceCount: sources.filter(({ source }) => source?.is_active).length,
                })}
                note={notes[row.id] ?? row.review_note ?? ""}
                setNote={(value) => setNotes((prev) => ({ ...prev, [row.id]: value }))}
                onTransition={(to) => transition.mutate({ kind: "type", row, to })}
                onToggle={() => activation.mutate({ kind: "type", row })}
                busy={transition.isPending || activation.isPending}
                audits={auditMap.get(`measurement_types:${row.id}`) ?? []}
                previousVersion={
                  versionMap.get(`measurement_types:${row.id}`)
                }
              >
                {row.description_ar ? (
                  <p className="text-sm leading-7 text-muted-foreground">{row.description_ar}</p>
                ) : null}
                <div className="mt-4 grid gap-2 sm:grid-cols-4">
                  <MiniMetric label="المصادر" value={sources.length} warn={!sources.length} />
                  <MiniMetric label="القواعد" value={refs.length} />
                  <MiniMetric label="Red Flags" value={flags.length} />
                  <MiniMetric label="المقالات" value={articles.length} />
                </div>
                <SourceList
                  title="مصادر نوع القياس"
                  items={sources.map(({ link, source }) => ({
                    id: link.id,
                    role: link.use_scope,
                    source,
                  }))}
                />
              </ReviewCard>
            );
          })}
        </div>
      ) : null}

      {tab === "reference" ? (
        <div className="space-y-3">
          {sortRowsByQueueOrder(
            data.reference.filter((row) => visibleIds.has(row.id)),
            queueOrder,
          ).map((row) => (
            <ReviewCard
              key={row.id}
              kind="reference"
              row={row}
              title={row.label_ar}
              subtitle={`${typeMap.get(row.measurement_type_id)?.name_ar ?? "قياس"} · ${row.code}`}
              accessRoles={access.roles as Role[]}
              readiness={measurementReleaseReadiness({
                kind: "reference",
                reviewStatus: row.review_status,
                isDemo: row.is_demo,
                sourceCount: sourceMap.get(row.source_id) ? 1 : 0,
                sourceActive: sourceMap.get(row.source_id)?.is_active ?? false,
                parentReviewStatus:
                  typeMap.get(row.measurement_type_id)?.review_status ?? null,
                parentActive:
                  typeMap.get(row.measurement_type_id)?.is_active ?? false,
              })}
              note={notes[row.id] ?? row.review_note ?? ""}
              setNote={(value) => setNotes((prev) => ({ ...prev, [row.id]: value }))}
              onTransition={(to) => transition.mutate({ kind: "reference", row, to })}
              onToggle={() => activation.mutate({ kind: "reference", row })}
              busy={transition.isPending || activation.isPending}
              audits={
                auditMap.get(`measurement_reference_rules:${row.id}`) ?? []
              }
              previousVersion={
                versionMap.get(`measurement_reference_rules:${row.id}`)
              }
            >
              <div className="grid gap-2 sm:grid-cols-3">
                <TextMetric label="Interpretation" value={row.interpretation_code} />
                <TextMetric label="Care level" value={row.care_level ?? "لا يوجد"} />
                <TextMetric label="Priority" value={String(row.priority)} />
              </div>
              <PredicatePreview value={row.predicate} />
              <SingleSource source={sourceMap.get(row.source_id)} />
            </ReviewCard>
          ))}
        </div>
      ) : null}

      {tab === "red_flags" ? (
        <div className="space-y-3">
          {sortRowsByQueueOrder(
            data.flags.filter((row) => visibleIds.has(row.id)),
            queueOrder,
          ).map((row) => (
            <ReviewCard
              key={row.id}
              kind="red_flag"
              row={row}
              title={row.title_ar}
              subtitle={`${typeMap.get(row.measurement_type_id)?.name_ar ?? "قياس"} · ${row.code}`}
              accessRoles={access.roles as Role[]}
              readiness={measurementReleaseReadiness({
                kind: "red_flag",
                reviewStatus: row.review_status,
                isDemo: row.is_demo,
                sourceCount: sourceMap.get(row.source_id) ? 1 : 0,
                sourceActive: sourceMap.get(row.source_id)?.is_active ?? false,
                parentReviewStatus:
                  typeMap.get(row.measurement_type_id)?.review_status ?? null,
                parentActive:
                  typeMap.get(row.measurement_type_id)?.is_active ?? false,
              })}
              note={notes[row.id] ?? row.review_note ?? ""}
              setNote={(value) => setNotes((prev) => ({ ...prev, [row.id]: value }))}
              onTransition={(to) => transition.mutate({ kind: "red_flag", row, to })}
              onToggle={() => activation.mutate({ kind: "red_flag", row })}
              busy={transition.isPending || activation.isPending}
              audits={auditMap.get(`measurement_red_flags:${row.id}`) ?? []}
              previousVersion={
                versionMap.get(`measurement_red_flags:${row.id}`)
              }
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <TextMetric label="مستوى الرعاية" value={row.care_level} />
                <TextMetric label="الأولوية" value={String(row.priority)} />
              </div>
              <PredicatePreview value={row.predicate} />
              <SingleSource source={sourceMap.get(row.source_id)} />
            </ReviewCard>
          ))}
        </div>
      ) : null}

      {tab === "knowledge" ? (
        <div className="space-y-3">
          {sortRowsByQueueOrder(
            data.knowledge.filter((row) => visibleIds.has(row.id)),
            queueOrder,
          ).map((row) => {
            const sections = data.sections.filter((section) => section.article_id === row.id);
            const sources = data.knowledgeSources
              .filter((link) => link.article_id === row.id)
              .map((link) => ({
                id: `${link.article_id}:${link.source_id}:${link.source_role}`,
                role: link.source_role,
                source: sourceMap.get(link.source_id),
              }));

            return (
              <ReviewCard
                key={row.id}
                kind="knowledge"
                row={row}
                title={row.title_ar}
                subtitle={`${typeMap.get(row.measurement_type_id)?.name_ar ?? "قياس"} · ${row.audience} · ${row.code}`}
                accessRoles={access.roles as Role[]}
                readiness={measurementReleaseReadiness({
                  kind: "knowledge",
                  reviewStatus: row.review_status,
                  isDemo: row.is_demo,
                  sourceCount: sources.length,
                  activeSourceCount: sources.filter(({ source }) => source?.is_active).length,
                  sectionCount: sections.length,
                  parentReviewStatus:
                    typeMap.get(row.measurement_type_id)?.review_status ?? null,
                  parentActive:
                    typeMap.get(row.measurement_type_id)?.is_active ?? false,
                })}
                note={notes[row.id] ?? row.review_note ?? ""}
                setNote={(value) => setNotes((prev) => ({ ...prev, [row.id]: value }))}
                onTransition={(to) => transition.mutate({ kind: "knowledge", row, to })}
                onToggle={() => activation.mutate({ kind: "knowledge", row })}
                busy={transition.isPending || activation.isPending}
                audits={
                  auditMap.get(`measurement_knowledge_articles:${row.id}`) ?? []
                }
                previousVersion={
                  versionMap.get(
                    `measurement_knowledge_articles:${row.id}`,
                  )
                }
              >
                <p className="text-sm leading-7 text-muted-foreground">{row.summary_ar}</p>
                <div className="mt-4 space-y-2">
                  {sections.map((section) => (
                    <details
                      key={section.id}
                      className="rounded-2xl bg-background/60 p-4 ring-1 ring-border"
                    >
                      <summary className="cursor-pointer text-sm font-bold">
                        {section.title_ar}
                        <span className="ms-2 text-[10px] font-normal text-muted-foreground">
                          {section.section_type}
                        </span>
                      </summary>
                      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground">
                        {section.body_ar}
                      </p>
                    </details>
                  ))}
                </div>
                <SourceList title="مصادر المقال" items={sources} />
              </ReviewCard>
            );
          })}
        </div>
      ) : null}

      {tab === "versions" ? (
        <VersionHistory versions={data.versions} />
      ) : null}
    </div>
  );
}

function GlobalReviewQueue({
  items,
  total,
  onOpen,
}: {
  items: ReviewQueueItem[];
  total: number;
  onOpen: (item: ReviewQueueItem) => void;
}) {
  return (
    <section className="glass rounded-3xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold">طابور المراجعة الموحد</p>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            ترتيب تشغيلي عبر أنواع القياس والقواعد وRed Flags والمحتوى الداخلي.
            لا يغيّر هذا الترتيب أي قاعدة أو أولوية سريرية.
          </p>
        </div>
        <span className="rounded-full bg-primary-soft px-3 py-1 text-[10px] font-extrabold text-primary">
          {total} عنصر نشط في دورة المراجعة
        </span>
      </div>

      {!items.length ? (
        <div className="mt-4 rounded-2xl bg-success-soft/60 p-4 text-xs text-success ring-1 ring-success/15">
          لا توجد عناصر غير منشورة أو غير متقاعدة في طابور المراجعة الحالي.
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpen(item)}
              className="flex w-full items-start gap-3 rounded-2xl bg-background/70 p-3 text-start ring-1 ring-border transition hover:ring-primary/30"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary-soft text-xs font-extrabold text-primary">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-extrabold">
                  {item.title}
                </span>
                <span className="mt-1 block text-[10px] text-muted-foreground">
                  {reviewKindAr(item.kind)} ·{" "}
                  {workflowStatusAr(
                    normalizeStatus(item.reviewStatus),
                  )}
                </span>
                <span className="mt-1 block text-[10px] leading-5 text-muted-foreground">
                  {measurementReviewPriorityReason(item)}
                </span>
              </span>
              <span className="shrink-0 text-[10px] font-bold text-primary">
                فتح
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function ReviewCard({
  kind,
  row,
  title,
  subtitle,
  accessRoles,
  readiness,
  note,
  setNote,
  onTransition,
  onToggle,
  busy,
  audits,
  previousVersion,
  children,
}: {
  kind: EntityKind;
  row: GovernedRow;
  title: string;
  subtitle: string;
  accessRoles: Role[];
  readiness: MeasurementReleaseReadiness;
  note: string;
  setNote: (value: string) => void;
  onTransition: (to: WorkflowStatus) => void;
  onToggle: () => void;
  busy: boolean;
  audits: AuditRow[];
  previousVersion?: VersionRow;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const status = normalizeStatus(row.review_status);
  const permissions = measurementReviewPermissions(
    accessRoles,
    status,
  );
  const transitions = permissions.transitions;

  return (
    <article
      id={`measurement-review-${row.id}`}
      className="glass scroll-mt-24 rounded-3xl p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-extrabold">{title}</h3>
            <StatusBadge status={status} />
            {row.is_active ? (
              <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-bold text-success">
                Active
              </span>
            ) : (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                Inactive
              </span>
            )}
            {row.is_demo ? (
              <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-bold text-warning">
                Demo
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {subtitle} · v{row.version}
          </p>
        </div>

        {permissions.canToggleActivation ? (
          <button
            type="button"
            disabled={
              busy ||
              (!row.is_active && readiness.activationBlockers.length > 0)
            }
            title={
              !row.is_active && readiness.activationBlockers.length
                ? readinessReasonAr(readiness.activationBlockers[0])
                : undefined
            }
            onClick={onToggle}
            className={
              row.is_active
                ? "inline-flex items-center gap-2 rounded-xl bg-card px-3 py-2 text-xs font-bold text-destructive ring-1 ring-border"
                : "inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
            }
          >
            {row.is_active ? <PowerOff className="size-4" /> : <Power className="size-4" />}
            {row.is_active ? "إيقاف" : "تفعيل"}
          </button>
        ) : null}
      </div>

      <ReadinessPanel readiness={readiness} />

      <div className="mt-4">{children}</div>

      <SnapshotDiff current={row} previousVersion={previousVersion} />

      <div className="mt-4 rounded-2xl bg-card/70 p-4 ring-1 ring-border">
        <ReviewPermissionSummary permissions={permissions} />

        <label className="mt-4 block text-xs font-bold text-muted-foreground">
          ملاحظة المراجعة
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="mt-2 min-h-20 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-primary/20"
            placeholder={
              status === "in_review"
                ? "اكتب ملاحظتك، وهي مطلوبة عند طلب تعديلات."
                : "ملاحظة اختيارية تُحفظ مع قرار المراجعة."
            }
          />
        </label>

        <div className="mt-3 flex flex-wrap gap-2">
          {transitions.map((to) => (
            <button
              key={to}
              type="button"
              disabled={
                busy ||
                (to === "changes_requested" && !note.trim()) ||
                (to === "published" && readiness.publishBlockers.length > 0)
              }
              title={
                to === "published" && readiness.publishBlockers.length
                  ? readinessReasonAr(readiness.publishBlockers[0])
                  : undefined
              }
              onClick={() => onTransition(to)}
              className="rounded-xl bg-background px-3 py-2 text-xs font-bold text-primary ring-1 ring-border disabled:opacity-40"
            >
              {t(`action.${to}` as never)}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
          {row.reviewed_at ? <span>المراجعة: {formatDate(row.reviewed_at)}</span> : null}
          {row.approved_at ? <span>الاعتماد: {formatDate(row.approved_at)}</span> : null}
          {row.published_at ? <span>النشر: {formatDate(row.published_at)}</span> : null}
        </div>
      </div>

      <AuditTimeline audits={audits} />
    </article>
  );
}

function ReviewPermissionSummary({
  permissions,
}: {
  permissions: MeasurementReviewPermissions;
}) {
  const messages: string[] = [];

  if (permissions.canReviewClinicalContent) {
    messages.push("يمكنك اعتماد المحتوى أو طلب تعديلات.");
  }
  if (permissions.canPublish) {
    messages.push("يمكنك نشر النسخة المعتمدة.");
  }
  if (
    permissions.canEditClinicalContent &&
    !permissions.canReviewClinicalContent &&
    !permissions.canPublish
  ) {
    messages.push("يمكنك تجهيز المحتوى وإرساله للمراجعة.");
  }
  if (permissions.canToggleActivation) {
    messages.push("يمكنك تشغيل أو إيقاف المحتوى المنشور.");
  }

  if (!messages.length) {
    messages.push("لا توجد إجراءات حوكمة متاحة لدورك على هذه الحالة.");
  }

  return (
    <div className="rounded-xl bg-background/70 px-3 py-2.5 text-[10px] leading-5 text-muted-foreground ring-1 ring-border">
      <span className="font-extrabold text-foreground">
        صلاحياتك على هذا العنصر:
      </span>{" "}
      {messages.join(" ")}
    </div>
  );
}

function StatusBadge({ status }: { status: WorkflowStatus }) {
  const classes =
    status === "published"
      ? "bg-success-soft text-success"
      : status === "approved"
        ? "bg-primary-soft text-primary"
        : status === "changes_requested"
          ? "bg-destructive-soft text-destructive"
          : status === "in_review"
            ? "bg-warning-soft text-warning"
            : "bg-muted text-muted-foreground";

  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${classes}`}>
      {workflowStatusAr(status)}
    </span>
  );
}

function ReadinessPanel({
  readiness,
}: {
  readiness: MeasurementReleaseReadiness;
}) {
  const publishReady = readiness.publishBlockers.length === 0;
  const activationReady = readiness.activationBlockers.length === 0;

  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      <ReadinessBox
        title="جاهزية النشر"
        ready={publishReady}
        blockers={readiness.publishBlockers}
      />
      <ReadinessBox
        title="جاهزية التفعيل"
        ready={activationReady}
        blockers={readiness.activationBlockers}
      />
    </div>
  );
}

function ReadinessBox({
  title,
  ready,
  blockers,
}: {
  title: string;
  ready: boolean;
  blockers: MeasurementReleaseReadiness["publishBlockers"];
}) {
  return (
    <div
      className={
        ready
          ? "rounded-2xl bg-success-soft/60 p-4 ring-1 ring-success/15"
          : "rounded-2xl bg-warning-soft/60 p-4 ring-1 ring-warning/15"
      }
    >
      <div className="flex items-center gap-2">
        {ready ? (
          <CheckCircle2 className="size-4 text-success" />
        ) : (
          <AlertTriangle className="size-4 text-warning" />
        )}
        <p className="text-xs font-extrabold">{title}</p>
      </div>
      {ready ? (
        <p className="mt-2 text-xs text-muted-foreground">
          لا توجد موانع حوكمة ظاهرة في البيانات الحالية.
        </p>
      ) : (
        <ul className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">
          {blockers.map((reason) => (
            <li key={reason}>• {readinessReasonAr(reason)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function tabForReviewKind(kind: EntityKind): Tab {
  switch (kind) {
    case "type":
      return "types";
    case "reference":
      return "reference";
    case "red_flag":
      return "red_flags";
    case "knowledge":
      return "knowledge";
  }
}

function reviewKindAr(kind: EntityKind): string {
  switch (kind) {
    case "type":
      return "نوع قياس";
    case "reference":
      return "قاعدة مرجعية";
    case "red_flag":
      return "Red Flag";
    case "knowledge":
      return "مقال داخلي";
  }
}

function workflowStatusAr(status: WorkflowStatus): string {
  switch (status) {
    case "draft":
      return "مسودة";
    case "in_review":
      return "قيد المراجعة";
    case "changes_requested":
      return "تعديلات مطلوبة";
    case "approved":
      return "معتمد";
    case "published":
      return "منشور";
    case "retired":
      return "متقاعد";
  }
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="text-[10px] font-bold text-muted-foreground">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/20"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function SnapshotDiff({
  current,
  previousVersion,
}: {
  current: GovernedRow;
  previousVersion?: VersionRow;
}) {
  if (!previousVersion) {
    return (
      <div className="mt-4 rounded-2xl bg-background/60 p-4 text-xs text-muted-foreground ring-1 ring-border">
        <p className="font-extrabold text-foreground">
          مقارنة بآخر نسخة منشورة
        </p>
        <p className="mt-2 leading-6">
          لا يوجد Snapshot منشور سابق لنفس العنصر؛ هذه المراجعة تُعامل كنسخة
          أولى من ناحية المقارنة.
        </p>
      </div>
    );
  }

  const changes = diffMeasurementSnapshot(
    current,
    previousVersion.snapshot,
  );

  return (
    <details
      className="mt-4 rounded-2xl bg-background/60 p-4 ring-1 ring-border"
      open={changes.length > 0 && current.review_status !== "published"}
    >
      <summary className="cursor-pointer text-xs font-extrabold">
        مقارنة بآخر Snapshot منشور · {changes.length} تغيير
        <span className="ms-2 text-[10px] font-normal text-muted-foreground">
          v{previousVersion.version} ·{" "}
          {formatDate(
            previousVersion.published_at ?? previousVersion.created_at,
          )}
        </span>
      </summary>

      {!changes.length ? (
        <p className="mt-3 text-xs leading-6 text-muted-foreground">
          لا توجد فروق في حقول المحتوى بعد استبعاد بيانات الحوكمة والتواريخ.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {changes.slice(0, 30).map((change) => (
            <div
              key={change.path}
              className="rounded-xl bg-card p-3 ring-1 ring-border"
            >
              <p
                dir="ltr"
                className="text-[10px] font-extrabold text-primary"
              >
                {change.path}
              </p>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <DiffValue
                  label="قبل"
                  value={formatMeasurementDiffValue(change.before)}
                />
                <DiffValue
                  label="الآن"
                  value={formatMeasurementDiffValue(change.after)}
                />
              </div>
            </div>
          ))}
          {changes.length > 30 ? (
            <p className="text-[10px] text-muted-foreground">
              تم عرض أول 30 تغييرًا من أصل {changes.length}.
            </p>
          ) : null}
        </div>
      )}
    </details>
  );
}

function DiffValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-background/70 p-2.5">
      <p className="text-[10px] font-bold text-muted-foreground">
        {label}
      </p>
      <pre
        dir="auto"
        className="mt-1 whitespace-pre-wrap break-words font-sans text-xs leading-5"
      >
        {value}
      </pre>
    </div>
  );
}

function AuditTimeline({ audits }: { audits: AuditRow[] }) {
  return (
    <details className="mt-4 rounded-2xl bg-background/60 p-4 ring-1 ring-border">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-extrabold">
        <History className="size-4 text-primary" />
        سجل التدقيق
        <span className="text-[10px] font-normal text-muted-foreground">
          {audits.length} حدث
        </span>
      </summary>

      {!audits.length ? (
        <p className="mt-3 text-xs text-muted-foreground">
          لا توجد أحداث مسجلة لهذا العنصر حتى الآن.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {audits.slice(0, 8).map((audit) => (
            <div
              key={audit.id}
              className="border-s-2 border-border ps-3 text-xs"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-extrabold">
                  {auditActionAr(audit.action)}
                </span>
                {audit.entity_version != null ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    v{audit.entity_version}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {formatDate(audit.created_at)}
                {" · "}
                {audit.actor_user_id
                  ? `المستخدم ${audit.actor_user_id.slice(0, 8)}…`
                  : "النظام"}
              </p>
              {hasAuditMetadata(audit.metadata) ? (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[10px] font-bold text-primary">
                    تفاصيل الحدث
                  </summary>
                  <pre
                    dir="ltr"
                    className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-card p-3 text-[10px] leading-5 text-muted-foreground"
                  >
                    {JSON.stringify(audit.metadata, null, 2)}
                  </pre>
                </details>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </details>
  );
}

function auditActionAr(action: string): string {
  switch (action) {
    case "submit_review":
      return "إرسال للمراجعة";
    case "request_changes":
      return "طلب تعديلات";
    case "approve":
      return "اعتماد";
    case "publish":
      return "نشر";
    case "retire":
      return "إيقاف/تقاعد";
    case "restore":
      return "استعادة";
    case "insert":
    case "create":
      return "إنشاء";
    case "delete":
      return "حذف";
    case "update":
      return "تحديث";
    default:
      return action;
  }
}

function hasAuditMetadata(metadata: AuditRow["metadata"]): boolean {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return false;
  }
  return Object.keys(metadata).length > 0;
}

function SourceList({
  title,
  items,
}: {
  title: string;
  items: Array<{ id: string; role: string; source?: SourceRow }>;
}) {
  return (
    <div className="mt-4">
      <p className="text-xs font-bold text-muted-foreground">{title}</p>
      {!items.length ? (
        <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-warning">
          <AlertTriangle className="size-4" />
          لا يوجد مصدر مرتبط.
        </p>
      ) : (
        <div className="mt-2 space-y-2">
          {items.map(({ id, role, source }) => (
            <div
              key={id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-background/70 px-3 py-2.5 text-xs ring-1 ring-border"
            >
              <div>
                <p className="font-bold">{source?.title ?? "مصدر غير متاح"}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {source?.organization ?? "—"} · {role}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {source?.is_active === false ? (
                  <span className="text-[10px] font-bold text-warning">غير نشط</span>
                ) : (
                  <CheckCircle2 className="size-4 text-success" />
                )}
                {source?.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary"
                    aria-label="فتح المصدر"
                  >
                    <ExternalLink className="size-4" />
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SingleSource({ source }: { source?: SourceRow }) {
  return (
    <SourceList
      title="المصدر"
      items={source ? [{ id: source.id, role: "primary", source }] : []}
    />
  );
}

function PredicatePreview({ value }: { value: unknown }) {
  return (
    <details className="mt-4 rounded-2xl bg-background/60 p-4 ring-1 ring-border">
      <summary className="cursor-pointer text-xs font-bold">
        عرض منطق القاعدة
      </summary>
      <pre
        dir="ltr"
        className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-5 text-muted-foreground"
      >
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}

function VersionHistory({ versions }: { versions: VersionRow[] }) {
  if (!versions.length) {
    return (
      <div className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">
        لا توجد Snapshots منشورة للقياسات حتى الآن.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {versions.map((version) => {
        const snapshot =
          version.snapshot &&
          typeof version.snapshot === "object" &&
          !Array.isArray(version.snapshot)
            ? (version.snapshot as Record<string, unknown>)
            : {};
        const label = String(
          snapshot["name_ar"] ??
            snapshot["label_ar"] ??
            snapshot["title_ar"] ??
            snapshot["code"] ??
            version.entity_id,
        );

        return (
          <article key={version.id} className="glass rounded-3xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-bold">{label}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {version.entity_type} · v{version.version} · {version.status}
                </p>
                {version.change_reason ? (
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {version.change_reason}
                  </p>
                ) : null}
              </div>
              <span className="rounded-full bg-success-soft px-2.5 py-1 text-[10px] font-bold text-success">
                Snapshot
              </span>
            </div>
            <p className="mt-3 text-[10px] text-muted-foreground">
              {formatDate(version.published_at ?? version.created_at)}
            </p>
          </article>
        );
      })}
    </div>
  );
}

function MiniMetric({
  label,
  value,
  warn = false,
}: {
  label: string;
  value: number;
  warn?: boolean;
}) {
  return (
    <div className="rounded-xl bg-background/70 p-3 ring-1 ring-border">
      <p className={warn ? "font-extrabold text-warning" : "font-extrabold"}>{value}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function TextMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-background/70 p-3 ring-1 ring-border">
      <p className="text-[10px] font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 text-xs font-semibold">{value}</p>
    </div>
  );
}

function StatusMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function summarizeStatuses(rows: GovernedRow[]) {
  return rows.reduce(
    (acc, row) => {
      const status = normalizeStatus(row.review_status);
      if (status === "published") acc.published += 1;
      else if (status === "approved") acc.approved += 1;
      else if (status === "in_review") acc.review += 1;
      else acc.draft += 1;
      return acc;
    },
    { draft: 0, review: 0, approved: 0, published: 0 },
  );
}

type GovernedUpdate = {
  review_status?: Tables<"measurement_types">["review_status"];
  review_note?: string | null;
  is_active?: boolean;
};

async function updateGovernedMeasurement(
  kind: EntityKind,
  id: string,
  update: GovernedUpdate,
) {
  switch (kind) {
    case "type": {
      const { error } = await supabase
        .from("measurement_types")
        .update(update)
        .eq("id", id);
      return error;
    }
    case "reference": {
      const { error } = await supabase
        .from("measurement_reference_rules")
        .update(update)
        .eq("id", id);
      return error;
    }
    case "red_flag": {
      const { error } = await supabase
        .from("measurement_red_flags")
        .update(update)
        .eq("id", id);
      return error;
    }
    case "knowledge": {
      const { error } = await supabase
        .from("measurement_knowledge_articles")
        .update(update)
        .eq("id", id);
      return error;
    }
  }
}

function sortRowsByQueueOrder<T extends { id: string }>(
  rows: T[],
  queueOrder: Map<string, number>,
): T[] {
  return [...rows].sort(
    (a, b) =>
      (queueOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
      (queueOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER),
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("ar-SA");
}
