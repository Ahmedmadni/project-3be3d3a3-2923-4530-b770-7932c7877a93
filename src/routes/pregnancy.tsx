import { createFileRoute } from "@tanstack/react-router";
import { PregnancyTracker } from "@/components/health/PregnancyTracker";

export const Route = createFileRoute("/pregnancy")({
  staticData: { sitemap: true },
  head: () => ({ meta: [
    { title: "متابعة الحمل من البداية — مؤشر صحي" },
    { name: "description", content: "متابعة الحمل وإرشادات الطعام والنشاط حسب الأشهر ومراحل الحمل: ما يُتجنّب، وما يجوز بشروط، وما يُنصح به، مع متابعة يومية خاصة." },
    { property: "og:title", content: "رحلة الحمل — مؤشر صحي" },
    { property: "og:description", content: "دليل المأكولات والنشاط والعناية خلال الأشهر 1–3 و4–6 و7–9، مع حساب أسابيع الحمل والمتابعة اليومية." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: PregnancyTracker,
});