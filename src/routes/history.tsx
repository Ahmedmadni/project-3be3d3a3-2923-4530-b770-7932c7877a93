import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Plus,
  Siren,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, LoadingState, ErrorState } from "@/components/health/cards";
import { CareLevelBadge, CompatibilityBadge } from "@/components/health/badges";
import {
  historyPreviewNames,
  historyTone,
  isEmergencyHistorySession,
} from "@/lib/history-presentation";
import { localized, useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/history")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "فحوصاتي السابقة — مؤشر صحي" },
      { name: "description", content: "سجل فحوصات الأعراض السابقة." },
      { property: "og:title", content: "فحوصاتي السابقة — مؤشر صحي" },
      { property: "og:description", content: "راجع فحوصاتك السابقة." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HistoryPage,
});

const toneClass = {
  danger: "ring-destructive/20",
  warning: "ring-warning/20",
  primary: "ring-primary/15",
  success: "ring-success/20",
} as const;

function HistoryPage() {
  const { user, loading } = useAuth();
  const { t, lang } = useI18n();
  const [open, setOpen] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["history", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("symptom_sessions")
        .select(
          "id, created_at, completed_at, status, care_level, session_symptoms(symptoms(id,name_ar,name_en)), session_results(rank, matching_level, conditions(id,name_ar,name_en))",
        )
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

  if (loading) return <LoadingState />;

  if (!user) {
    return (
      <div className="glass mx-auto max-w-xl rounded-3xl p-8 text-center">
        <p className="text-sm text-muted-foreground">{t("history.loginHint")}</p>
        <Link
          to="/auth"
          search={{ redirect: "/history" }}
          className="mt-4 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          {t("history.login")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("history.title")} subtitle={t("history.subtitle")}>
        <Link
          to="/symptom-checker"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="size-4" />
          {t("history.newCheck")}
        </Link>
      </PageHeader>

      {q.isLoading ? (
        <LoadingState />
      ) : q.error ? (
        <ErrorState />
      ) : !q.data?.length ? (
        <div className="glass rounded-3xl p-8 text-center">
          <ClipboardList className="mx-auto size-10 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">{t("history.empty")}</p>
          <Link
            to="/symptom-checker"
            className="mt-4 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            {t("history.newCheck")}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {q.data.map((session) => {
            const symptoms = session.session_symptoms
              .map((item) =>
                item.symptoms
                  ? localized(
                      item.symptoms as unknown as Record<string, unknown>,
                      "name",
                      lang,
                    ) ?? t("common.notTranslated")
                  : null,
              )
              .filter((value): value is string => Boolean(value));

            const previewSymptoms = historyPreviewNames(symptoms);
            const extraSymptoms = Math.max(0, symptoms.length - previewSymptoms.length);
            const results = [...session.session_results].sort((a, b) => a.rank - b.rank);
            const firstResult = results[0];
            const firstConditionName = firstResult?.conditions
              ? localized(
                  firstResult.conditions as unknown as Record<string, unknown>,
                  "name",
                  lang,
                ) ?? t("common.notTranslated")
              : null;
            const statusKey = `history.status.${session.status}` as never;
            const emergency = isEmergencyHistorySession(session.status, session.care_level);
            const tone = historyTone(session.care_level);
            const date = new Date(session.completed_at ?? session.created_at);

            return (
              <article
                key={session.id}
                className={cn(
                  "glass rounded-3xl p-5 ring-1 md:p-6",
                  toneClass[tone],
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground">
                      {date.toLocaleDateString(lang === "ar" ? "ar-SA" : "en", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <h2 className="mt-1 text-lg font-extrabold">
                      {previewSymptoms[0] ?? "—"}
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">{t(statusKey)}</p>
                  </div>
                  {session.care_level ? <CareLevelBadge level={session.care_level} /> : null}
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {previewSymptoms.map((name) => (
                    <span
                      key={name}
                      className="rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary"
                    >
                      {name}
                    </span>
                  ))}
                  {extraSymptoms > 0 ? (
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                      {t("history.moreSymptoms", { count: extraSymptoms })}
                    </span>
                  ) : null}
                </div>

                {firstResult && firstConditionName ? (
                  <div className="mt-4 rounded-2xl bg-card p-4 ring-1 ring-border">
                    <p className="text-xs font-bold text-muted-foreground">{t("history.topResult")}</p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <Link
                        to="/conditions/$conditionId"
                        params={{ conditionId: firstResult.conditions!.id }}
                        className="font-semibold text-primary"
                      >
                        {firstConditionName}
                      </Link>
                      <CompatibilityBadge level={firstResult.matching_level} />
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setOpen(open === session.id ? null : session.id)}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
                  >
                    {open === session.id ? (
                      <>
                        <ChevronUp className="size-4" />
                        {t("history.hide")}
                      </>
                    ) : (
                      <>
                        <ChevronDown className="size-4" />
                        {t("history.view")}
                      </>
                    )}
                  </button>

                  {emergency ? (
                    <Link
                      to="/emergency"
                      className="inline-flex items-center gap-2 rounded-xl bg-destructive px-3 py-2 text-xs font-bold text-destructive-foreground"
                    >
                      <Siren className="size-4" />
                      {t("history.emergencyAction")}
                    </Link>
                  ) : null}
                </div>

                {open === session.id ? (
                  <div className="mt-5 space-y-4 border-t border-border pt-5 text-sm">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <HistoryInfo
                        icon={<CalendarDays className="size-4 text-primary" />}
                        label={t("history.date")}
                      >
                        {date.toLocaleString(lang === "ar" ? "ar-SA" : "en")}
                      </HistoryInfo>
                      <HistoryInfo
                        icon={<ClipboardList className="size-4 text-primary" />}
                        label={t("history.careLevel")}
                      >
                        {session.care_level ? <CareLevelBadge level={session.care_level} /> : "—"}
                      </HistoryInfo>
                    </div>

                    <div>
                      <p className="font-semibold">{t("history.symptoms")}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {symptoms.map((name, index) => (
                          <span
                            key={`${name}-${index}`}
                            className="rounded-full bg-primary-soft px-3 py-1 text-xs text-primary"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold">{t("history.results")}</p>
                      {results.length ? (
                        <div className="mt-2 space-y-2">
                          {results.map((result) => {
                            const conditionName = result.conditions
                              ? localized(
                                  result.conditions as unknown as Record<string, unknown>,
                                  "name",
                                  lang,
                                ) ?? t("common.notTranslated")
                              : "—";

                            return (
                              <div
                                key={result.rank}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-card p-3 ring-1 ring-border"
                              >
                                {result.conditions ? (
                                  <Link
                                    to="/conditions/$conditionId"
                                    params={{ conditionId: result.conditions.id }}
                                    className="font-medium text-primary"
                                  >
                                    {conditionName}
                                  </Link>
                                ) : (
                                  <span>—</span>
                                )}
                                <CompatibilityBadge level={result.matching_level} />
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-2 text-muted-foreground">{t("history.noPossibleConditions")}</p>
                      )}
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HistoryInfo({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}
