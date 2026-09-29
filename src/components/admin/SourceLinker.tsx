import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function SourceLinker({
  entityTable,
  entityLabelField,
  linkTable,
  entityForeignKey,
  title = "ربط المصادر",
}: {
  entityTable: "symptoms" | "conditions" | "questions" | "red_flags" | "first_aid_topics";
  entityLabelField: "name_ar" | "question_ar" | "title_ar";
  linkTable: "symptom_sources" | "condition_sources" | "question_sources" | "red_flag_sources" | "first_aid_sources";
  entityForeignKey: "symptom_id" | "condition_id" | "question_id" | "red_flag_id" | "first_aid_topic_id";
  title?: string;
}) {
  const qc = useQueryClient();
  const [entityId, setEntityId] = useState("");
  const [sourceId, setSourceId] = useState("");

  const q = useQuery({
    queryKey: ["admin", "source-linker", linkTable],
    queryFn: async () => {
      const [entities, sources, links] = await Promise.all([
        supabase.from(entityTable).select(`id,${entityLabelField}`).order(entityLabelField),
        supabase.from("medical_sources").select("id,title,organization,url,is_active").eq("is_active", true).order("title"),
        supabase.from(linkTable as never).select("*"),
      ]);
      if (entities.error) throw entities.error;
      if (sources.error) throw sources.error;
      if (links.error) throw links.error;
      return {
        entities: (entities.data ?? []) as unknown as Record<string, unknown>[],
        sources: sources.data ?? [],
        links: (links.data ?? []) as unknown as Record<string, unknown>[],
      };
    },
  });

  const links = useMemo(
    () => (q.data?.links ?? []).filter((l) => String(l[entityForeignKey] ?? "") === entityId),
    [q.data?.links, entityForeignKey, entityId],
  );

  const add = useMutation({
    mutationFn: async () => {
      if (!entityId || !sourceId) throw new Error("اختر المحتوى والمصدر.");
      const payload = { [entityForeignKey]: entityId, source_id: sourceId };
      const { error } = await supabase.from(linkTable as never).insert(payload as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم ربط المصدر");
      setSourceId("");
      qc.invalidateQueries({ queryKey: ["admin", "source-linker", linkTable] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر الحفظ"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const q = supabase.from(linkTable as never).delete().eq(entityForeignKey as never, entityId as never).eq("source_id" as never, id as never);
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "source-linker", linkTable] }),
  });

  if (q.isPending) return null;
  const linkedSourceIds = new Set(links.map((l) => String(l["source_id"] ?? "")));

  return (
    <section className="mt-6 glass rounded-3xl p-5">
      <h3 className="text-base font-bold">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">كل معلومة طبية مهمة يجب أن تكون قابلة للتتبع إلى مصدر واضح.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <select className={cls} value={entityId} onChange={(e) => setEntityId(e.target.value)}>
          <option value="">اختر المحتوى</option>
          {(q.data?.entities ?? []).map((entity) => <option key={String(entity["id"])} value={String(entity["id"])}>{String(entity[entityLabelField] ?? "—")}</option>)}
        </select>
        <select className={cls} value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
          <option value="">اختر المصدر</option>
          {(q.data?.sources ?? []).filter((s) => !linkedSourceIds.has(s.id)).map((s) => <option key={s.id} value={s.id}>{s.title}{s.organization ? ` — ${s.organization}` : ""}</option>)}
        </select>
        <button type="button" disabled={!entityId || !sourceId || add.isPending} onClick={() => add.mutate()} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">ربط</button>
      </div>

      {entityId ? (
        <div className="mt-4 divide-y divide-border">
          {links.map((link) => {
            const source = q.data?.sources.find((s) => s.id === String(link["source_id"] ?? ""));
            if (!source) return null;
            return (
              <div key={source.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div><b>{source.title}</b>{source.organization ? <span className="mr-2 text-xs text-muted-foreground">{source.organization}</span> : null}</div>
                <div className="flex items-center gap-3">
                  {source.url ? <a href={source.url} target="_blank" rel="noreferrer" className="text-primary"><ExternalLink className="size-4" /></a> : null}
                  <button type="button" onClick={() => remove.mutate(source.id)} className="text-destructive"><Trash2 className="size-4" /></button>
                </div>
              </div>
            );
          })}
          {!links.length ? <p className="py-4 text-sm text-muted-foreground">لا توجد مصادر مرتبطة بعد.</p> : null}
        </div>
      ) : null}
    </section>
  );
}
const cls = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none";
