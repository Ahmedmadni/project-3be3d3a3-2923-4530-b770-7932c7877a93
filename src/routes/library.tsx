import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { referenceQuery } from "@/lib/reference-data";
import { appConfig } from "@/config/app";
import { PageHeader, LoadingState, ErrorState } from "@/components/health/cards";
import { MedicalDisclaimer } from "@/components/health/MedicalDisclaimer";
import { useI18n } from "@/i18n";
import { localizedText } from "@/i18n/localized";

export const Route = createFileRoute("/library")({
  loader: ({ context }) => context.queryClient.ensureQueryData(referenceQuery),
  head: () => ({ meta: [{ title: "المكتبة الصحية — مؤشر صحي" }, { name: "description", content: "معلومات مبسطة عن الأمراض والأعراض الشائعة." }] }),
  pendingComponent: LoadingState,
  errorComponent: () => <ErrorState />,
  component: Library,
});

function Library() {
  const { data } = useSuspenseQuery(referenceQuery);
  const { lang, t } = useI18n();
  const missing = t("common.notTranslated");
  const list = data.conditions.filter((c) => c.is_active && (appConfig.contentMode === "development" || c.review_status === "published" || c.review_status === "reviewed"));
  return (
    <div>
      <PageHeader title={t("library.title")} subtitle={t("library.subtitle")} />
      {list.length === 0 ? <p className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">{t("library.empty")}</p> : (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((c) => (
            <Link key={c.id} to="/conditions/$conditionId" params={{ conditionId: c.id }} className="glass rounded-3xl p-5">
              <h2 className="font-bold">{localizedText(lang, c.name_ar, c.name_en, missing)}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{localizedText(lang, c.summary_ar, c.summary_en, missing)}</p>
              <p className="mt-3 text-xs text-primary">{t("library.specialty")}: {lang === "ar" ? (c.specialty ?? "—") : missing}</p>
            </Link>
          ))}
        </div>
      )}
      <MedicalDisclaimer className="mt-6" />
    </div>
  );
}
