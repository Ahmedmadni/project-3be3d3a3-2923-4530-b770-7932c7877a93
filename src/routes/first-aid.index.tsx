import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { firstAidTopics } from "@/data/first-aid";
import { FirstAidCard, PageHeader, EmergencyAlert } from "@/components/health/cards";

export const Route = createFileRoute("/first-aid/")({
  head: () => ({
    meta: [
      { title: "الإسعافات الأولية — مؤشر صحي" },
      { name: "description", content: "دليل مبسط للتعامل الأولي مع الحالات الشائعة." },
      { property: "og:title", content: "الإسعافات الأولية — مؤشر صحي" },
      { property: "og:description", content: "النزيف، الحروق، الاختناق، الإغماء وغيرها." },
    ],
  }),
  component: FirstAid,
});

function FirstAid() {
  const [q, setQ] = useState("");
  const list = firstAidTopics.filter((t) => t.title.includes(q.trim()));
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
          {list.map((t) => <FirstAidCard key={t.slug} topic={t} />)}
        </div>
      )}
    </div>
  );
}
