import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Link2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n";
import { normalizeStatus } from "@/lib/governance";

export const Route = createFileRoute("/admin/")({ component: AdminDashboard });

type CoverageRow = { id: string; is_active: boolean | null; review_status: string | null };
type SourceRow = { id: string; is_active: boolean | null; last_verified_at: string | null; expires_review_at: string | null };

function AdminDashboard() {
  const { t, lang } = useI18n();
  const q = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => {
      const tables = ["symptoms", "conditions", "questions", "red_flags", "first_aid_topics", "medical_sources"] as const;
      const pairs = await Promise.all(tables.map(async (table) => {
        const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
        if (error) throw error;
        return [table, count ?? 0] as const;
      }));

      const [
        audit,
        conditions,
        questions,
        redFlags,
        firstAid,
        sources,
        conditionSources,
        redFlagSources,
        firstAidSources,
      ] = await Promise.all([
        supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(8),
        supabase.from("conditions").select("id,is_active,review_status"),
        supabase.from("questions").select("id,is_active,review_status"),
        supabase.from("red_flags").select("id,is_active,review_status"),
        supabase.from("first_aid_topics").select("id,is_active,review_status"),
        supabase.from("medical_sources").select("id,is_active,last_verified_at,expires_review_at"),
        supabase.from("condition_sources").select("condition_id"),
        supabase.from("red_flag_sources").select("red_flag_id"),
        supabase.from("first_aid_sources").select("first_aid_topic_id"),
      ]);

      for (const result of [audit, conditions, questions, redFlags, firstAid, sources, conditionSources, redFlagSources, firstAidSources]) {
        if (result.error) throw result.error;
      }

      const governed = [
        ...((conditions.data ?? []) as CoverageRow[]),
        ...((questions.data ?? []) as CoverageRow[]),
        ...((redFlags.data ?? []) as CoverageRow[]),
        ...((firstAid.data ?? []) as CoverageRow[]),
      ].filter((row) => row.is_active !== false);

      const statusCounts = governed.reduce(
        (acc, row) => {
          const status = normalizeStatus(row.review_status);
          if (status === "published") acc.published += 1;
          else if (status === "in_review" || status === "approved") acc.inReview += 1;
          else acc.draft += 1;
          return acc;
        },
        { published: 0, inReview: 0, draft: 0 },
      );

      const conditionLinkIds = new Set((conditionSources.data ?? []).map((row) => row.condition_id));
      const redFlagLinkIds = new Set((redFlagSources.data ?? []).map((row) => row.red_flag_id));
      const firstAidLinkIds = new Set((firstAidSources.data ?? []).map((row) => row.first_aid_topic_id));
      const activeConditions = ((conditions.data ?? []) as CoverageRow[]).filter((row) => row.is_active !== false);
      const activeRedFlags = ((redFlags.data ?? []) as CoverageRow[]).filter((row) => row.is_active !== false);
      const activeFirstAid = ((firstAid.data ?? []) as CoverageRow[]).filter((row) => row.is_active !== false);

      const coverage = {
        conditionsMissing: activeConditions.filter((row) => !conditionLinkIds.has(row.id)).length,
        redFlagsMissing: activeRedFlags.filter((row) => !redFlagLinkIds.has(row.id)).length,
        firstAidMissing: activeFirstAid.filter((row) => !firstAidLinkIds.has(row.id)).length,
      };

      const today = new Date().toISOString().slice(0, 10);
      const sourcesDue = ((sources.data ?? []) as SourceRow[]).filter((source) => {
        if (source.is_active === false) return false;
        if (!source.last_verified_at) return true;
        return !!source.expires_review_at && source.expires_review_at <= today;
      }).length;

      return {
        counts: Object.fromEntries(pairs) as Record<string, number>,
        audit: audit.data ?? [],
        statusCounts,
        coverage,
        sourcesDue,
      };
    },
  });

  if (q.isPending) return <div className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">{t("common.loading")}</div>;
  if (q.error) return <div className="rounded-3xl bg-destructive-soft p-5 text-sm text-destructive">{String(q.error)}</div>;

  const cards = [
    ["symptoms", t("admin.symptoms")],
    ["conditions", t("admin.conditions")],
    ["questions", t("admin.questions")],
    ["red_flags", t("admin.redFlags")],
    ["first_aid_topics", t("admin.firstAid")],
    ["medical_sources", t("admin.sources")],
  ];

  const coverageRows = [
    { label: t("admin.conditionsWithoutSources"), value: q.data.coverage.conditionsMissing },
    { label: t("admin.redFlagsWithoutSources"), value: q.data.coverage.redFlagsMissing },
    { label: t("admin.firstAidWithoutSources"), value: q.data.coverage.firstAidMissing },
  ];
  const coverageComplete = coverageRows.every((row) => row.value === 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold">{t("admin.home")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{lang === "ar" ? "إدارة المحتوى الطبي والمراجعات والإصدارات." : "Manage medical content, reviews, and releases."}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(([key, label]) => (
          <div key={key} className="glass rounded-3xl p-5">
            <p className="text-2xl font-extrabold">{q.data.counts[key as keyof typeof q.data.counts] ?? 0}</p>
            <p className="mt-2 text-sm font-semibold">{label}</p>
          </div>
        ))}
      </div>

      <section className="glass rounded-3xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-bold"><ShieldCheck className="size-5 text-primary" /> {t("admin.readiness")}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t("admin.readinessHint")}</p>
          </div>
          <span className="rounded-full bg-warning-soft px-3 py-1 text-xs font-semibold text-warning">{t("admin.medicalReviewPending")}</span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label={t("admin.publishedCount")} value={q.data.statusCounts.published} tone="ok" />
          <Metric label={t("admin.inReviewCount")} value={q.data.statusCounts.inReview} />
          <Metric label={t("admin.draftCount")} value={q.data.statusCounts.draft} />
          <Metric label={t("admin.sourcesDue")} value={q.data.sourcesDue} tone={q.data.sourcesDue ? "warn" : "ok"} />
        </div>

        <div className="mt-5 rounded-2xl bg-card p-4 ring-1 ring-border">
          <h4 className="flex items-center gap-2 text-sm font-bold"><Link2 className="size-4" /> {t("admin.sourceCoverage")}</h4>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {coverageRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3 rounded-xl bg-background px-3 py-2.5 text-sm ring-1 ring-border">
                <span className="text-muted-foreground">{row.label}</span>
                <span className={row.value ? "font-bold text-warning" : "font-bold text-primary"}>{row.value}</span>
              </div>
            ))}
          </div>
          {coverageComplete ? (
            <p className="mt-3 flex items-center gap-2 text-xs font-medium text-primary"><CheckCircle2 className="size-4" /> {t("admin.coverageComplete")}</p>
          ) : (
            <p className="mt-3 flex items-center gap-2 text-xs text-warning"><AlertTriangle className="size-4" /> {t("admin.readinessHint")}</p>
          )}
        </div>
      </section>

      <section className="glass rounded-3xl p-5">
        <h3 className="font-bold">{t("admin.audit")}</h3>
        <div className="mt-3 divide-y divide-border">
          {q.data.audit.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span>{item.action} · {item.entity_type}</span>
              <time className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString(lang === "ar" ? "ar-SA" : "en")}</time>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "ok" | "warn" }) {
  const cls = tone === "warn" ? "text-warning" : tone === "ok" ? "text-primary" : "text-foreground";
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
      <p className={`text-2xl font-extrabold ${cls}`}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
