import { createFileRoute, notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmergencyAlert, ErrorState } from "@/components/health/cards";
import { localized, useI18n } from "@/i18n";

const sectionKeys = [
  "what_is_happening",
  "when_to_call",
  "do_now",
  "dont_do",
  "while_waiting",
] as const;

export const Route = createFileRoute("/first-aid/$slug")({
  loader: async ({ params }) => {
    const { data: topic } = await supabase.from("first_aid_topics").select("*").eq("code", params.slug).maybeSingle();
    if (!topic) throw notFound();
    const [{ data: sections }, { data: sources }] = await Promise.all([
      supabase
        .from("first_aid_sections")
        .select("*")
        .eq("topic_id", topic.id)
        .in("review_status", ["reviewed", "published"])
        .order("sort_order"),
      supabase.from("first_aid_sources").select("medical_sources(title, organization)").eq("first_aid_topic_id", topic.id),
    ]);
    return { topic, sections: sections ?? [], sources: sources ?? [] };
  },
  head: ({ loaderData }) => {
    const topic = loaderData?.topic;
    const title = topic ? `${topic.title_ar} — الإسعافات الأولية` : "غير متاح";
    return {
      meta: [
        { title },
        { name: "description", content: topic?.summary_ar ?? "" },
        { property: "og:title", content: title },
        { property: "og:description", content: topic?.summary_ar ?? "" },
      ],
    };
  },
  errorComponent: () => <ErrorState />,
  notFoundComponent: FirstAidNotFound,
  component: Detail,
});

function FirstAidNotFound() {
  const { t } = useI18n();
  return <ErrorState text={t("firstAid.noResults")} />;
}

function Detail() {
  const { topic, sections, sources } = Route.useLoaderData();
  const { lang, t } = useI18n();
  const title = localized(topic as unknown as Record<string, unknown>, "title", lang) ?? t("common.notTranslated");
  const summary = localized(topic as unknown as Record<string, unknown>, "summary", lang) ?? undefined;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={title} subtitle={summary} />
      <EmergencyAlert className="mb-5" />
      <div className="space-y-3">
        {sectionKeys.map((key) => {
          const items = sections.filter((section) => section.section_type === key);
          return (
            <section key={key} className="glass rounded-3xl p-5">
              <h2 className="font-bold">{t(`firstAid.section.${key}` as never)}</h2>
              {items.length ? (
                items.map((item) => {
                  const body = localized(item as unknown as Record<string, unknown>, "content", lang);
                  return (
                    <p key={item.id} className="mt-2 whitespace-pre-line text-sm">
                      {body ?? t("common.notTranslated")}
                    </p>
                  );
                })
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">{t("firstAid.pendingReview")}</p>
              )}
            </section>
          );
        })}
        <section className="glass rounded-3xl p-5">
          <h2 className="font-bold">{t("firstAid.sources")}</h2>
          {sources.length ? (
            sources.map((source, i) => (
              <p key={i} className="mt-2 text-sm">
                {source.medical_sources?.title}
                {source.medical_sources?.organization ? ` — ${source.medical_sources.organization}` : ""}
              </p>
            ))
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">{t("firstAid.noSources")}</p>
          )}
        </section>
        <section className="glass rounded-3xl p-5">
          <h2 className="font-bold">{t("firstAid.lastReview")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {topic.last_reviewed_at
              ? new Date(topic.last_reviewed_at).toLocaleDateString(lang === "ar" ? "ar-SA" : "en")
              : t("firstAid.notReviewed")}
          </p>
        </section>
      </div>
    </div>
  );
}
