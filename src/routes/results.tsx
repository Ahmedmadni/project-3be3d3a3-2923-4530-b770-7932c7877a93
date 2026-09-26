import { createFileRoute, Link } from "@tanstack/react-router";
import { mockResults } from "@/data/conditions";
import { ResultCard, PageHeader } from "@/components/health/cards";
import { MedicalDisclaimer } from "@/components/health/MedicalDisclaimer";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "الحالات المحتملة — مؤشر صحي" },
      { name: "description", content: "حالات محتملة مرتبطة بأعراضك مع مستوى التوافق." },
      { property: "og:title", content: "الحالات المحتملة — مؤشر صحي" },
      { property: "og:description", content: "نتائج استرشادية لا تؤكد أو تستبعد أي مرض." },
    ],
  }),
  component: Results,
});

function Results() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="الحالات المحتملة المرتبطة بأعراضك" />
      <MedicalDisclaimer text="هذه النتائج لا تؤكد أو تستبعد وجود أي مرض." className="mb-5" />
      <div className="grid gap-4 md:grid-cols-2">{mockResults.map((r) => <ResultCard key={r.condition.id} result={r} />)}</div>
      <Link to="/symptom-checker" className="mt-6 inline-block text-sm font-semibold text-primary">فحص جديد</Link>
    </div>
  );
}
