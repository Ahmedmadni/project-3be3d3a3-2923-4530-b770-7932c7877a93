import { createFileRoute } from "@tanstack/react-router";
import { PregnancyTracker } from "@/components/health/PregnancyTracker";

export const Route = createFileRoute("/pregnancy")({
  staticData: { sitemap: true },
  head: () => ({ meta: [
    { title: "متابعة الحمل من البداية — مؤشر صحي" },
    { name: "description", content: "جداول الطعام والأدوية والنشاط للحامل بحسب مراحل الحمل، مع التطور أسبوعًا بأسبوع وعلامات الخطر والزيارات والفحوص والمتابعة اليومية الخاصة." },
    { property: "og:title", content: "رحلة الحمل — مؤشر صحي" },
    { property: "og:description", content: "جداول الطعام والأدوية والعناية للأشهر 1–3 و4–6 و7–9، وتطور الحمل وعلامات الخطر والفحوص." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: PregnancyTracker,
});