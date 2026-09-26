import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resultStore } from "@/lib/session-store";
import { PageHeader, ErrorState } from "@/components/health/cards";
import { MedicalDisclaimer } from "@/components/health/MedicalDisclaimer";

export const Route = createFileRoute("/conditions/$conditionId")({
  loader: async ({ params }) => {
    const { data: condition } = await supabase.from("conditions").select("*").eq("id", params.conditionId).maybeSingle();
    if (!condition) throw notFound();
    const [{ data: links }, { data: sources }] = await Promise.all([
      supabase.from("condition_symptoms").select("symptom_id, relationship_type, symptoms(name_ar)").eq("condition_id", condition.id),
      supabase.from("condition_sources").select("medical_sources(title, organization, url)").eq("condition_id", condition.id),
    ]);
    return { condition, links: links ?? [], sources: sources ?? [] };
  },
  head: ({ loaderData }) => {
    const c = loaderData?.condition;
    const title = c ? `${c.name_ar} — مؤشر صحي` : "غير متاح";
    return { meta: [{ title }, { name: "description", content: c?.summary_ar ?? "" }, { property: "og:title", content: title }, { property: "og:description", content: c?.summary_ar ?? "" }, ...(c?.is_demo ? [{ name: "robots", content: "noindex" }] : [])] };
  },
  errorComponent: () => <ErrorState />,
  notFoundComponent: () => <ErrorState text="الحالة غير موجودة." />,
  component: Detail,
});

function Detail() {
  const { condition: c, links, sources } = Route.useLoaderData();
  const [matched, setMatched] = useState<string[]>([]);
  useEffect(() => {
    const s = resultStore.load();
    setMatched(s?.results.find((r) => r.conditionId === c.id)?.matchedSymptoms ?? []);
  }, [c.id]);
  const related = links.filter((l) => l.relationship_type !== "contradicts");
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title={c.name_ar} subtitle={c.summary_ar ?? undefined}>
        {c.is_demo && <span className="mt-3 inline-block rounded-full bg-warning-soft px-3 py-1 text-xs font-semibold text-warning">بيانات تجريبية — غير معتمدة طبيًا</span>}
      </PageHeader>
      <MedicalDisclaimer text="وجود أعراض متوافقة لا يعني تأكيد الإصابة بهذه الحالة." />
      <Section title="الأعراض التي تتوافق مع إجاباتك">
        {matched.length ? <Chips items={related.filter((l) => matched.includes(l.symptom_id)).map((l) => l.symptoms?.name_ar ?? "")} /> : <Muted>لا توجد إجابات حالية مرتبطة بهذه الحالة.</Muted>}
      </Section>
      <Section title="الأعراض العامة المرتبطة بالحالة"><Chips items={related.map((l) => l.symptoms?.name_ar ?? "")} /></Section>
      <Section title="متى يُنصح بالتقييم الطبي"><Muted>{c.when_to_seek_care_ar ?? "لم يُضف بعد."}</Muted></Section>
      <Section title="التخصص الطبي المرتبط"><Muted>{c.specialty ?? "—"}</Muted></Section>
      <Section title="المصادر">
        {sources.length ? <ul className="list-disc space-y-1 pr-5 text-sm">{sources.map((s, i) => <li key={i}>{s.medical_sources?.title} {s.medical_sources?.organization && `— ${s.medical_sources.organization}`}</li>)}</ul> : <Muted>لا توجد مصادر مرتبطة بعد.</Muted>}
      </Section>
      <Section title="آخر مراجعة"><Muted>{c.last_medical_review_at ? new Date(c.last_medical_review_at).toLocaleDateString("ar-SA") : "لم تتم مراجعة طبية بعد."}</Muted></Section>
    </div>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="glass rounded-3xl p-5"><h2 className="mb-2 font-bold">{title}</h2>{children}</section>
);
const Muted = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-muted-foreground">{children}</p>;
const Chips = ({ items }: { items: string[] }) => (
  <div className="flex flex-wrap gap-1.5">{items.map((s) => <span key={s} className="rounded-full bg-primary-soft px-3 py-1 text-xs text-primary">{s}</span>)}</div>
);
