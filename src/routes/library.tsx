import { createFileRoute } from "@tanstack/react-router";
import { conditions } from "@/data/conditions";
import { PageHeader } from "@/components/health/cards";
import { MedicalDisclaimer } from "@/components/health/MedicalDisclaimer";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "المكتبة الصحية — مؤشر صحي" },
      { name: "description", content: "معلومات مبسطة عن الأمراض والأعراض الشائعة." },
      { property: "og:title", content: "المكتبة الصحية — مؤشر صحي" },
      { property: "og:description", content: "افهم الحالات الصحية الشائعة بلغة بسيطة." },
    ],
  }),
  component: Library,
});

function Library() {
  return (
    <div>
      <PageHeader title="المكتبة الصحية" subtitle="معلومات مبسطة لفهم الحالات الشائعة." />
      <div className="grid gap-4 sm:grid-cols-2">
        {conditions.map((c) => (
          <article key={c.id} className="glass rounded-3xl p-5">
            <h2 className="font-bold">{c.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{c.summary}</p>
            <p className="mt-3 text-xs text-primary">التخصص: {c.specialty}</p>
          </article>
        ))}
      </div>
      <MedicalDisclaimer className="mt-6" />
    </div>
  );
}
