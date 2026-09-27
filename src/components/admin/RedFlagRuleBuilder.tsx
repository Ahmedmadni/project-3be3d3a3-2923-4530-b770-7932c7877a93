import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function RedFlagRuleBuilder() {
  const qc = useQueryClient();
  const [flagId, setFlagId] = useState("");
  const [symptomId, setSymptomId] = useState("");
  const [questionId, setQuestionId] = useState("");
  const [severity, setSeverity] = useState("");
  const [value, setValue] = useState("");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");

  const q = useQuery({
    queryKey: ["admin", "red-flag-builder"],
    queryFn: async () => {
      const [flags, symptoms, questions, rules] = await Promise.all([
        supabase.from("red_flags").select("id,title_ar").order("priority"),
        supabase.from("symptoms").select("id,name_ar").order("name_ar"),
        supabase.from("questions").select("id,question_ar").order("sort_order"),
        supabase.from("red_flag_rules").select("*"),
      ]);
      if (flags.error) throw flags.error;
      if (symptoms.error) throw symptoms.error;
      if (questions.error) throw questions.error;
      if (rules.error) throw rules.error;
      return { flags: flags.data ?? [], symptoms: symptoms.data ?? [], questions: questions.data ?? [], rules: rules.data ?? [] };
    },
  });

  const rules = useMemo(() => (q.data?.rules ?? []).filter((r) => r.red_flag_id === flagId), [q.data?.rules, flagId]);

  const add = useMutation({
    mutationFn: async () => {
      if (!flagId) throw new Error("اختر علامة الخطر.");
      if (!symptomId && !questionId) throw new Error("اختر عرضًا أو سؤالًا للقاعدة.");
      const { error } = await supabase.from("red_flag_rules").insert({
        red_flag_id: flagId,
        symptom_id: symptomId || null,
        question_id: questionId || null,
        operator: "equals",
        value: value || null,
        severity: severity ? severity as "mild" | "moderate" | "severe" : null,
        min_age: minAge ? Number(minAge) : null,
        max_age: maxAge ? Number(maxAge) : null,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("تمت إضافة قاعدة الخطر"); qc.invalidateQueries({ queryKey: ["admin", "red-flag-builder"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر الحفظ"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("red_flag_rules").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "red-flag-builder"] }),
  });

  if (q.isPending) return null;
  const symptomName = (id: string | null) => q.data?.symptoms.find((x) => x.id === id)?.name_ar ?? "";
  const questionName = (id: string | null) => q.data?.questions.find((x) => x.id === id)?.question_ar ?? "";

  return (
    <section className="mt-6 glass rounded-3xl p-5">
      <h3 className="text-base font-bold">محرر قواعد علامات الخطر</h3>
      <p className="mt-1 text-xs text-muted-foreground">أي تعديل في قواعد الخطر يجب أن يمر بالمراجعة الطبية قبل الاعتماد.</p>

      <select className={cls} value={flagId} onChange={(e) => setFlagId(e.target.value)}>
        <option value="">اختر علامة الخطر</option>
        {(q.data?.flags ?? []).map((f) => <option key={f.id} value={f.id}>{f.title_ar}</option>)}
      </select>

      {flagId ? (
        <>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <select className={cls} value={symptomId} onChange={(e) => setSymptomId(e.target.value)}>
              <option value="">عرض (اختياري)</option>{(q.data?.symptoms ?? []).map((s) => <option key={s.id} value={s.id}>{s.name_ar}</option>)}
            </select>
            <select className={cls} value={questionId} onChange={(e) => setQuestionId(e.target.value)}>
              <option value="">سؤال (اختياري)</option>{(q.data?.questions ?? []).map((x) => <option key={x.id} value={x.id}>{x.question_ar}</option>)}
            </select>
            <select className={cls} value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="">أي شدة</option><option value="mild">خفيفة</option><option value="moderate">متوسطة</option><option value="severe">شديدة</option>
            </select>
            <input className={cls} value={value} onChange={(e) => setValue(e.target.value)} placeholder="قيمة الإجابة مثل yes" />
            <input className={cls} type="number" min={0} value={minAge} onChange={(e) => setMinAge(e.target.value)} placeholder="أقل عمر" />
            <input className={cls} type="number" min={0} value={maxAge} onChange={(e) => setMaxAge(e.target.value)} placeholder="أعلى عمر" />
          </div>
          <button type="button" className="mt-3 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground" onClick={() => add.mutate()}>إضافة قاعدة</button>

          <div className="mt-4 divide-y divide-border">
            {rules.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs">
                <span>
                  {r.symptom_id ? `العرض: ${symptomName(r.symptom_id)}` : ""}
                  {r.question_id ? ` السؤال: ${questionName(r.question_id)} = ${r.value ?? "أي قيمة"}` : ""}
                  {r.severity ? ` · الشدة: ${r.severity}` : ""}
                  {r.min_age != null || r.max_age != null ? ` · العمر: ${r.min_age ?? 0}–${r.max_age ?? "∞"}` : ""}
                </span>
                <button onClick={() => remove.mutate(r.id)} className="text-destructive"><Trash2 className="size-4" /></button>
              </div>
            ))}
            {!rules.length ? <p className="py-4 text-sm text-muted-foreground">لا توجد قواعد لهذه العلامة.</p> : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
const cls = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none";
