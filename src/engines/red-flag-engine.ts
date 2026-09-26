import type { AnswerMap, CareLevel, Severity, TriageResult } from "@/types/medical";
import type { ReferenceData } from "./reference";
import { maxCareLevel } from "./care-level";

export interface RedFlagInput {
  symptomIds: string[];
  answers: AnswerMap;
  severity: Record<string, Severity | "">;
  age?: number | undefined;
}

/**
 * RedFlagEngine — database-driven rule engine.
 * A red flag fires when ANY of its active rules matches.
 * Rule operators:
 *  - selected: symptom is selected (optionally with a given severity)
 *  - eq / neq / in: question answer comparison
 *  - any_severity: any selected symptom has the given severity
 * Age bounds (min_age/max_age) restrict a rule when set.
 * Falls back to the legacy hard-coded checks if no rules are loaded.
 */
export const RedFlagEngine = {
  evaluate(ref: Pick<ReferenceData, "redFlags" | "redFlagRules" | "symptoms" | "questions">, input: RedFlagInput): TriageResult {
    const activeFlags = ref.redFlags.filter((f) => f.is_active);
    const rules = ref.redFlagRules.filter((r) => r.is_active);
    if (activeFlags.length === 0 || rules.length === 0) return fallback(ref, input);

    const fired = activeFlags
      .filter((f) => rules.some((r) => r.red_flag_id === f.id && ruleMatches(r, input)))
      .sort((a, b) => b.priority - a.priority);

    let level: CareLevel = input.symptomIds.length > 2 ? "routine" : "self_care";
    for (const f of fired) level = maxCareLevel(level, f.care_level);
    return { level, flags: fired.map((f) => ({ code: f.code, title: f.title_ar })), source: "rules" };
  },
};

function ruleMatches(r: ReferenceData["redFlagRules"][number], input: RedFlagInput): boolean {
  if (r.min_age != null && (input.age == null || input.age < r.min_age)) return false;
  if (r.max_age != null && (input.age == null || input.age > r.max_age)) return false;
  switch (r.operator) {
    case "selected":
      if (!r.symptom_id || !input.symptomIds.includes(r.symptom_id)) return false;
      return r.severity ? input.severity[r.symptom_id] === r.severity : true;
    case "any_severity":
      return input.symptomIds.some((id) => input.severity[id] === (r.severity ?? r.value));
    default: {
      if (!r.question_id) return false;
      const v = input.answers[r.question_id];
      if (v === undefined) return false;
      if (r.operator === "neq") return v !== r.value;
      if (r.operator === "in") return (r.value ?? "").split(",").includes(v);
      return v === r.value;
    }
  }
}

/** Legacy mock logic kept as a safety net when rules are unavailable. */
function fallback(ref: Pick<ReferenceData, "symptoms" | "questions">, input: RedFlagInput): TriageResult {
  const sid = (code: string) => ref.symptoms.find((s) => s.code === code)?.id ?? code;
  const qid = (code: string) => ref.questions.find((q) => q.code === code)?.id ?? code;
  const flags: { code: string; title: string }[] = [];
  const has = (c: string) => input.symptomIds.includes(sid(c));
  if (has("chest_pain") && input.severity[sid("chest_pain")] === "severe") flags.push({ code: "severe_chest_pain", title: "ألم صدر شديد" });
  if (has("shortness_of_breath") && (input.severity[sid("shortness_of_breath")] === "severe" || input.answers[qid("dy_rest")] === "yes")) flags.push({ code: "severe_dyspnea", title: "صعوبة شديدة في التنفس" });
  if (has("fainting") || input.answers[qid("dz_faint")] === "yes") flags.push({ code: "loss_of_consciousness", title: "فقدان وعي" });
  if (flags.length) return { level: "emergency", flags, source: "fallback" };
  if (Object.values(input.severity).includes("severe")) return { level: "urgent", flags: [{ code: "any_severe_symptom", title: "عرض شديد" }], source: "fallback" };
  return { level: input.symptomIds.length > 2 ? "routine" : "self_care", flags: [], source: "fallback" };
}
