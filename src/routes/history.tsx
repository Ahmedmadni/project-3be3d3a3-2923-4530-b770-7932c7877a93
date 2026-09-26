import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, LoadingState, ErrorState } from "@/components/health/cards";
import { CareLevelBadge, CompatibilityBadge } from "@/components/health/badges";

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

const statusLabel: Record<string, string> = { completed: "مكتمل", emergency_redirected: "تحويل للطوارئ", in_progress: "قيد التنفيذ", abandoned: "متروك" };

function HistoryPage() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["history", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("symptom_sessions")
        .select("id, created_at, status, care_level, session_symptoms(symptoms(name_ar)), session_results(rank, matching_level, conditions(id, name_ar))")
        .order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });

  if (loading) return <LoadingState />;
  if (!user) return (
    <div className="glass mx-auto max-w-xl rounded-3xl p-8 text-center">
      <p className="text-sm text-muted-foreground">سجّل الدخول لمشاهدة سجل فحوصاتك.</p>
      <Link to="/auth" search={{ redirect: "/history" }} className="mt-4 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">تسجيل الدخول</Link>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="فحوصاتي السابقة" />
      {q.isLoading ? <LoadingState /> : q.error ? <ErrorState /> : !q.data?.length ? (
        <p className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">لا توجد فحوصات محفوظة بعد.</p>
      ) : (
        <div className="space-y-3">
          {q.data.map((s) => {
            const syms = s.session_symptoms.map((x) => x.symptoms?.name_ar).filter(Boolean);
            return (
              <article key={s.id} className="glass rounded-3xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold">{syms[0] ?? "—"}</p>
                  {s.care_level && <CareLevelBadge level={s.care_level} />}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(s.created_at).toLocaleDateString("ar-SA")} · {syms.length} أعراض · {statusLabel[s.status]}
                </p>
                <button onClick={() => setOpen(open === s.id ? null : s.id)} className="mt-3 text-sm font-semibold text-primary">عرض التفاصيل</button>
                {open === s.id && (
                  <div className="mt-3 space-y-2 text-sm">
                    <p className="text-muted-foreground">الأعراض: {syms.join("، ")}</p>
                    <p className="font-semibold">الحالات المحتملة التي ظهرت في هذا الفحص</p>
                    {s.session_results.length ? [...s.session_results].sort((a, b) => a.rank - b.rank).map((r) => (
                      <div key={r.rank} className="flex items-center justify-between rounded-xl bg-card p-3 ring-1 ring-border">
                        {r.conditions ? <Link to="/conditions/$conditionId" params={{ conditionId: r.conditions.id }} className="text-primary">{r.conditions.name_ar}</Link> : "—"}
                        <CompatibilityBadge level={r.matching_level} />
                      </div>
                    )) : <p className="text-muted-foreground">لا توجد نتائج محفوظة.</p>}
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
