import { createFileRoute, notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { firstAidSectionTypes } from "@/config/app";
import { PageHeader, EmergencyAlert, ErrorState } from "@/components/health/cards";

export const Route = createFileRoute("/first-aid/$slug")({
  loader: async ({ params }) => {
    const { data: topic } = await supabase.from("first_aid_topics").select("*").eq("code", params.slug).maybeSingle();
    if (!topic) throw notFound();
    const [{ data: sections }, { data: sources }] = await Promise.all([
      supabase.from("first_aid_sections").select("*").eq("topic_id", topic.id).eq("review_status", "reviewed").order("sort_order"),
      supabase.from("first_aid_sources").select("medical_sources(title, organization)").eq("first_aid_topic_id", topic.id),
    ]);
    return { topic, sections: sections ?? [], sources: sources ?? [] };
  },
  head: ({ loaderData }) => {
    const t = loaderData?.topic;
    const title = t ? `${t.title_ar} — الإسعافات الأولية` : "غير متاح";
    return { meta: [{ title }, { name: "description", content: t?.summary_ar ?? "" }, { property: "og:title", content: title }, { property: "og:description", content: t?.summary_ar ?? "" }] };
  },
  errorComponent: () => <ErrorState />,
  notFoundComponent: () => <ErrorState text="الموضوع غير موجود." />,
  component: Detail,
});

function Detail() {
  const { topic, sections, sources } = Route.useLoaderData();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={topic.title_ar} subtitle={topic.summary_ar ?? undefined} />
      <EmergencyAlert className="mb-5" />
      <div className="space-y-3">
        {firstAidSectionTypes.map((s) => {
          const items = sections.filter((x) => x.section_type === s.key);
          return (
            <section key={s.key} className="glass rounded-3xl p-5">
              <h2 className="font-bold">{s.title}</h2>
              {items.length ? items.map((i) => <p key={i.id} className="mt-2 whitespace-pre-line text-sm">{i.content_ar}</p>)
                : <p className="mt-2 text-sm text-muted-foreground">سيُضاف المحتوى بعد المراجعة الطبية.</p>}
            </section>
          );
        })}
        <section className="glass rounded-3xl p-5">
          <h2 className="font-bold">المصادر الطبية</h2>
          {sources.length ? sources.map((s, i) => <p key={i} className="mt-2 text-sm">{s.medical_sources?.title}</p>) : <p className="mt-2 text-sm text-muted-foreground">لا توجد مصادر بعد.</p>}
        </section>
        <section className="glass rounded-3xl p-5">
          <h2 className="font-bold">تاريخ آخر مراجعة</h2>
          <p className="mt-2 text-sm text-muted-foreground">{topic.last_reviewed_at ? new Date(topic.last_reviewed_at).toLocaleDateString("ar-SA") : "لم تتم مراجعة طبية بعد."}</p>
        </section>
      </div>
    </div>
  );
}
