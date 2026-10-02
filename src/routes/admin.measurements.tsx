import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  FlagTriangleRight,
  Gauge,
  Link2,
  Power,
  PowerOff,
  ScrollText,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAdminAccess } from "@/hooks/use-admin-access";
import {
  availableTransitions,
  normalizeStatus,
  type Role,
  type WorkflowStatus,
} from "@/lib/governance";
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

      {tab === "types" ? (
        <div className="space-y-3">
          {data.types.map((row) => {
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
                isAdmin={access.isAdmin}
                note={notes[row.id] ?? row.review_note ?? ""}
                setNote={(value) => setNotes((prev) => ({ ...prev, [row.id]: value }))}
                onTransition={(to) => transition.mutate({ kind: "type", row, to })}
                onToggle={() => activation.mutate({ kind: "type", row })}
                busy={transition.isPending || activation.isPending}
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
          {data.reference.map((row) => (
            <ReviewCard
              key={row.id}
              kind="reference"
              row={row}
              title={row.label_ar}
              subtitle={`${typeMap.get(row.measurement_type_id)?.name_ar ?? "قياس"} · ${row.code}`}
              accessRoles={access.roles as Role[]}
              isAdmin={access.isAdmin}
              note={notes[row.id] ?? row.review_note ?? ""}
              setNote={(value) => setNotes((prev) => ({ ...prev, [row.id]: value }))}
              onTransition={(to) => transition.mutate({ kind: "reference", row, to })}
              onToggle={() => activation.mutate({ kind: "reference", row })}
              busy={transition.isPending || activation.isPending}
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
          {data.flags.map((row) => (
            <ReviewCard
              key={row.id}
              kind="red_flag"
              row={row}
              title={row.title_ar}
              subtitle={`${typeMap.get(row.measurement_type_id)?.name_ar ?? "قياس"} · ${row.code}`}
              accessRoles={access.roles as Role[]}
              isAdmin={access.isAdmin}
              note={notes[row.id] ?? row.review_note ?? ""}
              setNote={(value) => setNotes((prev) => ({ ...prev, [row.id]: value }))}
              onTransition={(to) => transition.mutate({ kind: "red_flag", row, to })}
              onToggle={() => activation.mutate({ kind: "red_flag", row })}
              busy={transition.isPending || activation.isPending}
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
          {data.knowledge.map((row) => {
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
                isAdmin={access.isAdmin}
                note={notes[row.id] ?? row.review_note ?? ""}
                setNote={(value) => setNotes((prev) => ({ ...prev, [row.id]: value }))}
                onTransition={(to) => transition.mutate({ kind: "knowledge", row, to })}
                onToggle={() => activation.mutate({ kind: "knowledge", row })}
                busy={transition.isPending || activation.isPending}
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

function ReviewCard({
  kind,
  row,
  title,
  subtitle,
  accessRoles,
  isAdmin,
  note,
  setNote,
  onTransition,
  onToggle,
  busy,
  children,
}: {
  kind: EntityKind;
  row: GovernedRow;
  title: string;
  subtitle: string;
  accessRoles: Role[];
  isAdmin: boolean;
  note: string;
  setNote: (value: string) => void;
  onTransition: (to: WorkflowStatus) => void;
  onToggle: () => void;
  busy: boolean;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const status = normalizeStatus(row.review_status);
  const transitions = availableTransitions(accessRoles, status);

  return (
    <article className="glass rounded-3xl p-5">
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

        {isAdmin && status === "published" ? (
          <button
            type="button"
            disabled={busy}
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

      <div className="mt-4">{children}</div>

      <div className="mt-4 rounded-2xl bg-card/70 p-4 ring-1 ring-border">
        <label className="block text-xs font-bold text-muted-foreground">
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
              disabled={busy || (to === "changes_requested" && !note.trim())}
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
    </article>
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
      {status}
    </span>
  );
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

function formatDate(value: string) {
  return new Date(value).toLocaleString("ar-SA");
}
