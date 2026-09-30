import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, CalendarClock, Eye, Siren } from "lucide-react";
import { referenceQuery } from "@/lib/reference-data";
import { resultStore, type StoredResult } from "@/lib/session-store";
import { resultCarePresentation } from "@/lib/results-presentation";
import { ResultCard, PageHeader, LoadingState, ErrorState } from "@/components/health/cards";
import { CareLevelBadge } from "@/components/health/badges";
import { MedicalDisclaimer } from "@/components/health/MedicalDisclaimer";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/results")({
  staticData: { sitemap: false },
  loader: ({ context }) => context.queryClient.ensureQueryData(referenceQuery),
  head: () => ({
    meta: [
      { title: "الحالات المحتملة — مؤشر صحي" },
      { name: "description", content: "حالات محتملة مرتبطة بأعراضك مع مستوى التوافق." },
      { property: "og:title", content: "الحالات المحتملة — مؤشر صحي" },
      { property: "og:description", content: "نتائج استرشادية لا تؤكد أو تستبعد أي مرض." },
    ],
  }),
  pendingComponent: LoadingState,
  errorComponent: () => <ErrorState />,
  component: Results,
});

const careTone = {
  danger: "bg-destructive-soft ring-destructive/20",
  warning: "bg-warning-soft ring-warning/20",
  primary: "bg-primary-soft ring-primary/20",
  success: "bg-success-soft ring-success/20",
} as const;

const careIcon = {
  danger: Siren,
  warning: AlertTriangle,
  primary: CalendarClock,
  success: Eye,
} as const;

function Results() {
  const { data: ref } = useSuspenseQuery(referenceQuery);
  const { user } = useAuth();
  const { t, dir } = useI18n();
  const [stored, setStored] = useState<StoredResult | null | undefined>(undefined);
  useEffect(() => setStored(resultStore.load()), []);

  if (stored === undefined) return <LoadingState />;
  if (!stored) {
    return (
      <div className="glass mx-auto max-w-xl rounded-3xl p-8 text-center">
        <p className="text-sm text-muted-foreground">{t("results.noneCurrent")}</p>
        <Link to="/symptom-checker" className="mt-4 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          {t("results.start")}
        </Link>
      </div>
    );
  }

  const items = stored.results
    .map((r) => {
      const live = ref.conditions.find((c) => c.id === r.conditionId);
      const snap = stored.conditionSnapshots?.[r.conditionId];
      // Prefer the condition version captured at check time so old results never drift.
      const c = snap ? ({ ...(live ?? {}), ...snap } as unknown as typeof live) : live;
      return { r, c, version: (snap?.version as number | undefined) ?? live?.version };
    })
    .filter((x) => x.c);

  const care = resultCarePresentation(stored.triage.level);
  const CareIcon = careIcon[care.tone];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("results.title")} subtitle={t("results.intro")} />

      <section className={cn("mb-5 rounded-3xl p-5 ring-1 md:p-6", careTone[care.tone])}>
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-card/70">
            <CareIcon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("results.nextStep")}</p>
              <CareLevelBadge level={stored.triage.level} />
            </div>
            <h2 className="mt-2 text-lg font-extrabold">{t(care.titleKey)}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{t(care.descriptionKey)}</p>
            {care.href && care.actionKey ? (
              <Link
                to={care.href}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-bold text-destructive-foreground"
              >
                {t(care.actionKey)}
                <ArrowLeft className={cn("size-4", dir === "ltr" && "rotate-180")} />
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <MedicalDisclaimer text={t("results.disclaimer")} className="mb-5" />

      {items.length === 0 ? (
        <p className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">{t("results.noData")}</p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-extrabold">{t("results.summaryTitle")}</h2>
            <span className="rounded-full bg-card px-3 py-1 text-xs font-semibold text-muted-foreground ring-1 ring-border">
              {t("results.count", { count: items.length })}
            </span>
          </div>
          <div className="space-y-4">
            {items.map(({ r, c, version }) => (
              <ResultCard key={r.conditionId} result={r} condition={c!} symptoms={ref.symptoms}
                meta={{ conditionVersion: version, release: stored.knowledgeReleaseVersion ?? null, engine: stored.engineVersion }} />
            ))}
          </div>
        </>
      )}

      {!user ? (
        <div className="glass mt-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl p-5 text-sm">
          <span>{t("results.guestSave")}</span>
          <Link to="/auth" search={{ redirect: "/history" }} className="rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground">
            {t("results.createAccount")}
          </Link>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Link to="/symptom-checker" className="text-sm font-semibold text-primary">{t("results.newCheck")}</Link>
        {stored.knowledgeReleaseVersion ? (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer font-medium">{t("results.moreInfo")}</summary>
            <p className="mt-2">{t("results.release")}: {stored.knowledgeReleaseVersion}</p>
            {stored.extraction && stored.extraction.source !== "none" ? (
              <p>{t("results.extraction")}: {stored.extraction.source === "ai" ? t("results.extraction.ai") : t("results.extraction.mock")} · {t("results.extraction.confirmed", { count: stored.extraction.confirmed.length })}</p>
            ) : null}
            {stored.engineVersion ? <p>{t("results.engine")}: {stored.engineVersion}</p> : null}
            {stored.savedAt ? <p>{t("results.checkedAt")}: {new Date(stored.savedAt).toLocaleString()}</p> : null}
          </details>
        ) : null}
      </div>
    </div>
  );
}
