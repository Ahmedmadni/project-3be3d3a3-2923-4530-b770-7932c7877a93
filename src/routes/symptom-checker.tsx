import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import type { BasicInfo, SymptomDetail, AnswerMap, SessionInput } from "@/types/medical";
import { referenceQuery } from "@/lib/reference-data";
import { DynamicQuestionEngine } from "@/engines/dynamic-question-engine";
import { runSafetyPipeline } from "@/engines/pipeline";
import { ENGINE_VERSION } from "@/engines/condition-matching-engine";
import { extractWithFallback, mockExtractor, selectableCandidates, type ExtractionResult } from "@/engines/symptom-extraction";
import { RealSymptomExtractionService } from "@/engines/real-extraction";
import { extractSymptomsAI } from "@/lib/extract.functions";
import { useI18n } from "@/i18n";
import { appConfig } from "@/config/app";
import { resultStore, guestId } from "@/lib/session-store";
import { saveSymptomSession } from "@/lib/sessions.functions";
import { ProgressStepper, SymptomChip, SymptomSearch, SeveritySelector, OptionGroup, QuestionCard, Field, inputCls } from "@/components/health/wizard-ui";
import { MedicalDisclaimer } from "@/components/health/MedicalDisclaimer";
import { ErrorState, LoadingState } from "@/components/health/cards";

export const Route = createFileRoute("/symptom-checker")({
  loader: ({ context }) => context.queryClient.ensureQueryData(referenceQuery),
  head: () => ({
    meta: [
      { title: "فحص الأعراض — مؤشر صحي" },
      { name: "description", content: "أجب عن أسئلة بسيطة لمعرفة الحالات المحتملة ومستوى الرعاية." },
      { property: "og:title", content: "فحص الأعراض — مؤشر صحي" },
      { property: "og:description", content: "فحص أعراض استرشادي خطوة بخطوة." },
    ],
  }),
  pendingComponent: LoadingState,
  errorComponent: () => <ErrorState />,
  component: Wizard,
});

const steps = ["معلومات أساسية", "العرض الرئيسي", "صف ما تشعر به", "تفاصيل الأعراض", "أسئلة متابعة"];
const emptyDetail: SymptomDetail = { onset: "", pattern: "", severity: "", triggers: "", associated: "" };

