import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FirstAidCard, PageHeader, EmergencyAlert, LoadingState, ErrorState } from "@/components/health/cards";

const topicsQuery = queryOptions({
  queryKey: ["first-aid-topics"],
  queryFn: async () => {
    const { data, error } = await supabase.from("first_aid_topics").select("*").eq("is_active", true).order("priority");
    if (error) throw error;
    return data;
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
  const [q, setQ] = useState("");
  const list = topics.filter((t) => t.title_ar.includes(q.trim()));
  return (
    <div>
      <PageHeader title="الإسعافات الأولية" subtitle="خطوات أولية واضحة حتى وصول المساعدة." />
      <EmergencyAlert className="mb-4" />
      <label className="relative mb-6 block">
        <Search className="absolute inset-y-0 right-4 my-auto size-5 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن الحالة..." className="w-full rounded-2xl border border-input bg-card py-3.5 pr-12 pl-4 text-sm outline-none focus:ring-2 focus:ring-ring" />
      </label>
      {list.length === 0 ? (
        <p className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">لا توجد نتائج مطابقة.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((t) => <FirstAidCard key={t.id} topic={t} />)}
        </div>
      )}
    </div>
  );
}
