import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  ShieldCheck,
  Siren,
  Stethoscope,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { appConfig } from "@/config/app";
import { PageHeader, EmergencyAlert, ErrorState } from "@/components/health/cards";
import { ProfessionalBadge } from "@/components/health/badges";
import { localized, useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

const sectionKeys = [
  "what_is_happening",
  "when_to_call",
  "do_now",
  "dont_do",
  "while_waiting",
] as const;

export const Route = createFileRoute("/first-aid/$slug")({
  loader: async ({ params }) => {
    const { data: topic } = await supabase
      .from("first_aid_topics")
      .select("*")
      .eq("code", params.slug)
      .eq("is_active", true)
      .maybeSingle();

    if (!topic || (appConfig.contentMode === "production" && topic.review_status !== "published")) {
      throw notFound();
    }

    const allowedSectionStatuses = appConfig.contentMode === "production"
      ? ["published"]
      : ["reviewed", "published"];

    const [{ data: sections }, { data: sources }] = await Promise.all([
      supabase
        .from("first_aid_sections")
        .select("*")
        .eq("topic_id", topic.id)
        .in("review_status", allowedSectionStatuses)
        .order("sort_order"),
      supabase
        .from("first_aid_sources")
        .select("medical_sources(title, organization, url, publication_date, source_type, last_verified_at)")
        .eq("first_aid_topic_id", topic.id),
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
  const { lang, dir, t } = useI18n();
  const title = localized(topic as unknown as Record<string, unknown>, "title", lang) ?? t("common.notTranslated");
  const summary = localized(topic as unknown as Record<string, unknown>, "summary", lang) ?? undefined;
  const unpublished = appConfig.contentMode === "development" && topic.review_status !== "published";

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title={title} subtitle={summary}>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {topic.is_critical ? (
            <span className="rounded-full bg-destructive-soft px-3 py-1 text-xs font-semibold text-destructive">
              {t("firstAid.critical")}
            </span>
          ) : null}
          {unpublished ? (
            <span className="rounded-full bg-warning-soft px-3 py-1 text-xs font-semibold text-warning">
              {t("firstAid.pendingReview")}
            </span>
          ) : null}
        </div>
      </PageHeader>

      <div className="flex flex-wrap gap-3">
        <Link
          to="/first-aid"
          className="inline-flex items-center gap-2 rounded-xl bg-card px-4 py-2.5 text-sm font-semibold ring-1 ring-border"
        >
          <ArrowLeft className={cn("size-4", dir === "ltr" && "rotate-180")} />
          {t("firstAid.back")}
        </Link>
        {topic.is_critical ? (
          <Link
            to="/emergency"
            className="inline-flex items-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-bold text-destructive-foreground"
          >
            <Siren className="size-4" />
            {t("firstAid.openEmergency")}
          </Link>
        ) : null}
      </div>

      <EmergencyAlert />

      <section className="glass rounded-3xl p-5 md:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <h2 className="font-extrabold">{t("firstAid.quickStart")}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("firstAid.publicHint")}</p>
          </div>
        </div>
      </section>

      <div className="space-y-3">
        {sectionKeys.map((key, index) => {
          const items = sections.filter((section) => section.section_type === key);
          return (
            <section key={key} className="glass rounded-3xl p-5 md:p-6">
              <div className="flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-extrabold text-primary">
                  {index + 1}
                </span>
                <h2 className="font-extrabold">{t(`firstAid.section.${key}` as never)}</h2>
              </div>

              {items.length ? (
                <div className="mt-4 space-y-3">
                  {items.map((item) => {
                    const body = localized(item as unknown as Record<string, unknown>, "content", lang);
                    return (
                      <div key={item.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
                        <p className="whitespace-pre-line text-sm leading-7">
                          {body ?? t("common.notTranslated")}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">{t("firstAid.sectionUnavailable")}</p>
              )}
            </section>
          );
        })}
      </div>

      <details className="glass rounded-3xl p-5 md:p-6">
        <summary className="cursor-pointer list-none">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent">
              <Stethoscope className="size-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-extrabold">{t("firstAid.professionalSection")}</h2>
                <ProfessionalBadge />
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("firstAid.professionalHint")}</p>
            </div>
          </div>
        </summary>

        <div className="mt-5 space-y-5 border-t border-border pt-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Meta label={t("firstAid.category")}>{topic.category ?? "—"}</Meta>
            <Meta label={t("firstAid.criticalStatus")}>
              {topic.is_critical ? t("firstAid.criticalYes") : t("firstAid.criticalNo")}
            </Meta>
            <Meta label={t("firstAid.contentStatus")}>{t(`status.${topic.review_status}` as never)}</Meta>
            <Meta label={t("firstAid.version")}>{topic.version}</Meta>
          </div>

          <div>
            <h3 className="flex items-center gap-2 text-sm font-extrabold">
              <BookOpen className="size-4 text-primary" />
              {t("firstAid.sources")}
            </h3>
            {sources.length ? (
              <div className="mt-3 space-y-2">
                {sources.map((source, index) => {
                  const item = source.medical_sources;
                  if (!item) return null;
                  return (
                    <div key={index} className="rounded-2xl bg-card p-4 ring-1 ring-border">
                      <p className="text-sm font-semibold">{item.title}</p>
                      {item.organization ? (
                        <p className="mt-1 text-xs text-muted-foreground">{item.organization}</p>
                      ) : null}
                      {item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary"
                        >
                          <ExternalLink className="size-3.5" />
                          {t("firstAid.sourceOpen")}
                        </a>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">{t("firstAid.noSources")}</p>
            )}
          </div>

          <Meta label={t("firstAid.lastReview")}>
            {topic.last_reviewed_at
              ? new Date(topic.last_reviewed_at).toLocaleDateString(lang === "ar" ? "ar-SA" : "en")
              : t("firstAid.notReviewed")}
          </Meta>
        </div>
      </details>
    </div>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <div className="mt-2 text-sm">{children}</div>
    </div>
  );
}