function Wizard() {
  const { data: ref } = useSuspenseQuery(referenceQuery);
  const save = useServerFn(saveSymptomSession);
  const extractAI = useServerFn(extractSymptomsAI);
  const { t } = useI18n();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [basic, setBasic] = useState<BasicInfo>({ age: "", sex: "", pregnant: "", chronic: "", medications: "" });
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [description, setDescription] = useState("");
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [extractionSelection, setExtractionSelection] = useState<string[]>([]);
  const [extractionFailed, setExtractionFailed] = useState(false);
  const [details, setDetails] = useState<Record<string, SymptomDetail>>({});
  const [answers, setAnswers] = useState<AnswerMap>({});

  const symptoms = ref.symptoms.filter((s) => s.is_active);
  const name = (id: string) => symptoms.find((s) => s.id === id)?.name_ar ?? "";
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const setDetail = (id: string, patch: Partial<SymptomDetail>) => setDetails((d) => ({ ...d, [id]: { ...emptyDetail, ...d[id], ...patch } }));
  const questions = useMemo(() => DynamicQuestionEngine.visibleQuestions(ref, selected, answers), [ref, selected, answers]);

  const finish = async () => {
    // drop answers to questions no longer visible
    const visible = new Set(questions.map((q) => q.id));
    const cleanAnswers = Object.fromEntries(Object.entries(answers).filter(([k]) => visible.has(k)));
    const input: SessionInput = { basic, symptomIds: selected, details, answers: cleanAnswers, description };
    const { triage, results } = runSafetyPipeline(ref, input, { contentMode: appConfig.contentMode });
    const emergency = triage.level === "emergency";
    setBusy(true);
    let sessionId: string | null = null;
    let knowledgeReleaseVersion: string | null = null;
    try {
      const r = await save({ data: {
        guestSessionId: guestId(),
        status: emergency ? "emergency_redirected" : "completed",
        careLevel: triage.level,
        age: Number(basic.age), sex: basic.sex as "male" | "female",
        pregnancy: basic.pregnant || null,
        description,
        symptoms: selected.map((id) => ({
          symptomId: id, severity: details[id]?.severity || null, startedWhen: details[id]?.onset ?? "",
          pattern: details[id]?.pattern || "unknown", aggravating: details[id]?.triggers ?? "",
        })),
        answers: Object.entries(cleanAnswers).map(([questionId, value]) => ({ questionId, value })),
        results: results.map((r, i) => ({ conditionId: r.conditionId, score: r.internalScore, level: r.compatibilityLevel, explanation: { reasonCodes: r.reasonCodes, matched: r.matchedSymptoms, contradicting: r.contradictingSymptoms }, rank: i + 1 })),
        engineVersion: ENGINE_VERSION,
      } });
      sessionId = r.sessionId;
      knowledgeReleaseVersion = r.knowledgeReleaseVersion;
    } catch {
      // Saving is best-effort; never block the safety flow.
    }
    resultStore.save({ sessionId, triage, results, symptomIds: selected, knowledgeReleaseVersion });
    setBusy(false);
    nav({ to: emergency ? "/emergency" : "/results" });
  };

  const next = async () => {
    setError("");
    const age = Number(basic.age);
    if (step === 0 && (!Number.isInteger(age) || age < 1 || age > 120 || !basic.sex)) return setError("يرجى إدخال العمر والجنس بشكل صحيح.");
    if (step === 1 && selected.length === 0) return setError("اختر عرضًا واحدًا على الأقل.");
    if (step === 2 && description.trim()) {
      setBusy(true);
      setExtractionFailed(false);
      const service = appConfig.symptomExtraction === "real"
        ? new RealSymptomExtractionService(async (payload) =>
            extractAI({ data: { ...payload, guestId: guestId() } }))
        : mockExtractor;
      const extracted = await extractWithFallback(service, description, symptoms);
      setBusy(false);
      if (!extracted) {
        setExtraction(null);
        setExtractionSelection([]);
        setExtractionFailed(true);
      } else {
        setExtraction(extracted);
        setExtractionSelection(
          selectableCandidates(extracted)
            .map((x) => x.symptomId)
            .filter((id) => !selected.includes(id)),
        );
      }
    }
    if (step === 4 && DynamicQuestionEngine.missing(questions, answers).length) return setError("يرجى الإجابة عن جميع الأسئلة.");
    if (step < steps.length - 1) return setStep(step + 1);
    await finish();
  };

  const filtered = symptoms.filter((s) => s.name_ar.includes(search.trim()));

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
            <Field label="أمراض مزمنة" hint="اختياري، لا تُحفظ"><input className={inputCls} value={basic.chronic} onChange={(e) => setBasic({ ...basic, chronic: e.target.value })} /></Field>
            <Field label="أدوية مستخدمة" hint="اختياري، لا تُحفظ"><input className={inputCls} value={basic.medications} onChange={(e) => setBasic({ ...basic, medications: e.target.value })} /></Field>
          </div>
        )}
        {step === 1 && (
          <>
            <SymptomSearch value={search} onChange={setSearch} />
            <div className="flex flex-wrap gap-2">
              {filtered.length ? filtered.map((s) => <SymptomChip key={s.id} label={s.name_ar} selected={selected.includes(s.id)} onToggle={() => toggle(s.id)} />)
                : <p className="text-sm text-muted-foreground">لا توجد أعراض مطابقة.</p>}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <textarea rows={6} maxLength={4000} className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="مثال: أشعر بدوخة وتعب منذ ثلاثة أيام وتزداد الدوخة عندما أقف..." />
            <p className="text-xs text-muted-foreground">يمكنك الكتابة بطريقتك، وسنساعدك لاحقًا على استخراج الأعراض من الوصف.</p>
          </>
        )}
        {step === 3 && (
          <>
            {extractionFailed ? (
              <div className="rounded-2xl bg-warning-soft p-4 text-sm text-warning">{t("extract.failed")}</div>
            ) : null}
            {extraction ? (
              <div className="space-y-3 rounded-2xl bg-primary-soft/60 p-4">
                <div>
                  <p className="text-sm font-semibold">{t("extract.found")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t("extract.foundHint")}</p>
                </div>
                {selectableCandidates(extraction).length ? (
                  <div className="flex flex-wrap gap-2">
                    {selectableCandidates(extraction).map((candidate) => (
                      <SymptomChip
                        key={candidate.symptomId}
                        label={name(candidate.symptomId)}
                        selected={extractionSelection.includes(candidate.symptomId)}
                        onToggle={() =>
                          setExtractionSelection((prev) =>
                            prev.includes(candidate.symptomId)
                              ? prev.filter((id) => id !== candidate.symptomId)
                              : [...prev, candidate.symptomId],
                          )
                        }
                      />
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">{t("extract.none")}</p>}
                {extraction.candidates.some((x) => x.negated) ? (
                  <p className="text-xs text-muted-foreground">
                    {t("extract.negated")} {extraction.candidates.filter((x) => x.negated).map((x) => name(x.symptomId)).filter(Boolean).join("، ")}
                  </p>
                ) : null}
                {extraction.unresolvedTerms.length ? (
                  <p className="text-xs text-muted-foreground">{t("extract.unresolved")} {extraction.unresolvedTerms.join("، ")}</p>
                ) : null}
                {extractionSelection.length ? (
                  <button
                    type="button"
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                    onClick={() => {
                      setSelected((prev) => [...new Set([...prev, ...extractionSelection])]);
                      setExtractionSelection([]);
                    }}
                  >
                    {t("extract.confirm")}
                  </button>
                ) : null}
              </div>
            ) : null}
            {selected.map((id) => {
              const d = details[id] ?? emptyDetail;
              return (
                <div key={id} className="space-y-3 rounded-2xl bg-card p-4 ring-1 ring-border">
                  <h2 className="font-bold text-primary">{name(id)}</h2>
                  <Field label="متى بدأ؟"><input className={inputCls} value={d.onset} onChange={(e) => setDetail(id, { onset: e.target.value })} placeholder="مثال: منذ يومين" /></Field>
                  <Field label="هل هو مستمر أم متقطع؟"><OptionGroup options={[{ value: "continuous", label: "مستمر" }, { value: "intermittent", label: "متقطع" }, { value: "unknown", label: "لا أعرف" }]} value={d.pattern} onChange={(v) => setDetail(id, { pattern: v as SymptomDetail["pattern"] })} /></Field>
                  <Field label="مستوى الشدة"><SeveritySelector value={d.severity} onChange={(v) => setDetail(id, { severity: v })} /></Field>
                  <Field label="هل يزداد مع شيء معين؟"><input className={inputCls} value={d.triggers} onChange={(e) => setDetail(id, { triggers: e.target.value })} /></Field>
                  <Field label="هل توجد أعراض مصاحبة؟"><input className={inputCls} value={d.associated} onChange={(e) => setDetail(id, { associated: e.target.value })} /></Field>
                </div>
              );
            })}
          </>
        )}
        {step === 4 && (questions.length ? questions.map((q) => (
          <QuestionCard key={q.id} question={q} value={answers[q.id] ?? ""} onChange={(v) => setAnswers({ ...answers, [q.id]: v })} />
        )) : <p className="text-sm text-muted-foreground">لا توجد أسئلة متابعة لهذه الأعراض.</p>)}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-3 pt-2">
          {step > 0 && <button type="button" onClick={() => setStep(step - 1)} className="flex-1 rounded-2xl bg-card py-3.5 font-semibold ring-1 ring-border">السابق</button>}
          <button type="button" disabled={busy} onClick={next} className="flex-1 rounded-2xl bg-gradient-primary py-3.5 font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
            {busy ? "جارٍ التحليل..." : step === steps.length - 1 ? "عرض النتائج" : "التالي"}
          </button>
        </div>
      </section>
      <MedicalDisclaimer />
    </div>
  );
}
