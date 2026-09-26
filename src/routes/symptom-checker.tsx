import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { symptoms, symptomName } from "@/data/symptoms";
import { questionsFor } from "@/data/questions";
import { RedFlagEngine, severityMap } from "@/lib/red-flag-engine";
import { sessionStore } from "@/lib/session-store";
import type { BasicInfo, SymptomDetail } from "@/types/medical";
import { ProgressStepper, SymptomChip, SymptomSearch, SeveritySelector, OptionGroup, QuestionCard, Field, inputCls } from "@/components/health/wizard-ui";
import { MedicalDisclaimer } from "@/components/health/MedicalDisclaimer";

export const Route = createFileRoute("/symptom-checker")({
  head: () => ({
    meta: [
      { title: "فحص الأعراض — مؤشر صحي" },
      { name: "description", content: "أجب عن أسئلة بسيطة لمعرفة الحالات المحتملة ومستوى الرعاية." },
      { property: "og:title", content: "فحص الأعراض — مؤشر صحي" },
      { property: "og:description", content: "فحص أعراض استرشادي خطوة بخطوة." },
    ],
  }),
  component: Wizard,
});

const steps = ["معلومات أساسية", "العرض الرئيسي", "صف ما تشعر به", "تفاصيل الأعراض", "أسئلة متابعة"];
const emptyDetail: SymptomDetail = { onset: "", pattern: "", severity: "", triggers: "", associated: "" };

function Wizard() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [basic, setBasic] = useState<BasicInfo>({ age: "", sex: "", pregnant: "", chronic: "", medications: "" });
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [description, setDescription] = useState("");
  const [details, setDetails] = useState<Record<string, SymptomDetail>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const setDetail = (id: string, patch: Partial<SymptomDetail>) => setDetails((d) => ({ ...d, [id]: { ...emptyDetail, ...d[id], ...patch } }));

  const next = () => {
    setError("");
    const age = Number(basic.age);
    if (step === 0 && (!age || age < 1 || age > 120 || !basic.sex)) return setError("يرجى إدخال العمر والجنس بشكل صحيح.");
    if (step === 1 && selected.length === 0) return setError("اختر عرضًا واحدًا على الأقل.");
    if (step < steps.length - 1) return setStep(step + 1);
    const ans = Object.entries(answers).map(([questionId, value]) => ({ questionId, value }));
    const triage = RedFlagEngine.evaluate({ symptoms: selected, answers: ans, severity: severityMap(details), age, basic });
    sessionStore.save({ session: { id: crypto.randomUUID(), basic, symptomIds: selected, description, details, answers: ans, createdAt: new Date().toISOString() }, triage });
    nav({ to: triage.level === "emergency" ? "/emergency" : "/results" });
  };

  const filtered = symptoms.filter((s) => s.name.includes(search.trim()));

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <ProgressStepper steps={steps} current={step} />
      <section key={step} className="glass space-y-4 rounded-3xl p-5 animate-rise md:p-7">
        <h1 className="text-xl font-extrabold">{steps[step]}</h1>
        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="العمر"><input type="number" inputMode="numeric" className={inputCls} value={basic.age} onChange={(e) => setBasic({ ...basic, age: e.target.value })} /></Field>
            <Field label="الجنس"><OptionGroup options={[{ value: "male", label: "ذكر" }, { value: "female", label: "أنثى" }]} value={basic.sex} onChange={(v) => setBasic({ ...basic, sex: v as BasicInfo["sex"] })} /></Field>
            {basic.sex === "female" && Number(basic.age) >= 12 && Number(basic.age) <= 55 && (
              <Field label="هل يوجد حمل؟"><OptionGroup options={[{ value: "yes", label: "نعم" }, { value: "no", label: "لا" }, { value: "unsure", label: "غير متأكدة" }]} value={basic.pregnant} onChange={(v) => setBasic({ ...basic, pregnant: v as BasicInfo["pregnant"] })} /></Field>
            )}
            <Field label="أمراض مزمنة" hint="اختياري"><input className={inputCls} value={basic.chronic} onChange={(e) => setBasic({ ...basic, chronic: e.target.value })} /></Field>
            <Field label="أدوية مستخدمة" hint="اختياري"><input className={inputCls} value={basic.medications} onChange={(e) => setBasic({ ...basic, medications: e.target.value })} /></Field>
          </div>
        )}
        {step === 1 && (
          <>
            <SymptomSearch value={search} onChange={setSearch} />
            <div className="flex flex-wrap gap-2">
              {filtered.length ? filtered.map((s) => <SymptomChip key={s.id} label={s.name} selected={selected.includes(s.id)} onToggle={() => toggle(s.id)} />)
                : <p className="text-sm text-muted-foreground">لا توجد أعراض مطابقة.</p>}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <textarea rows={6} className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="مثال: أشعر بدوخة وتعب منذ ثلاثة أيام وتزداد الدوخة عندما أقف..." />
            <p className="text-xs text-muted-foreground">يمكنك الكتابة بطريقتك، وسنساعدك لاحقًا على استخراج الأعراض من الوصف.</p>
          </>
        )}
        {step === 3 && selected.map((id) => {
          const d = details[id] ?? emptyDetail;
          return (
            <div key={id} className="space-y-3 rounded-2xl bg-card p-4 ring-1 ring-border">
              <h2 className="font-bold text-primary">{symptomName(id)}</h2>
              <Field label="متى بدأ؟"><input className={inputCls} value={d.onset} onChange={(e) => setDetail(id, { onset: e.target.value })} placeholder="مثال: منذ يومين" /></Field>
              <Field label="هل هو مستمر أم متقطع؟"><OptionGroup options={[{ value: "continuous", label: "مستمر" }, { value: "intermittent", label: "متقطع" }]} value={d.pattern} onChange={(v) => setDetail(id, { pattern: v as SymptomDetail["pattern"] })} /></Field>
              <Field label="مستوى الشدة"><SeveritySelector value={d.severity} onChange={(v) => setDetail(id, { severity: v })} /></Field>
              <Field label="هل يزداد مع شيء معين؟"><input className={inputCls} value={d.triggers} onChange={(e) => setDetail(id, { triggers: e.target.value })} /></Field>
              <Field label="هل توجد أعراض مصاحبة؟"><input className={inputCls} value={d.associated} onChange={(e) => setDetail(id, { associated: e.target.value })} /></Field>
            </div>
          );
        })}
        {step === 4 && questionsFor(selected).map((q) => (
          <QuestionCard key={q.id} question={q} value={answers[q.id] ?? ""} onChange={(v) => setAnswers({ ...answers, [q.id]: v })} />
        ))}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-3 pt-2">
          {step > 0 && <button type="button" onClick={() => setStep(step - 1)} className="flex-1 rounded-2xl bg-card py-3.5 font-semibold ring-1 ring-border">السابق</button>}
          <button type="button" onClick={next} className="flex-1 rounded-2xl bg-gradient-primary py-3.5 font-semibold text-primary-foreground shadow-glow">
            {step === steps.length - 1 ? "عرض النتائج" : "التالي"}
          </button>
        </div>
      </section>
      <MedicalDisclaimer />
    </div>
  );
}
