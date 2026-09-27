import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/admin/")({ component: AdminDashboard });

function AdminDashboard() {
  const { t } = useI18n();
  const q = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => {
      const tables = ["symptoms", "conditions", "questions", "red_flags", "first_aid_topics", "medical_sources"] as const;
      const pairs = await Promise.all(tables.map(async (table) => {
        const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
        if (error) throw error;
        return [table, count ?? 0] as const;
      }));
      const audit = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(8);
      if (audit.error) throw audit.error;
      return { counts: Object.fromEntries(pairs) as Record<string, number>, audit: audit.data ?? [] };
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold">{t("admin.home")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">إدارة المحتوى الطبي والمراجعات والإصدارات.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(([key, label]) => (
          <div key={key} className="glass rounded-3xl p-5">
            <p className="text-2xl font-extrabold">{q.data.counts[key] ?? 0}</p>
            <p className="mt-2 text-sm font-semibold">{label}</p>
          </div>
        ))}
      </div>
      <section className="glass rounded-3xl p-5">
        <h3 className="font-bold">{t("admin.audit")}</h3>
        <div className="mt-3 divide-y divide-border">
          {q.data.audit.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span>{item.action} · {item.entity_type}</span>
              <time className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</time>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
