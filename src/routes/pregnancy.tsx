import { createFileRoute } from "@tanstack/react-router";
import { PregnancyTracker } from "@/components/health/PregnancyTracker";

export const Route = createFileRoute("/pregnancy")({
  staticData: { sitemap: true },
  head: () => ({ meta: [
    { title: "الحمل والولادة والنفاس — مؤشر صحي" },
    { name: "description", content: "متابعة الحمل أسبوعًا بأسبوع، والاستعداد للولادة والمخاض والنفاس، مع علامات الخطر والفحوص والتوجيهات الموثقة." },
    { property: "og:title", content: "الحمل والولادة — مؤشر صحي" },
    { property: "og:description", content: "دليل الحمل والولادة والنفاس، وإرشادات عاجلة ومتابعة الرعاية والفحوص." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: PregnancyTracker,
});