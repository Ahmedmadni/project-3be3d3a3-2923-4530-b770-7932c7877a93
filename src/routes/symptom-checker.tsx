import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import type { BasicInfo, SymptomDetail, AnswerMap, SessionInput } from "@/types/medical";
import { referenceQuery } from "@/lib/reference-data";
import { DynamicQuestionEngine } from "@/engines/dynamic-question-engine";
import { runSafetyPipeline } from "@/engines/pipeline";
import { ENGINE_VERSION } from "@/engines/condition-matching-engine";
import { mockExtractor, selectableCandidates, extractWithFallback } from "@/engines/symptom-extraction";
import { RealSymptomExtractionService } from "@/engines/real-extraction";
import { extractSymptomsAI } from "@/lib/extract.functions";
import { useI18n } from "@/i18n";
import { localizedText } from "@/i18n/localized";
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

const emptyDetail: SymptomDetail = { onset: "", pattern: "", severity: "", triggers: "", associated: "" };

function Wizard() {
  const { data: ref } = useSuspenseQuery(referenceQuery);
  const save = useServerFn(saveSymptomSession);
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [basic, setBasic] = useState<BasicInfo>({ age: "", sex: "", pregnant: "", chronic: "", medications: "" });
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [description, setDescription] = useState("");
  const [suggested, setSuggested] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [negated, setNegated] = useState<string[]>([]);
  const [unresolved, setUnresolved] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const extractAI = useServerFn(extractSymptomsAI);
  const { t, lang } = useI18n();
  const steps = [t("checker.step.basic"), t("checker.step.symptom"), t("checker.step.describe"), t("checker.step.details"), t("checker.step.followup")];
  const [details, setDetails] = useState<Record<string, SymptomDetail>>({});
  const [answers, setAnswers] = useState<AnswerMap>({});

  const symptoms = ref.symptoms.filter((s) => s.is_active);
  const name = (id: string) => {
    const symptom = symptoms.find((s) => s.id === id);
    return symptom ? localizedText(lang, symptom.name_ar, symptom.name_en, t("common.notTranslated")) : "";
  };
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
    if (step === 0 && (!Number.isInteger(age) || age < 1 || age > 120 || !basic.sex)) return setError(t("checker.error.basic"));
    if (step === 1 && selected.length === 0) return setError(t("checker.error.symptom"));
    if (step === 2 && description.trim()) {
      setBusy(true);
      setNotice("");
      let rateLimited = false;
      const svc = appConfig.symptomExtraction === "real"
        ? new RealSymptomExtractionService(async (p) => {
            const r = await extractAI({ data: { ...p, guestId: guestId() } });
            if (!r.ok && r.error === "RATE_LIMITED") rateLimited = true;
            return r.ok ? r : { ok: false, error: r.error };
          })
        : mockExtractor;
      let res = await extractWithFallback(svc, description, symptoms);
      if (!res && !rateLimited) res = await extractWithFallback(mockExtractor, description, symptoms);
      setBusy(false);
      if (!res) setNotice(rateLimited ? t("extract.rateLimited") : t("extract.failed"));
      else {
        const ids = selectableCandidates(res).map((x) => x.symptomId).filter((id) => !selected.includes(id));
        setSuggested(ids);
        setNegated(res.candidates.filter((c) => c.negated).map((c) => c.symptomId));
        setUnresolved(res.unresolvedTerms);
        if (!ids.length) setNotice(t("extract.none"));
      }
    }
    if (step === 4 && DynamicQuestionEngine.missing(questions, answers).length) return setError(t("checker.error.questions"));
    if (step < steps.length - 1) return setStep(step + 1);
    await finish();
  };

  const filtered = symptoms.filter((s) => localizedText(lang, s.name_ar, s.name_en, "").toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <ProgressStepper steps={steps} current={step} />
      <section key={step} className="glass space-y-4 rounded-3xl p-5 animate-rise md:p-7">
        <h1 className="text-xl font-extrabold">{steps[step]}</h1>
        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("checker.age")}><input type="number" inputMode="numeric" className={inputCls} value={basic.age} onChange={(e) => setBasic({ ...basic, age: e.target.value })} /></Field>
            <Field label={t("checker.sex")}><OptionGroup options={[{ value: "male", label: t("checker.male") }, { value: "female", label: t("checker.female") }]} value={basic.sex} onChange={(v) => setBasic({ ...basic, sex: v as BasicInfo["sex"] })} /></Field>
            {basic.sex === "female" && Number(basic.age) >= 12 && Number(basic.age) <= 55 && (
              <Field label={t("checker.pregnant")}><OptionGroup options={[{ value: "yes", label: t("checker.yes") }, { value: "no", label: t("checker.no") }, { value: "unsure", label: t("checker.unsure") }]} value={basic.pregnant} onChange={(v) => setBasic({ ...basic, pregnant: v as BasicInfo["pregnant"] })} /></Field>
            )}
            <Field label={t("checker.chronic")} hint={t("checker.optionalNoSave")}><input className={inputCls} value={basic.chronic} onChange={(e) => setBasic({ ...basic, chronic: e.target.value })} /></Field>
            <Field label={t("checker.medications")} hint={t("checker.optionalNoSave")}><input className={inputCls} value={basic.medications} onChange={(e) => setBasic({ ...basic, medications: e.target.value })} /></Field>
          </div>
        )}
        {step === 1 && (
          <>
            <SymptomSearch value={search} onChange={setSearch} />
            <div className="flex flex-wrap gap-2">
              {filtered.length ? filtered.map((s) => <SymptomChip key={s.id} label={localizedText(lang, s.name_ar, s.name_en, t("common.notTranslated"))} selected={selected.includes(s.id)} onToggle={() => toggle(s.id)} />)
                : <p className="text-sm text-muted-foreground">{t("checker.noSearchResults")}</p>}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <textarea rows={6} maxLength={4000} className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("checker.descriptionPlaceholder")} />
            <p className="text-xs text-muted-foreground">{t("checker.descriptionHint")}</p>
          </>
        )}
        {step === 3 && (
          <>
            {notice && <p className="rounded-2xl bg-muted p-3 text-sm text-muted-foreground">{notice}</p>}
            {suggested.length > 0 && (
              <div className="space-y-3 rounded-2xl bg-primary-soft/60 p-4">
                <p className="text-sm font-bold">{t("extract.found")}</p>
                <p className="text-xs text-muted-foreground">{t("extract.foundHint")}</p>
                <div className="flex flex-wrap gap-2">{suggested.map((id) => <SymptomChip key={id} label={name(id)} selected={picked.includes(id)} onToggle={() => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))} />)}</div>
                {negated.length > 0 && <p className="text-xs text-muted-foreground">{t("extract.negated")} {negated.map(name).join("، ")}</p>}
                {unresolved.length > 0 && <p className="text-xs text-muted-foreground">{t("extract.unresolved")} {unresolved.join("، ")}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setSelected((s) => [...new Set([...s, ...picked])]); setSuggested([]); setPicked([]); setNotice(t("extract.confirmed")); }} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{t("extract.confirm")}</button>
                  <button type="button" onClick={() => { setSuggested([]); setPicked([]); }} className="rounded-xl bg-card px-4 py-2 text-sm ring-1 ring-border">{t("extract.skip")}</button>
                </div>
              </div>
            )}
            {selected.map((id) => {
              const d = details[id] ?? emptyDetail;
              return (
                <div key={id} className="space-y-3 rounded-2xl bg-card p-4 ring-1 ring-border">
                  <h2 className="font-bold text-primary">{name(id)}</h2>
                  <Field label={t("checker.onset")}><input className={inputCls} value={d.onset} onChange={(e) => setDetail(id, { onset: e.target.value })} placeholder={t("checker.onsetPlaceholder")} /></Field>
                  <Field label={t("checker.pattern")}><OptionGroup options={[{ value: "continuous", label: t("checker.continuous") }, { value: "intermittent", label: t("checker.intermittent") }, { value: "unknown", label: t("checker.unknown") }]} value={d.pattern} onChange={(v) => setDetail(id, { pattern: v as SymptomDetail["pattern"] })} /></Field>
                  <Field label={t("checker.severity")}><SeveritySelector value={d.severity} onChange={(v) => setDetail(id, { severity: v })} /></Field>
                  <Field label={t("checker.triggers")}><input className={inputCls} value={d.triggers} onChange={(e) => setDetail(id, { triggers: e.target.value })} /></Field>
                  <Field label={t("checker.associated")}><input className={inputCls} value={d.associated} onChange={(e) => setDetail(id, { associated: e.target.value })} /></Field>
                </div>
              );
            })}
          </>
        )}
        {step === 4 && (questions.length ? questions.map((q) => (
          <QuestionCard key={q.id} question={q} value={answers[q.id] ?? ""} onChange={(v) => setAnswers({ ...answers, [q.id]: v })} />
        )) : <p className="text-sm text-muted-foreground">{t("checker.noQuestions")}</p>)}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-3 pt-2">
          {step > 0 && <button type="button" onClick={() => setStep(step - 1)} className="flex-1 rounded-2xl bg-card py-3.5 font-semibold ring-1 ring-border">{t("common.previous")}</button>}
          <button type="button" disabled={busy} onClick={next} className="flex-1 rounded-2xl bg-gradient-primary py-3.5 font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
            {busy ? t("checker.analyzing") : step === steps.length - 1 ? t("checker.showResults") : t("common.next")}
          </button>
        </div>
      </section>
      <MedicalDisclaimer />
    </div>
  );
}
