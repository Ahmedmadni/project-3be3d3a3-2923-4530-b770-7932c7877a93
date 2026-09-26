import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { referenceQuery } from "@/lib/reference-data";
import { appConfig } from "@/config/app";
import { PageHeader, LoadingState, ErrorState } from "@/components/health/cards";
import { MedicalDisclaimer } from "@/components/health/MedicalDisclaimer";

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
  const list = data.conditions.filter((c) => c.is_active && (appConfig.contentMode === "development" || c.review_status === "reviewed"));
  return (
    <div>
      <PageHeader title="المكتبة الصحية" subtitle="معلومات مبسطة لفهم الحالات الشائعة." />
      {list.length === 0 ? <p className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">لا يوجد محتوى معتمد بعد.</p> : (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((c) => (
            <Link key={c.id} to="/conditions/$conditionId" params={{ conditionId: c.id }} className="glass rounded-3xl p-5">
              <h2 className="font-bold">{c.name_ar}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{c.summary_ar}</p>
              <p className="mt-3 text-xs text-primary">التخصص: {c.specialty}</p>
            </Link>
          ))}
        </div>
      )}
      <MedicalDisclaimer className="mt-6" />
    </div>
  );
}
