import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, ExternalLink, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resultStore } from "@/lib/session-store";
import { PageHeader, ErrorState } from "@/components/health/cards";
import { CareLevelBadge, ProfessionalBadge } from "@/components/health/badges";
import { MedicalDisclaimer } from "@/components/health/MedicalDisclaimer";
import { localized, useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/conditions/$conditionId")({
  loader: async ({ params }) => {
    const { data: condition } = await supabase.from("conditions").select("*").eq("id", params.conditionId).maybeSingle();
    if (!condition) throw notFound();

    const [{ data: links }, { data: sources }] = await Promise.all([
      supabase
        .from("condition_symptoms")
        .select("symptom_id, relationship_type, is_core_symptom, symptoms(name_ar,name_en)")
        .eq("condition_id", condition.id),
      supabase
        .from("condition_sources")
        .select("medical_sources(title, organization, url, publication_date, source_type, last_verified_at)")
        .eq("condition_id", condition.id),
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
  const { lang, t, dir } = useI18n();
  const [matched, setMatched] = useState<string[]>([]);

  useEffect(() => {
    const stored = resultStore.load();
    setMatched(stored?.results.find((result) => result.conditionId === condition.id)?.matchedSymptoms ?? []);
  }, [condition.id]);

  const groups = useMemo(() => {
    const positive = links.filter((link) => link.relationship_type !== "contradicts");
    return {
      positive,
      core: positive.filter((link) => link.is_core_symptom),
      supporting: positive.filter((link) => !link.is_core_symptom),
      contradicting: links.filter((link) => link.relationship_type === "contradicts"),
    };
  }, [links]);

  const conditionName = localized(condition as unknown as Record<string, unknown>, "name", lang) ?? t("common.notTranslated");
  const summary = localized(condition as unknown as Record<string, unknown>, "summary", lang) ?? undefined;
  const seekCare = lang === "ar"
    ? condition.when_to_seek_care_ar ?? t("condition.notAdded")
    : t("common.notTranslated");

  const symptomName = (link: (typeof links)[number]) => {
    const symptom = link.symptoms;
    if (!symptom) return "";
    const value = lang === "en" ? symptom.name_en : symptom.name_ar;
    return value?.trim() || t("common.notTranslated");
  };

  const matchedLinks = groups.positive.filter((link) => matched.includes(link.symptom_id));
  const hasCurrentResult = matched.length > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title={conditionName} subtitle={summary}>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <CareLevelBadge level={condition.care_level} />
          {condition.is_demo ? (
            <span className="rounded-full bg-warning-soft px-3 py-1 text-xs font-semibold text-warning">
              {t("results.demo")}
            </span>
          ) : null}
        </div>
      </PageHeader>

      <div className="flex flex-wrap gap-3">
        {hasCurrentResult ? (
          <Link to="/results" className="inline-flex items-center gap-2 rounded-xl bg-card px-4 py-2.5 text-sm font-semibold ring-1 ring-border">
            <ArrowLeft className={cn("size-4", dir === "ltr" && "rotate-180")} />
            {t("condition.backResults")}
          </Link>
        ) : null}
        <Link to="/library" className="inline-flex items-center gap-2 rounded-xl bg-card px-4 py-2.5 text-sm font-semibold ring-1 ring-border">
          <BookOpen className="size-4" />
          {t("condition.backLibrary")}
        </Link>
      </div>

      <MedicalDisclaimer text={t("condition.disclaimer")} />

      {hasCurrentResult ? (
        <Section title={t("condition.yourMatch")}>
          {matchedLinks.length ? (
            <Chips items={matchedLinks.map(symptomName)} />
          ) : (
            <Muted>{t("condition.noCurrent")}</Muted>
          )}
        </Section>
      ) : null}

      <Section title={t("condition.overview")}>
        <div className="space-y-4">
          {summary ? <p className="text-sm leading-7 text-muted-foreground">{summary}</p> : null}
          <div>
            <p className="mb-2 text-sm font-semibold">{t("condition.generalSymptoms")}</p>
            {groups.positive.length ? <Chips items={groups.positive.map(symptomName)} /> : <Muted>{t("condition.notAdded")}</Muted>}
          </div>
        </div>
      </Section>

      <Section title={t("condition.nextStep")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
            <p className="text-xs font-bold text-muted-foreground">{t("condition.seekCare")}</p>
            <p className="mt-1 text-sm leading-6">{seekCare}</p>
          </div>
          <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
            <p className="text-xs font-bold text-muted-foreground">{t("condition.specialty")}</p>
            <p className="mt-1 text-sm font-semibold">{condition.specialty ?? "—"}</p>
          </div>
        </div>
      </Section>

      <details className="glass rounded-3xl p-5 md:p-6">
        <summary className="cursor-pointer list-none">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent">
                <Stethoscope className="size-5" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-extrabold">{t("condition.professionalSection")}</h2>
                  <ProfessionalBadge />
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("condition.professionalHint")}</p>
              </div>
            </div>
          </div>
        </summary>

        <div className="mt-5 space-y-5 border-t border-border pt-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Info label={t("condition.careLevel")}><CareLevelBadge level={condition.care_level} /></Info>
            <Info label={t("condition.category")}>{condition.category ?? "—"}</Info>
          </div>

          <ProfessionalSymptomGroup
            title={t("condition.coreSymptoms")}
            items={groups.core.map(symptomName)}
          />
          <ProfessionalSymptomGroup
            title={t("condition.supportingSymptoms")}
            items={groups.supporting.map(symptomName)}
          />
          <ProfessionalSymptomGroup
            title={t("condition.contradictingFindings")}
            items={groups.contradicting.map(symptomName)}
            emptyText={t("condition.noContradictions")}
            warning
          />

          <div>
            <h3 className="text-sm font-extrabold">{t("condition.sources")}</h3>
            {sources.length ? (
              <div className="mt-3 space-y-2">
                {sources.map((source, index) => {
                  const item = source.medical_sources;
                  if (!item) return null;
                  return (
                    <div key={index} className="rounded-2xl bg-card p-4 ring-1 ring-border">
                      <p className="text-sm font-semibold">{item.title}</p>
                      {item.organization ? <p className="mt-1 text-xs text-muted-foreground">{item.organization}</p> : null}
                      {item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary"
                        >
                          <ExternalLink className="size-3.5" />
                          {t("condition.sourceOpen")}
                        </a>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <Muted>{t("condition.noSources")}</Muted>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Info label={t("condition.contentStatus")}>{t(`status.${condition.review_status}` as never)}</Info>
            <Info label={t("condition.reviewedOn")}>
              {condition.last_medical_review_at
                ? new Date(condition.last_medical_review_at).toLocaleDateString(lang === "ar" ? "ar-SA" : "en")
                : t("condition.notReviewed")}
            </Info>
            <Info label={t("condition.version")}>{condition.version}</Info>
          </div>
        </div>
      </details>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-3xl p-5 md:p-6">
      <h2 className="mb-3 font-extrabold">{title}</h2>
      {children}
    </section>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <div className="mt-2 text-sm">{children}</div>
    </div>
  );
}

function ProfessionalSymptomGroup({
  title,
  items,
  emptyText,
  warning = false,
}: {
  title: string;
  items: string[];
  emptyText?: string;
  warning?: boolean;
}) {
  return (
    <div>
      <h3 className="text-sm font-extrabold">{title}</h3>
      <div className="mt-2">
        {items.length ? <Chips items={items} warning={warning} /> : <Muted>{emptyText ?? "—"}</Muted>}
      </div>
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-6 text-muted-foreground">{children}</p>;
}

function Chips({ items, warning = false }: { items: string[]; warning?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.filter(Boolean).map((item, index) => (
        <span
          key={`${item}-${index}`}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            warning ? "bg-warning-soft text-warning" : "bg-primary-soft text-primary",
          )}
        >
          {item}
        </span>
      ))}
    </div>
  );
}
