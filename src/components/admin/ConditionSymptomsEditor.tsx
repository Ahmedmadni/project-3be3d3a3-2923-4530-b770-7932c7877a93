import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function ConditionSymptomsEditor() {
  const qc = useQueryClient();
  const [conditionId, setConditionId] = useState("");
  const [symptomId, setSymptomId] = useState("");
  const [relationship, setRelationship] = useState("supports");
  const [weight, setWeight] = useState("1");
  const [core, setCore] = useState(false);

  const q = useQuery({
    queryKey: ["admin", "condition-symptoms-editor"],
    queryFn: async () => {
      const [conditions, symptoms, links] = await Promise.all([
        supabase.from("conditions").select("id,name_ar,is_demo").order("name_ar"),
        supabase.from("symptoms").select("id,name_ar").order("name_ar"),
        supabase.from("condition_symptoms").select("*"),
      ]);
      if (conditions.error) throw conditions.error;
      if (symptoms.error) throw symptoms.error;
      if (links.error) throw links.error;
      return { conditions: conditions.data ?? [], symptoms: symptoms.data ?? [], links: links.data ?? [] };
    },
  });

  const selectedCondition = q.data?.conditions.find((c) => c.id === conditionId);
  const links = useMemo(() => (q.data?.links ?? []).filter((l) => l.condition_id === conditionId), [q.data?.links, conditionId]);

  const add = useMutation({
    mutationFn: async () => {
      if (!conditionId || !symptomId) throw new Error("اختر الحالة والعرض.");
      const { error } = await supabase.from("condition_symptoms").insert({
        condition_id: conditionId,
        symptom_id: symptomId,
        relationship_type: relationship as "supports" | "weak_support" | "neutral" | "contradicts",
        weight: Number(weight) || 0,
        is_core_symptom: core,
        is_demo: selectedCondition?.is_demo ?? true,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("تم ربط العرض بالحالة"); setSymptomId(""); qc.invalidateQueries({ queryKey: ["admin", "condition-symptoms-editor"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر الحفظ"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("condition_symptoms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "condition-symptoms-editor"] }),
  });

  if (q.isPending) return null;

  const symptomName = (id: string) => q.data?.symptoms.find((s) => s.id === id)?.name_ar ?? id;

  return (
    <section className="mt-6 glass rounded-3xl p-5">
      <h3 className="text-base font-bold">ربط الأعراض بالحالات</h3>
      <p className="mt-1 text-xs text-muted-foreground">الأوزان هنا مسودة وليست معرفة طبية معتمدة حتى تمر بالمراجعة.</p>

      <div className="mt-4 grid gap-3 md:grid-cols-5">
        <select className={cls} value={conditionId} onChange={(e) => setConditionId(e.target.value)}>
          <option value="">اختر الحالة</option>
          {(q.data?.conditions ?? []).map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
        </select>
        <select className={cls} value={symptomId} onChange={(e) => setSymptomId(e.target.value)}>
          <option value="">اختر العرض</option>
          {(q.data?.symptoms ?? []).filter((s) => !links.some((l) => l.symptom_id === s.id)).map((s) => <option key={s.id} value={s.id}>{s.name_ar}</option>)}
        </select>
        <select className={cls} value={relationship} onChange={(e) => setRelationship(e.target.value)}>
          <option value="supports">يدعم</option><option value="weak_support">دعم ضعيف</option><option value="neutral">محايد</option><option value="contradicts">يتعارض</option>
        </select>
        <input className={cls} type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="الوزن" />
        <button type="button" disabled={!conditionId || !symptomId || add.isPending} onClick={() => add.mutate()} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">ربط</button>
      </div>
      <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={core} onChange={(e) => setCore(e.target.checked)} /> عرض أساسي</label>

      {conditionId ? (
        <div className="mt-4 divide-y divide-border">
          {links.map((link) => (
            <div key={link.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <div><b>{symptomName(link.symptom_id)}</b><span className="mr-2 text-xs text-muted-foreground">{link.relationship_type} · وزن {link.weight}{link.is_core_symptom ? " · أساسي" : ""}</span></div>
              <button type="button" onClick={() => remove.mutate(link.id)} className="text-destructive"><Trash2 className="size-4" /></button>
            </div>
          ))}
          {!links.length ? <p className="py-4 text-sm text-muted-foreground">لا توجد أعراض مرتبطة بهذه الحالة.</p> : null}
        </div>
      ) : null}
    </section>
  );
}
const cls = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none";
