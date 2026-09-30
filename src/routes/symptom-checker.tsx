import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import type { BasicInfo, SymptomDetail, AnswerMap, SessionInput } from "@/types/medical";
import { referenceQuery } from "@/lib/reference-data";
import {
  confirmedSymptomIdsFromAnswers,
  visibleClarifyingQuestions,
  visibleSafetyQuestions,
} from "@/engines/assessment-question-engine";
import { runSafetyPipeline } from "@/engines/pipeline";
import { ENGINE_VERSION } from "@/engines/condition-matching-engine";
import { mockExtractor, selectableCandidates, extractWithFallback } from "@/engines/symptom-extraction";
import { RealSymptomExtractionService } from "@/engines/real-extraction";
import { extractSymptomsAI } from "@/lib/extract.functions";
import { localized, useI18n } from "@/i18n";
import { arabicIncludes } from "@/lib/arabic";
import { appConfig } from "@/config/app";
import { resultStore, guestId } from "@/lib/session-store";
import { saveSymptomSession } from "@/lib/sessions.functions";
import {
  ProgressStepper,
  SymptomChip,
  SymptomSearch,
  SeveritySelector,
  OptionGroup,
  QuestionCard,
  Field,
  inputCls,
} from "@/components/health/wizard-ui";
import { MedicalDisclaimer } from "@/components/health/MedicalDisclaimer";
import { ErrorState, LoadingState } from "@/components/health/cards";
import { PageVisualHeader } from "@/components/health/PageVisualHeader";
import checkerGuide from "@/assets/symptom-checker-guide.jpg";
import checkerSticker from "@/assets/sticker-symptom-check.png";

export const Route = createFileRoute("/symptom-checker")({
  staticData: { sitemap: true },
  loader: ({ context }) => context.queryClient.ensureQueryData(referenceQuery),
  head: () => ({
    meta: [
      { title: "فحص الأعراض — مؤشر صحي" },
      { name: "description", content: "فحص أعراض سريع يركز على المعلومات التي تؤثر في مستوى الرعاية والنتائج." },
      { property: "og:title", content: "فحص الأعراض — مؤشر صحي" },
      { property: "og:description", content: "فحص أعراض استرشادي مبسط خطوة بخطوة." },
    ],
  }),
  pendingComponent: LoadingState,
  errorComponent: () => <ErrorState />,
  component: Wizard,
});

const emptyDetail: SymptomDetail = {
  onset: "",
  pattern: "",
  severity: "",
  triggers: "",
  associated: "",
};

