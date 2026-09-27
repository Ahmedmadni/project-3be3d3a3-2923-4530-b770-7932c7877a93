import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { referenceQuery } from "@/lib/reference-data";
import { appConfig } from "@/config/app";
import { PageHeader, LoadingState, ErrorState } from "@/components/health/cards";
import { MedicalDisclaimer } from "@/components/health/MedicalDisclaimer";
import { localized, useI18n } from "@/i18n";

export const Route = createFileRoute("/library")({
  loader: ({ context }) => context.queryClient.ensureQueryData(referenceQuery),
  head: () => ({
    meta: [
      { title: "المكتبة الصحية — مؤشر صحي" },
      { name: "description", content: "معلومات مبسطة عن الأمراض والأعراض الشائعة." },
      { property: "og:title", content: "المكتبة الصحية — مؤشر صحي" },
      { property: "og:description", content: "افهم الحالات الصحية الشائعة بلغة بسيطة." },
    ],
  }),
  pendingComponent: LoadingState,
  errorComponent: () => <ErrorState />,
  component: Library,
});

function Library() {
  const { data } = useSuspenseQuery(referenceQuery);
  const { lang, t } = useI18n();

  const list = data.conditions
    .filter((condition) =>
      condition.is_active &&
      (appConfig.contentMode === "development" || condition.review_status === "published"),
    )
    .map((condition) => ({
      condition,
      name: localized(condition as unknown as Record<string, unknown>, "name", lang),
      summary: localized(condition as unknown as Record<string, unknown>, "summary", lang),
    }))
    .filter((item) => item.name);

  return (
    <div>
      <PageHeader title={t("library.title")} subtitle={t("library.subtitle")} />
      {list.length === 0 ? (
        <p className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">{t("library.empty")}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map(({ condition, name, summary }) => (
            <Link
              key={condition.id}
              to="/conditions/$conditionId"
              params={{ conditionId: condition.id }}
              className="glass rounded-3xl p-5"
            >
              <h2 className="font-bold">{name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{summary ?? t("common.notTranslated")}</p>
              {condition.specialty ? <p className="mt-3 text-xs text-primary">{t("library.specialty")}: {condition.specialty}</p> : null}
            </Link>
          ))}
        </div>
      )}
      <MedicalDisclaimer className="mt-6" />
    </div>
  );
}
