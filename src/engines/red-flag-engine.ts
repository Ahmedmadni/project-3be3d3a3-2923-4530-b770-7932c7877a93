import type { AnswerMap, CareLevel, Severity, TriageResult } from "@/types/medical";
import type { ReferenceData } from "./reference";
import { maxCareLevel } from "./care-level";

export interface RedFlagInput {
  symptomIds: string[];
  answers: AnswerMap;
  severity: Record<string, Severity | "">;
  age?: number | undefined;
}

export interface RedFlagOptions {
  contentMode?: "production" | "development";
}

/**
 * RedFlagEngine — database-driven safety engine.
 *
 * Safety rules:
 *  - Published production rules can only add urgency; they never suppress the
 *    legacy deterministic safety net.
 *  - Draft/demo red flags are ignored in production.
 *  - A red flag fires when ANY of its active rules matches.
 *
 * Rule operators:
 *  - selected: symptom is selected (optionally with a given severity)
 *  - eq / neq / in: question answer comparison
 *  - any_severity: any selected symptom has the given severity
 * Age bounds (min_age/max_age) restrict a rule when set.
 */
export const RedFlagEngine = {
  evaluate(
    ref: Pick<ReferenceData, "redFlags" | "redFlagRules" | "symptoms" | "questions">,
    input: RedFlagInput,
    opts: RedFlagOptions = {},
  ): TriageResult {
    const mode = opts.contentMode ?? "development";
    const activeFlags = ref.redFlags.filter(
      (flag) =>
        flag.is_active &&
        flag.review_status !== "retired" &&
        (mode === "development" || (flag.review_status === "published" && !flag.is_demo)),
    );
    const activeFlagIds = new Set(activeFlags.map((flag) => flag.id));
    const rules = ref.redFlagRules.filter(
      (rule) => rule.is_active && activeFlagIds.has(rule.red_flag_id),
    );

    const fired = activeFlags
      .filter((flag) => rules.some((rule) => rule.red_flag_id === flag.id && ruleMatches(rule, input)))
      .sort((a, b) => b.priority - a.priority);

    const legacy = fallback(ref, input);
    let level: CareLevel = legacy.level;
    for (const flag of fired) level = maxCareLevel(level, flag.care_level);

    const mergedFlags = new Map<string, { code: string; title: string }>();
    for (const flag of legacy.flags) mergedFlags.set(flag.code, flag);
    for (const flag of fired) {
      mergedFlags.set(flag.code, { code: flag.code, title: flag.title_ar });
    }

    return {
      level,
      flags: [...mergedFlags.values()],
      source: fired.length ? "rules" : legacy.source,
    };
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
      const value = input.answers[r.question_id];
      if (value === undefined) return false;
      if (r.operator === "neq") return value !== r.value;
      if (r.operator === "in") {
        return (r.value ?? "").split(",").map((item) => item.trim()).includes(value);
      }
      return value === r.value;
    }
  }
}

/**
 * Legacy deterministic logic remains as a minimum safety floor even when a
 * partial reviewed rule set exists. Reviewed database rules can add urgency,
 * never remove these checks.
 */
function fallback(
  ref: Pick<ReferenceData, "symptoms" | "questions">,
  input: RedFlagInput,
): TriageResult {
  const sid = (code: string) => ref.symptoms.find((s) => s.code === code)?.id ?? code;
  const qid = (code: string) => ref.questions.find((q) => q.code === code)?.id ?? code;
  const flags: { code: string; title: string }[] = [];
  const has = (code: string) => input.symptomIds.includes(sid(code));

  if (has("chest_pain") && input.severity[sid("chest_pain")] === "severe") {
    flags.push({ code: "severe_chest_pain", title: "ألم صدر شديد" });
  }
  if (
    has("shortness_of_breath") &&
    (
      input.severity[sid("shortness_of_breath")] === "severe" ||
      input.answers[qid("dy_rest")] === "yes"
    )
  ) {
    flags.push({ code: "severe_dyspnea", title: "صعوبة شديدة في التنفس" });
  }
  if (has("fainting") || input.answers[qid("dz_faint")] === "yes") {
    flags.push({ code: "loss_of_consciousness", title: "فقدان وعي" });
  }

  if (flags.length) {
    return { level: "emergency", flags, source: "fallback" };
  }

  if (Object.values(input.severity).includes("severe")) {
    return {
      level: "urgent",
      flags: [{ code: "any_severe_symptom", title: "عرض شديد" }],
      source: "fallback",
    };
  }

  return {
    level: input.symptomIds.length > 2 ? "routine" : "self_care",
    flags: [],
    source: "fallback",
  };
}
