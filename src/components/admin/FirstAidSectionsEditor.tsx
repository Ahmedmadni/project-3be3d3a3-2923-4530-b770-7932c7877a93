import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const sections = [
  ["what_is_happening", "ما الذي يحدث؟"],
  ["when_to_call", "متى أتصل بالطوارئ؟"],
  ["do_now", "ماذا أفعل الآن؟"],
  ["dont_do", "ماذا لا أفعل؟"],
  ["while_waiting", "أثناء انتظار الإسعاف"],
] as const;

export function FirstAidSectionsEditor() {
  const qc = useQueryClient();
  const [topicId, setTopicId] = useState("");

  const q = useQuery({
    queryKey: ["admin", "first-aid-sections"],
    queryFn: async () => {
      const [topics, rows] = await Promise.all([
        supabase.from("first_aid_topics").select("id,title_ar").order("priority"),
        supabase.from("first_aid_sections").select("*").order("sort_order"),
      ]);
      if (topics.error) throw topics.error;
      if (rows.error) throw rows.error;
      return { topics: topics.data ?? [], rows: rows.data ?? [] };
    },
  });

  const rows = useMemo(() => (q.data?.rows ?? []).filter((r) => r.topic_id === topicId), [q.data?.rows, topicId]);

  const save = useMutation({
    mutationFn: async ({ type, ar, en }: { type: string; ar: string; en: string }) => {
      if (!topicId) throw new Error("اختر موضوع الإسعاف.");
      const existing = rows.find((r) => r.section_type === type);
      const title = sections.find(([key]) => key === type)?.[1] ?? type;
      if (existing) {
        const { error } = await supabase.from("first_aid_sections").update({
          content_ar: ar || null,
          content_en: en || null,
          review_status: "draft",
        }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("first_aid_sections").insert({
          topic_id: topicId,
          section_type: type,
          title_ar: title,
          content_ar: ar || null,
          content_en: en || null,
          sort_order: sections.findIndex(([key]) => key === type),
          review_status: "draft",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("حُفظت المسودة — لم تُنشر للمستخدمين");
      qc.invalidateQueries({ queryKey: ["admin", "first-aid-sections"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر الحفظ"),
  });

  if (q.isPending) return null;

  return (
    <section className="mt-6 glass rounded-3xl p-5">
      <h3 className="text-base font-bold">محتوى الإسعافات الأولية</h3>
      <p className="mt-1 text-xs text-muted-foreground">التحرير هنا يحفظ المحتوى كمسودة فقط. لا يُعرض للجمهور قبل المراجعة الطبية والنشر.</p>
      <select className={cls} value={topicId} onChange={(e) => setTopicId(e.target.value)}>
        <option value="">اختر موضوع الإسعاف</option>
        {(q.data?.topics ?? []).map((topic) => <option key={topic.id} value={topic.id}>{topic.title_ar}</option>)}
      </select>

      {topicId ? (
        <div className="mt-4 space-y-4">
          {sections.map(([type, title]) => {
            const row = rows.find((r) => r.section_type === type);
            return <SectionDraft key={type} title={title} type={type} ar={row?.content_ar ?? ""} en={row?.content_en ?? ""} onSave={(ar, en) => save.mutate({ type, ar, en })} busy={save.isPending} />;
          })}
        </div>
      ) : null}
    </section>
  );
}

function SectionDraft({ title, type, ar, en, onSave, busy }: { title: string; type: string; ar: string; en: string; onSave: (ar: string, en: string) => void; busy: boolean }) {
  const [draftAr, setDraftAr] = useState(ar);
  const [draftEn, setDraftEn] = useState(en);
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
      <h4 className="font-semibold">{title}</h4>
      <textarea className={`${cls} mt-3 min-h-28`} value={draftAr} onChange={(e) => setDraftAr(e.target.value)} placeholder="المحتوى العربي بعد المراجعة الطبية..." />
      <textarea className={`${cls} mt-2 min-h-24`} dir="ltr" value={draftEn} onChange={(e) => setDraftEn(e.target.value)} placeholder="English translation — requires review" />
      <button type="button" disabled={busy} onClick={() => onSave(draftAr, draftEn)} className="mt-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">حفظ المسودة</button>
      <span className="mr-2 text-[11px] text-muted-foreground">{type}</span>
    </div>
  );
}

const cls = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none";
