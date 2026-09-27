import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resultStore } from "@/lib/session-store";
import { PageHeader, ErrorState } from "@/components/health/cards";
import { MedicalDisclaimer } from "@/components/health/MedicalDisclaimer";
import { localized, useI18n } from "@/i18n";

export const Route = createFileRoute("/conditions/$conditionId")({
  loader: async ({ params }) => {
    const { data: condition } = await supabase.from("conditions").select("*").eq("id", params.conditionId).maybeSingle();
    if (!condition) throw notFound();
    const [{ data: links }, { data: sources }] = await Promise.all([
      supabase.from("condition_symptoms").select("symptom_id, relationship_type, symptoms(name_ar,name_en)").eq("condition_id", condition.id),
      supabase.from("condition_sources").select("medical_sources(title, organization, url)").eq("condition_id", condition.id),
    ]);
    return { condition, links: links ?? [], sources: sources ?? [] };
  },
  head: ({ loaderData }) => {
    const condition = loaderData?.condition;
    const title = condition ? `${condition.name_ar} — مؤشر صحي` : "غير متاح";
    return {
      meta: [
        { title },
        { name: "description", content: condition?.summary_ar ?? "" },
        { property: "og:title", content: title },
        { property: "og:description", content: condition?.summary_ar ?? "" },
        ...(condition?.is_demo ? [{ name: "robots", content: "noindex" }] : []),
      ],
    };
  },
  errorComponent: () => <ErrorState />,
  notFoundComponent: ConditionNotFound,
  component: Detail,
});

function ConditionNotFound() {
  const { t } = useI18n();
  return <ErrorState text={t("condition.notFound")} />;
}

function Detail() {
  const { condition, links, sources } = Route.useLoaderData();
  const { lang, t } = useI18n();
  const [matched, setMatched] = useState<string[]>([]);

  useEffect(() => {
    const stored = resultStore.load();
    setMatched(stored?.results.find((result) => result.conditionId === condition.id)?.matchedSymptoms ?? []);
  }, [condition.id]);

  const related = links.filter((link) => link.relationship_type !== "contradicts");
  const conditionName = localized(condition as unknown as Record<string, unknown>, "name", lang) ?? t("common.notTranslated");
  const summary = localized(condition as unknown as Record<string, unknown>, "summary", lang) ?? undefined;
  const symptomName = (link: (typeof related)[number]) => {
    const symptom = link.symptoms;
    if (!symptom) return "";
    const value = lang === "en" ? symptom.name_en : symptom.name_ar;
    return value?.trim() || t("common.notTranslated");
  };
  const seekCare = lang === "ar"
    ? condition.when_to_seek_care_ar ?? t("condition.notAdded")
    : t("common.notTranslated");

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title={conditionName} subtitle={summary}>
        {condition.is_demo && (
          <span className="mt-3 inline-block rounded-full bg-warning-soft px-3 py-1 text-xs font-semibold text-warning">
            {t("results.demo")}
          </span>
        )}
      </PageHeader>
      <MedicalDisclaimer text={t("condition.disclaimer")} />
      <Section title={t("condition.matched")}>
        {matched.length
          ? <Chips items={related.filter((link) => matched.includes(link.symptom_id)).map(symptomName)} />
          : <Muted>{t("condition.noCurrent")}</Muted>}
      </Section>
      <Section title={t("condition.generalSymptoms")}>
        <Chips items={related.map(symptomName)} />
      </Section>
      <Section title={t("condition.seekCare")}><Muted>{seekCare}</Muted></Section>
      <Section title={t("condition.specialty")}><Muted>{condition.specialty ?? "—"}</Muted></Section>
      <Section title={t("condition.sources")}>
        {sources.length ? (
          <ul className="list-disc space-y-1 ps-5 text-sm">
            {sources.map((source, i) => (
              <li key={i}>
                {source.medical_sources?.title}
                {source.medical_sources?.organization ? ` — ${source.medical_sources.organization}` : ""}
              </li>
            ))}
          </ul>
        ) : <Muted>{t("condition.noSources")}</Muted>}
      </Section>
      <Section title={t("condition.lastReview")}>
        <Muted>
          {condition.last_medical_review_at
            ? new Date(condition.last_medical_review_at).toLocaleDateString(lang === "ar" ? "ar-SA" : "en")
            : t("condition.notReviewed")}
        </Muted>
      </Section>
    </div>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="glass rounded-3xl p-5"><h2 className="mb-2 font-bold">{title}</h2>{children}</section>
);
const Muted = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-muted-foreground">{children}</p>;
const Chips = ({ items }: { items: string[] }) => (
  <div className="flex flex-wrap gap-1.5">
    {items.filter(Boolean).map((item, i) => <span key={`${item}-${i}`} className="rounded-full bg-primary-soft px-3 py-1 text-xs text-primary">{item}</span>)}
  </div>
);
