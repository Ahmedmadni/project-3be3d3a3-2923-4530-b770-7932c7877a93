import { createFileRoute } from "@tanstack/react-router";
import { PregnancyTracker } from "@/components/health/PregnancyTracker";

export const Route = createFileRoute("/pregnancy")({
  staticData: { sitemap: true },
  head: () => ({ meta: [
    { title: "متابعة الحمل من البداية — مؤشر صحي" },
    { name: "description", content: "متابعة أسابيع الحمل وموعد الولادة المتوقع، سجل يومي خاص وإرشادات عامة للعناية بالحمل وعلامات تستدعي الرعاية." },
    { property: "og:title", content: "رحلة الحمل — مؤشر صحي" },
    { property: "og:description", content: "عناية ومتابعة الحمل من أول يوم لآخر دورة، مع حساب تقديري وإرشادات آمنة." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: PregnancyTracker,
});