function Wizard() {
  const { data: ref } = useSuspenseQuery(referenceQuery);
  const save = useServerFn(saveSymptomSession);
  const nav = useNavigate();
  const { t, lang } = useI18n();

  const steps = [
    t("checker.step.basic"),
    t("checker.step.symptom"),
    t("checker.step.safetyDetails"),
    t("checker.step.followup"),
  ];

  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [basic, setBasic] = useState<BasicInfo>({
    age: "",
    sex: "",
    pregnant: "",
    chronic: "",
    medications: "",
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [description, setDescription] = useState("");
  const [suggested, setSuggested] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [negated, setNegated] = useState<string[]>([]);
  const [unresolved, setUnresolved] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const extractAI = useServerFn(extractSymptomsAI);
  const [extraction, setExtraction] = useState<{ source: "ai" | "mock"; suggested: string[]; confirmed: string[]; negated: string[]; unresolvedCount: number } | null>(null);
  const [details, setDetails] = useState<Record<string, SymptomDetail>>({});
  const [answers, setAnswers] = useState<AnswerMap>({});

  const symptoms = ref.symptoms.filter((symptom) => symptom.is_active);

  const symptomLabel = (id: string) => {
    const symptom = symptoms.find((item) => item.id === id);
    if (!symptom) return "";
    const value = localized(symptom as unknown as Record<string, unknown>, "name", lang);
    if (value) return value;
    return lang === "en" ? `${t("common.notTranslated")} (${symptom.code})` : symptom.name_ar;
  };

  const toggle = (id: string) =>
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  const setDetail = (id: string, patch: Partial<SymptomDetail>) =>
    setDetails((current) => ({
      ...current,
      [id]: { ...emptyDetail, ...current[id], ...patch },
    }));

  const safetyQuestions = useMemo(
    () => visibleSafetyQuestions(ref, selected, answers),
    [ref, selected, answers],
  );

  const clarifyingQuestions = useMemo(
    () => visibleClarifyingQuestions(
      ref,
      selected,
      answers,
      appConfig.contentMode,
      4,
    ),
    [ref, selected, answers],
  );

  const questions = useMemo(
    () => [...safetyQuestions, ...clarifyingQuestions],
    [safetyQuestions, clarifyingQuestions],
  );

  const buildInput = (): SessionInput => {
    const visible = new Set(questions.map((question) => question.id));
    const cleanAnswers = Object.fromEntries(
      Object.entries(answers).filter(([questionId]) => visible.has(questionId)),
    );
    return {
      basic,
      symptomIds: selected,
      details,
      answers: cleanAnswers,
      description,
    };
  };

  const finish = async () => {
    const input = buildInput();
    const { triage, results } = runSafetyPipeline(ref, input, {
      contentMode: appConfig.contentMode,
    });
    const emergency = triage.level === "emergency";
    const confirmedSymptoms = confirmedSymptomIdsFromAnswers(
      ref,
      selected,
      input.answers,
      appConfig.contentMode,
    );
    const savedSymptomIds = [...new Set([...selected, ...confirmedSymptoms])];

    setBusy(true);
    let sessionId: string | null = null;
    let knowledgeReleaseVersion: string | null = null;
    let conditionSnapshots: Record<string, Record<string, unknown>> = {};

    try {
      const response = await save({
        data: {
          guestSessionId: guestId(),
          status: emergency ? "emergency_redirected" : "completed",
          careLevel: triage.level,
          age: Number(basic.age),
          sex: basic.sex as "male" | "female",
          pregnancy: basic.pregnant || null,
          description,
          symptoms: savedSymptomIds.map((id) => ({
            symptomId: id,
            severity: details[id]?.severity || null,
            startedWhen: "",
            pattern: "unknown",
            aggravating: "",
          })),
          answers: Object.entries(input.answers).map(([questionId, value]) => ({
            questionId,
            value,
          })),
          results: results.map((result, index) => ({
            conditionId: result.conditionId,
            score: result.internalScore,
            level: result.compatibilityLevel,
            explanation: {
              reasonCodes: result.reasonCodes,
              matched: result.matchedSymptoms,
              contradicting: result.contradictingSymptoms,
            },
            rank: index + 1,
          })),
          engineVersion: ENGINE_VERSION,
          extraction: extraction
            ? { ...extraction, confirmed: extraction.confirmed.filter((id) => selected.includes(id)), model: extraction.source === "ai" ? "openai/gpt-6-astra" : null }
            : null,
        },
      });

      sessionId = response.sessionId;
      knowledgeReleaseVersion = response.knowledgeReleaseVersion;
      conditionSnapshots = response.conditionSnapshots as unknown as Record<string, Record<string, unknown>>;
    } catch {
      // Saving is best-effort; never block the safety flow.
    }

    resultStore.save({
      sessionId,
      triage,
      results,
      symptomIds: savedSymptomIds,
      knowledgeReleaseVersion,
      engineVersion: ENGINE_VERSION,
      savedAt: new Date().toISOString(),
      conditionSnapshots,
      extraction: extraction ? { source: extraction.source, confirmed: extraction.confirmed.filter((id) => selected.includes(id)), negated: extraction.negated } : null,
    });

    setBusy(false);
    nav({ to: emergency ? "/emergency" : "/results" });
  };

  const analyzeDescription = async () => {
    if (!description.trim()) return;

    setBusy(true);
    setNotice("");
    setError("");
    let rateLimited = false;

    const service = appConfig.symptomExtraction === "real"
      ? new RealSymptomExtractionService(async (payload) => {
          const response = await extractAI({
            data: { ...payload, guestId: guestId() },
          });
          if (!response.ok && response.error === "RATE_LIMITED") rateLimited = true;
          return response.ok ? response : { ok: false, error: response.error };
        })
      : mockExtractor;

    let result = await extractWithFallback(service, description, symptoms);
    if (!result && !rateLimited) {
      result = await extractWithFallback(mockExtractor, description, symptoms);
    }

    setBusy(false);

    if (!result) {
      setNotice(rateLimited ? t("extract.rateLimited") : t("extract.failed"));
      return;
    }

    const ids = selectableCandidates(result)
      .map((candidate) => candidate.symptomId)
      .filter((id) => !selected.includes(id));

    setSuggested(ids);
    setPicked(ids);
    setExtraction({
      source: result.source,
      suggested: ids,
      confirmed: [],
      negated: result.candidates.filter((c) => c.negated).map((c) => c.symptomId),
      unresolvedCount: result.unresolvedTerms.length,
    });
    setNegated(result.candidates.filter((candidate) => candidate.negated).map((candidate) => candidate.symptomId));
    setUnresolved(result.unresolvedTerms);

    if (!ids.length) setNotice(t("extract.none"));
  };

  const next = async () => {
    setError("");

    const age = Number(basic.age);
    if (step === 0 && (!Number.isInteger(age) || age < 1 || age > 120 || !basic.sex)) {
      setError(t("checker.errorBasic"));
      return;
    }

    if (step === 1 && selected.length === 0) {
      if (description.trim()) {
        await analyzeDescription();
        setError(t("checker.errorConfirmSymptoms"));
      } else {
        setError(t("checker.errorSymptom"));
      }
      return;
    }

    if (step === 2) {
      const missingSeverity = selected.some((id) => !details[id]?.severity);
      if (missingSeverity) {
        setError(t("checker.errorSeverity"));
        return;
      }

      const input = buildInput();
      const currentSafety = runSafetyPipeline(ref, input, {
        contentMode: appConfig.contentMode,
      });

      if (currentSafety.triage.level === "emergency") {
        await finish();
        return;
      }

      if (questions.length === 0) {
        await finish();
        return;
      }
    }

    if (step === 3 && questions.some((question) => !answers[question.id])) {
      setError(t("checker.errorQuestions"));
      return;
    }

    if (step < steps.length - 1) {
      setStep(step + 1);
      return;
    }

    await finish();
  };

  const filtered = symptoms.filter((symptom) => {
    const label = symptomLabel(symptom.id);
    const needle = search.trim();
    if (!needle) return true;

    return lang === "ar"
      ? arabicIncludes(label, needle)
      : label.toLowerCase().includes(needle.toLowerCase()) ||
          symptom.code.toLowerCase().includes(needle.toLowerCase());
  });

  const separator = lang === "ar" ? "، " : ", ";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageVisualHeader title={t("checker.step.symptom")} subtitle={t("home.entry.symptoms.desc")} image={checkerGuide} imageAlt="استخدام الهاتف لتسجيل الأعراض الصحية" sticker={checkerSticker} />
      <ProgressStepper steps={steps} current={step} />

      <section key={step} className="glass space-y-4 rounded-3xl p-5 animate-rise md:p-7">
        <div>
          <h1 className="text-xl font-extrabold">{steps[step]}</h1>
          {step === 1 ? (
            <p className="mt-1 text-sm text-muted-foreground">{t("checker.symptomStepHint")}</p>
          ) : null}
          {step === 2 ? (
            <p className="mt-1 text-sm text-muted-foreground">{t("checker.safetyDetailsHint")}</p>
          ) : null}
          {step === 3 ? (
            <p className="mt-1 text-sm text-muted-foreground">{t("checker.followupQuestionsHint")}</p>
          ) : null}
        </div>

        {step === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("checker.age")}>
              <input
                type="number"
                inputMode="numeric"
                className={inputCls}
                value={basic.age}
                onChange={(event) => setBasic({ ...basic, age: event.target.value })}
              />
            </Field>

            <Field label={t("checker.sex")}>
              <OptionGroup
                options={[
                  { value: "male", label: t("checker.male") },
                  { value: "female", label: t("checker.female") },
                ]}
                value={basic.sex}
                onChange={(value) => setBasic({ ...basic, sex: value as BasicInfo["sex"] })}
              />
            </Field>

            {basic.sex === "female" && Number(basic.age) >= 12 && Number(basic.age) <= 55 ? (
              <Field label={t("checker.pregnancy")}>
                <OptionGroup
                  options={[
                    { value: "yes", label: t("checker.yes") },
                    { value: "no", label: t("checker.no") },
                    { value: "unsure", label: lang === "ar" ? t("checker.unsureFemale") : t("checker.unsure") },
                  ]}
                  value={basic.pregnant}
                  onChange={(value) => setBasic({ ...basic, pregnant: value as BasicInfo["pregnant"] })}
                />
              </Field>
            ) : null}
          </div>
        ) : null}

        {step === 1 ? (
          <>
            <SymptomSearch value={search} onChange={setSearch} />

            {selected.length ? (
              <p className="text-xs font-semibold text-primary">
                {t("checker.selectedCount", { count: selected.length })}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {filtered.length ? (
                filtered.map((symptom) => (
                  <SymptomChip
                    key={symptom.id}
                    label={symptomLabel(symptom.id)}
                    selected={selected.includes(symptom.id)}
                    onToggle={() => toggle(symptom.id)}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">{t("checker.noSymptoms")}</p>
              )}
            </div>

            <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
              <Field label={t("checker.descriptionOptional")} hint={t("checker.descriptionOptionalHint")}>
                <textarea
                  rows={4}
                  maxLength={4000}
                  className={inputCls}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={t("checker.descriptionPlaceholder")}
                />
              </Field>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={busy || !description.trim()}
                  onClick={analyzeDescription}
                  className="rounded-xl bg-primary-soft px-4 py-2.5 text-sm font-semibold text-primary disabled:opacity-50"
                >
                  {busy ? t("extract.analyzing") : t("extract.analyze")}
                </button>
                <p className="text-xs text-muted-foreground">{t("checker.descriptionHint")}</p>
              </div>
            </div>

            {notice ? (
              <p className="rounded-2xl bg-muted p-3 text-sm text-muted-foreground">{notice}</p>
            ) : null}

            {suggested.length > 0 ? (
              <div className="space-y-3 rounded-2xl bg-primary-soft/60 p-4">
                <p className="text-sm font-bold">{t("extract.found")}</p>
                <p className="text-xs text-muted-foreground">{t("extract.foundHint")}</p>

                <div className="flex flex-wrap gap-2">
                  {suggested.map((id) => (
                    <SymptomChip
                      key={id}
                      label={symptomLabel(id)}
                      selected={picked.includes(id)}
                      onToggle={() =>
                        setPicked((current) =>
                          current.includes(id)
                            ? current.filter((item) => item !== id)
                            : [...current, id],
                        )
                      }
                    />
                  ))}
                </div>

                {negated.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t("extract.negated")} {negated.map(symptomLabel).join(separator)}
                  </p>
                ) : null}

                {unresolved.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t("extract.unresolved")} {unresolved.join(separator)}
                  </p>
                ) : null}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelected((current) => [...new Set([...current, ...picked])]);
                      setExtraction((current) => current ? { ...current, confirmed: [...new Set([...current.confirmed, ...picked])] } : current);
                      setSuggested([]);
                      setPicked([]);
                      setNotice(t("extract.confirmed"));
                      setError("");
                    }}
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                  >
                    {t("extract.confirm")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSuggested([]);
                      setPicked([]);
                    }}
                    className="rounded-xl bg-card px-4 py-2 text-sm ring-1 ring-border"
                  >
                    {t("extract.skip")}
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {step === 2 ? (
          <div className="space-y-3">
            {selected.map((id) => {
              const detail = details[id] ?? emptyDetail;
              return (
                <div key={id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
                  <h2 className="font-bold text-primary">{symptomLabel(id)}</h2>
                  <div className="mt-3">
                    <Field label={t("checker.severity")}>
                      <SeveritySelector
                        value={detail.severity}
                        onChange={(severity) => setDetail(id, { severity })}
                      />
                    </Field>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {step === 3 ? (
          questions.length ? (
            <div className="space-y-6">
              {safetyQuestions.length ? (
                <div className="space-y-3">
                  <div>
                    <h2 className="text-sm font-extrabold">{t("checker.safetyQuestionGroup")}</h2>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("checker.safetyQuestionGroupHint")}</p>
                  </div>
                  {safetyQuestions.map((question) => (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      value={answers[question.id] ?? ""}
                      onChange={(value) => setAnswers({ ...answers, [question.id]: value })}
                    />
                  ))}
                </div>
              ) : null}

              {clarifyingQuestions.length ? (
                <div className="space-y-3">
                  <div>
                    <h2 className="text-sm font-extrabold">{t("checker.clarifierQuestionGroup")}</h2>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("checker.clarifierQuestionGroupHint")}</p>
                  </div>
                  {clarifyingQuestions.map((question) => (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      value={answers[question.id] ?? ""}
                      onChange={(value) => setAnswers({ ...answers, [question.id]: value })}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("checker.noFollowupQuestions")}</p>
          )
        ) : null}

        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}

        <div className="flex gap-3 pt-2">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex-1 rounded-2xl bg-card py-3.5 font-semibold ring-1 ring-border"
            >
              {t("checker.previous")}
            </button>
          ) : null}

          <button
            type="button"
            disabled={busy}
            onClick={next}
            className="flex-1 rounded-2xl bg-gradient-primary py-3.5 font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
          >
            {busy
              ? t("checker.analyzing")
              : step === steps.length - 1
                ? t("checker.showResults")
                : t("checker.next")}
          </button>
        </div>
      </section>

      <MedicalDisclaimer />
    </div>
  );
}
