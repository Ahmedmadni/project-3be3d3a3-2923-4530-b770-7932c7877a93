import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { appConfig } from "@/config/app";
import { isPublicFirstAidTopicVisible } from "@/lib/public-content";
import { FirstAidCard, EmergencyAlert, LoadingState, ErrorState } from "@/components/health/cards";
import { PageVisualHeader } from "@/components/health/PageVisualHeader";
import { localized, useI18n } from "@/i18n";
import { arabicIncludes } from "@/lib/arabic";
import { cn } from "@/lib/utils";
import firstAidGuide from "@/assets/first-aid-guide.jpg";
import firstAidSticker from "@/assets/sticker-first-aid.png";

const topicsQuery = queryOptions({
  queryKey: ["first-aid-topics", appConfig.contentMode],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("first_aid_topics")
      .select("*")
      .order("priority");

    if (error) throw error;
    return data.filter((topic) => isPublicFirstAidTopicVisible(topic, appConfig.contentMode));
  },
});

export const Route = createFileRoute("/first-aid/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(topicsQuery),
  head: () => ({
    meta: [
      { title: "الإسعافات الأولية — مؤشر صحي" },
      { name: "description", content: "دليل مبسط للتعامل الأولي مع الحالات الشائعة." },
      { property: "og:title", content: "الإسعافات الأولية — مؤشر صحي" },
      { property: "og:description", content: "النزيف، الحروق، الاختناق، الإغماء وغيرها." },
    ],
  }),
  pendingComponent: LoadingState,
  errorComponent: () => <ErrorState />,
  component: FirstAid,
});

function FirstAid() {
  const { data: topics } = useSuspenseQuery(topicsQuery);
  const { lang, dir, t } = useI18n();
  const [q, setQ] = useState("");

  const list = topics.filter((topic) => {
    const label = localized(topic as unknown as Record<string, unknown>, "title", lang);
    if (!label) return false;
    const needle = q.trim();
    if (!needle) return true;
    return lang === "ar"
      ? arabicIncludes(label, needle)
      : label.toLowerCase().includes(needle.toLowerCase()) || topic.code.toLowerCase().includes(needle.toLowerCase());
  });

  return (
    <div>
      <PageVisualHeader title={t("firstAid.title")} subtitle={t("firstAid.subtitle")} image={firstAidGuide} imageAlt="حقيبة إسعافات أولية منظمة" sticker={firstAidSticker}>
        <div className="mt-3 flex items-start gap-2 rounded-2xl bg-primary-soft p-3 text-xs leading-5 text-primary">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          <span>{t("firstAid.publicHint")}</span>
        </div>
      </PageVisualHeader>

      <EmergencyAlert className="mb-4" />

      <label className="relative mb-6 block">
        <Search className={cn("absolute inset-y-0 my-auto size-5 text-muted-foreground", dir === "rtl" ? "right-4" : "left-4")} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("firstAid.search")}
          className={cn(
            "w-full rounded-2xl border border-input bg-card py-3.5 text-sm outline-none focus:ring-2 focus:ring-ring",
            dir === "rtl" ? "pr-12 pl-4" : "pl-12 pr-4",
          )}
        />
      </label>

      {topics.length === 0 ? (
        <p className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">
          {t(appConfig.contentMode === "production" ? "firstAid.noPublishedTopics" : "firstAid.noResults")}
        </p>
      ) : list.length === 0 ? (
        <p className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">{t("firstAid.noResults")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((topic) => <FirstAidCard key={topic.id} topic={topic} />)}
        </div>
      )}
    </div>
  );
}
