import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { referenceQuery } from "@/lib/reference-data";
import { resultStore, type StoredResult } from "@/lib/session-store";
import { ResultCard, PageHeader, LoadingState, ErrorState } from "@/components/health/cards";
import { CareLevelBadge } from "@/components/health/badges";
import { MedicalDisclaimer } from "@/components/health/MedicalDisclaimer";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/results")({
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

function Results() {
  const { data: ref } = useSuspenseQuery(referenceQuery);
  const { user } = useAuth();
  const { t } = useI18n();
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
    .map((r) => ({ r, c: ref.conditions.find((c) => c.id === r.conditionId) }))
    .filter((x) => x.c);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("results.title")}>
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          {t("results.careLevel")}: <CareLevelBadge level={stored.triage.level} />
        </div>
      </PageHeader>
      <MedicalDisclaimer text={t("results.disclaimer")} className="mb-5" />
      {stored.knowledgeReleaseVersion ? (
        <p className="mb-4 text-xs text-muted-foreground">{t("results.release")}: {stored.knowledgeReleaseVersion}</p>
      ) : null}
      {items.length === 0 ? (
        <p className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">{t("results.noData")}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map(({ r, c }) => <ResultCard key={r.conditionId} result={r} condition={c!} symptoms={ref.symptoms} />)}
        </div>
      )}
      {!user && (
        <div className="glass mt-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl p-5 text-sm">
          <span>{t("results.guestSave")}</span>
          <Link to="/auth" search={{ redirect: "/history" }} className="rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground">
            {t("results.createAccount")}
          </Link>
        </div>
      )}
      <Link to="/symptom-checker" className="mt-6 inline-block text-sm font-semibold text-primary">{t("results.newCheck")}</Link>
    </div>
  );
}
