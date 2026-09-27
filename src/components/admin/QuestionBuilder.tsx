import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function QuestionBuilder() {
  const qc = useQueryClient();
  const [questionId, setQuestionId] = useState("");
  const [optionValue, setOptionValue] = useState("");
  const [optionAr, setOptionAr] = useState("");
  const [optionEn, setOptionEn] = useState("");
  const [triggerType, setTriggerType] = useState("symptom");
  const [symptomId, setSymptomId] = useState("");
  const [parentQuestionId, setParentQuestionId] = useState("");
  const [expectedValue, setExpectedValue] = useState("");
  const [operator, setOperator] = useState("equals");

  const q = useQuery({
    queryKey: ["admin", "question-builder"],
    queryFn: async () => {
      const [questions, symptoms, options, rules] = await Promise.all([
        supabase.from("questions").select("id,question_ar,question_type").order("sort_order"),
        supabase.from("symptoms").select("id,name_ar").order("name_ar"),
        supabase.from("question_options").select("*").order("sort_order"),
        supabase.from("question_rules").select("*").order("priority"),
      ]);
      if (questions.error) throw questions.error;
      if (symptoms.error) throw symptoms.error;
      if (options.error) throw options.error;
      if (rules.error) throw rules.error;
      return { questions: questions.data ?? [], symptoms: symptoms.data ?? [], options: options.data ?? [], rules: rules.data ?? [] };
    },
  });

  const options = useMemo(() => (q.data?.options ?? []).filter((o) => o.question_id === questionId), [q.data?.options, questionId]);
  const rules = useMemo(() => (q.data?.rules ?? []).filter((r) => r.question_id === questionId), [q.data?.rules, questionId]);

  const addOption = useMutation({
    mutationFn: async () => {
      if (!questionId || !optionValue.trim() || !optionAr.trim()) throw new Error("أكمل بيانات الخيار.");
      const { error } = await supabase.from("question_options").insert({
        question_id: questionId,
        value: optionValue.trim(),
        label_ar: optionAr.trim(),
        label_en: optionEn.trim() || null,
        sort_order: options.length,
      });
      if (error) throw error;
    },
    onSuccess: () => { setOptionValue(""); setOptionAr(""); setOptionEn(""); toast.success("تمت إضافة الخيار"); qc.invalidateQueries({ queryKey: ["admin", "question-builder"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر الحفظ"),
  });

  const addRule = useMutation({
    mutationFn: async () => {
      if (!questionId) throw new Error("اختر السؤال.");
      const { error } = await supabase.from("question_rules").insert({
        question_id: questionId,
        trigger_type: triggerType,
        symptom_id: triggerType === "symptom" ? symptomId || null : null,
        parent_question_id: triggerType === "answer" ? parentQuestionId || null : null,
        operator,
        expected_value: triggerType === "answer" ? expectedValue || null : null,
        priority: rules.length,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("تمت إضافة القاعدة"); qc.invalidateQueries({ queryKey: ["admin", "question-builder"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر الحفظ"),
  });

  const removeOption = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("question_options").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "question-builder"] }),
  });
  const removeRule = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("question_rules").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "question-builder"] }),
  });

  if (q.isPending) return null;
  const questionName = (id: string) => q.data?.questions.find((x) => x.id === id)?.question_ar ?? id;
  const symptomName = (id: string | null) => q.data?.symptoms.find((x) => x.id === id)?.name_ar ?? id ?? "";

  return (
    <section className="mt-6 glass rounded-3xl p-5">
      <h3 className="text-base font-bold">بناء الخيارات والقواعد</h3>
      <p className="mt-1 text-xs text-muted-foreground">حدد السؤال ثم أضف خياراته وقواعد ظهوره بدون تعديل JSON يدويًا.</p>
      <select className={cls} value={questionId} onChange={(e) => setQuestionId(e.target.value)}>
        <option value="">اختر السؤال</option>
        {(q.data?.questions ?? []).map((item) => <option key={item.id} value={item.id}>{item.question_ar}</option>)}
      </select>

      {questionId ? (
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
            <h4 className="font-semibold">خيارات الإجابة</h4>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <input className={cls} placeholder="value" value={optionValue} onChange={(e) => setOptionValue(e.target.value)} />
              <input className={cls} placeholder="العنوان بالعربية" value={optionAr} onChange={(e) => setOptionAr(e.target.value)} />
              <input className={cls} placeholder="English" value={optionEn} onChange={(e) => setOptionEn(e.target.value)} />
            </div>
            <button type="button" className="mt-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground" onClick={() => addOption.mutate()}>إضافة خيار</button>
            <div className="mt-3 divide-y divide-border">
              {options.map((o) => <div key={o.id} className="flex justify-between gap-3 py-2 text-sm"><span>{o.label_ar} <small className="text-muted-foreground">({o.value})</small></span><button onClick={() => removeOption.mutate(o.id)} className="text-destructive"><Trash2 className="size-4" /></button></div>)}
            </div>
          </div>

          <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
            <h4 className="font-semibold">قواعد الظهور</h4>
            <div className="mt-3 grid gap-2">
              <select className={cls} value={triggerType} onChange={(e) => setTriggerType(e.target.value)}>
                <option value="symptom">إذا تم اختيار عرض</option><option value="answer">إذا كانت إجابة سؤال</option><option value="always">دائمًا</option>
              </select>
              {triggerType === "symptom" ? (
                <select className={cls} value={symptomId} onChange={(e) => setSymptomId(e.target.value)}>
                  <option value="">اختر العرض</option>{(q.data?.symptoms ?? []).map((s) => <option key={s.id} value={s.id}>{s.name_ar}</option>)}
                </select>
              ) : null}
              {triggerType === "answer" ? (
                <>
                  <select className={cls} value={parentQuestionId} onChange={(e) => setParentQuestionId(e.target.value)}>
                    <option value="">اختر السؤال السابق</option>{(q.data?.questions ?? []).filter((x) => x.id !== questionId).map((x) => <option key={x.id} value={x.id}>{x.question_ar}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <select className={cls} value={operator} onChange={(e) => setOperator(e.target.value)}><option value="equals">يساوي</option><option value="not_equals">لا يساوي</option></select>
                    <input className={cls} placeholder="القيمة المتوقعة" value={expectedValue} onChange={(e) => setExpectedValue(e.target.value)} />
                  </div>
                </>
              ) : null}
              <button type="button" className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground" onClick={() => addRule.mutate()}>إضافة قاعدة</button>
            </div>
            <div className="mt-3 divide-y divide-border">
              {rules.map((r) => (
                <div key={r.id} className="flex justify-between gap-3 py-2 text-xs">
                  <span>
                    {r.trigger_type === "symptom" ? `إذا العرض = ${symptomName(r.symptom_id)}` :
                     r.trigger_type === "answer" ? `إذا ${questionName(r.parent_question_id ?? "")} ${r.operator} ${r.expected_value ?? ""}` : "دائمًا"}
                  </span>
                  <button onClick={() => removeRule.mutate(r.id)} className="text-destructive"><Trash2 className="size-4" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
const cls = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none";
