import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, LoadingState, ErrorState } from "@/components/health/cards";
import { CareLevelBadge, CompatibilityBadge } from "@/components/health/badges";
import { localized, useI18n } from "@/i18n";

export const Route = createFileRoute("/history")({
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

function HistoryPage() {
  const { user, loading } = useAuth();
  const { t, lang } = useI18n();
  const [open, setOpen] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["history", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("symptom_sessions")
        .select("id, created_at, status, care_level, session_symptoms(symptoms(name_ar,name_en)), session_results(rank, matching_level, conditions(id, name_ar, name_en))")
        .order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });

  if (loading) return <LoadingState />;
  if (!user) return (
    <div className="glass mx-auto max-w-xl rounded-3xl p-8 text-center">
      <p className="text-sm text-muted-foreground">{t("history.loginHint")}</p>
      <Link to="/auth" search={{ redirect: "/history" }} className="mt-4 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
        {t("history.login")}
      </Link>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("history.title")} />
      {q.isLoading ? <LoadingState /> : q.error ? <ErrorState /> : !q.data?.length ? (
        <p className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">{t("history.empty")}</p>
      ) : (
        <div className="space-y-3">
          {q.data.map((session) => {
            const symptoms = session.session_symptoms
              .map((item) => item.symptoms
                ? localized(item.symptoms as unknown as Record<string, unknown>, "name", lang) ?? t("common.notTranslated")
                : null)
              .filter((value): value is string => Boolean(value));
            const statusKey = `history.status.${session.status}` as never;

            return (
              <article key={session.id} className="glass rounded-3xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold">{symptoms[0] ?? "—"}</p>
                  {session.care_level && <CareLevelBadge level={session.care_level} />}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(session.created_at).toLocaleDateString(lang === "ar" ? "ar-SA" : "en")} · {t("history.symptomsCount", { count: symptoms.length })} · {t(statusKey)}
                </p>
                <button onClick={() => setOpen(open === session.id ? null : session.id)} className="mt-3 text-sm font-semibold text-primary">
                  {t("history.details")}
                </button>
                {open === session.id && (
                  <div className="mt-3 space-y-2 text-sm">
                    <p className="text-muted-foreground">{t("history.symptoms")}: {symptoms.join(lang === "ar" ? "، " : ", ")}</p>
                    <p className="font-semibold">{t("history.possible")}</p>
                    {session.session_results.length ? [...session.session_results].sort((a, b) => a.rank - b.rank).map((result) => {
                      const conditionName = result.conditions
                        ? localized(result.conditions as unknown as Record<string, unknown>, "name", lang) ?? t("common.notTranslated")
                        : "—";
                      return (
                        <div key={result.rank} className="flex items-center justify-between rounded-xl bg-card p-3 ring-1 ring-border">
                          {result.conditions ? (
                            <Link to="/conditions/$conditionId" params={{ conditionId: result.conditions.id }} className="text-primary">
                              {conditionName}
                            </Link>
                          ) : "—"}
                          <CompatibilityBadge level={result.matching_level} />
                        </div>
                      );
                    }) : <p className="text-muted-foreground">{t("history.noResults")}</p>}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
