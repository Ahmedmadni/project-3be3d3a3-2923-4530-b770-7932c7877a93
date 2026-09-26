import { createFileRoute, notFound } from "@tanstack/react-router";
import { getFirstAid, firstAidSections } from "@/data/first-aid";
import { PageHeader, EmergencyAlert } from "@/components/health/cards";

export const Route = createFileRoute("/first-aid/$slug")({
  loader: ({ params }) => {
    const topic = getFirstAid(params.slug);
    if (!topic) throw notFound();
    return { topic };
  },
  head: ({ loaderData }) => {
    const t = loaderData?.topic;
    const title = t ? `${t.title} — الإسعافات الأولية` : "غير متاح";
    return { meta: [{ title }, { name: "description", content: t?.summary ?? "" }, { property: "og:title", content: title }, { property: "og:description", content: t?.summary ?? "" }] };
  },
  component: Detail,
});

function Detail() {
  const { topic } = Route.useLoaderData();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={topic.title} subtitle={topic.summary} />
      <EmergencyAlert className="mb-5" />
      <div className="space-y-3">
        {firstAidSections.map((s) => (
          <section key={s.key} className="glass rounded-3xl p-5">
            <h2 className="font-bold">{s.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">سيُضاف المحتوى بعد المراجعة الطبية.</p>
          </section>
        ))}
      </div>
    </div>
  );
}
