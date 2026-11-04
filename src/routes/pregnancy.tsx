import { createFileRoute } from "@tanstack/react-router";
import { PregnancyTracker } from "@/components/health/PregnancyTracker";

export const Route = createFileRoute("/pregnancy")({
  staticData: { sitemap: true },
  head: () => ({ meta: [
    { title: "متابعة الحمل من البداية — مؤشر صحي" },
    { name: "description", content: "متابعة الحمل وجداول الطعام والأدوية، مع إرشادات متخصصة لسكري الحمل والضغط وفقر الدم وعامل Rh والتوأم، والفحوص وعلامات الخطر." },
    { property: "og:title", content: "رحلة الحمل — مؤشر صحي" },
    { property: "og:description", content: "جداول الحمل بحسب المراحل، ومتابعة متخصصة للسكري والضغط وفقر الدم والتوأم، مع علامات الخطر والفحوص." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: PregnancyTracker,
});