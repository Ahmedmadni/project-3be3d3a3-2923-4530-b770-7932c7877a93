import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { referenceQuery } from "@/lib/reference-data";
import { appConfig } from "@/config/app";
import { LoadingState, ErrorState } from "@/components/health/cards";
import { PageVisualHeader } from "@/components/health/PageVisualHeader";
import { MedicalDisclaimer } from "@/components/health/MedicalDisclaimer";
import { localized, useI18n } from "@/i18n";
import libraryGuide from "@/assets/health-library-guide.jpg";
import librarySticker from "@/assets/sticker-health-library.png";

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
  const [search, setSearch] = useState("");

  const list = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return data.conditions
      .filter((condition) =>
        condition.is_active &&
        (appConfig.contentMode === "development" || condition.review_status === "published"),
      )
      .map((condition) => ({
        condition,
        name: localized(condition as unknown as Record<string, unknown>, "name", lang),
        summary: localized(condition as unknown as Record<string, unknown>, "summary", lang),
      }))
      .filter((item) => {
        if (!item.name) return false;
        if (!needle) return true;
        return [
          item.name,
          item.summary ?? "",
          item.condition.specialty ?? "",
          item.condition.category ?? "",
          item.condition.code ?? "",
        ].some((value) => String(value).toLowerCase().includes(needle));
      });
  }, [data.conditions, lang, search]);

  const hasPublishedContent = data.conditions.some((condition) =>
    condition.is_active &&
    (appConfig.contentMode === "development" || condition.review_status === "published"),
  );

  return (
    <div>
      <PageVisualHeader title={t("library.title")} subtitle={t("library.subtitle")} image={libraryGuide} imageAlt="مراجع ومصادر صحية موثوقة" sticker={librarySticker} />

      <label className="relative mb-5 block">
        <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground rtl:right-3 ltr:right-auto ltr:left-3" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("library.search")}
          className="w-full rounded-2xl border border-border bg-card py-3 pr-10 pl-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 ltr:pr-4 ltr:pl-10"
        />
      </label>

      {!hasPublishedContent ? (
        <p className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">{t("library.empty")}</p>
      ) : list.length === 0 ? (
        <p className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">{t("library.noSearchResults")}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map(({ condition, name, summary }) => (
            <Link
              key={condition.id}
              to="/conditions/$conditionId"
              params={{ conditionId: condition.id }}
              className="glass rounded-3xl p-5 transition hover:-translate-y-0.5"
            >
              <h2 className="font-bold">{name}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{summary ?? t("common.notTranslated")}</p>
              {condition.specialty ? <p className="mt-3 text-xs text-primary">{t("library.specialty")}: {condition.specialty}</p> : null}
            </Link>
          ))}
        </div>
      )}
      <MedicalDisclaimer className="mt-6" />
    </div>
  );
}
