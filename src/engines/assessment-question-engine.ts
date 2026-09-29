import type { AnswerMap, QuestionWithOptions } from "@/types/medical";
import type { ReferenceData } from "./reference";
import { compare, DynamicQuestionEngine } from "./dynamic-question-engine";

export type AssessmentContentMode = "production" | "development";

/**
 * Returns only follow-up questions that can currently affect emergency/urgent
 * safety routing.
 *
 * Parent questions needed to reveal a safety question are included recursively.
 */
export function safetyRelevantQuestionIds(
  ref: Pick<ReferenceData, "questionRules" | "redFlagRules">,
): Set<string> {
  const ids = new Set(
    ref.redFlagRules
      .filter((rule) => rule.is_active && !!rule.question_id)
      .map((rule) => rule.question_id!),
  );

  let changed = true;
  while (changed) {
    changed = false;
    for (const rule of ref.questionRules) {
      if (!rule.is_active || !ids.has(rule.question_id) || !rule.parent_question_id) continue;
      if (!ids.has(rule.parent_question_id)) {
        ids.add(rule.parent_question_id);
        changed = true;
      }
    }
  }

  return ids;
}

export function visibleSafetyQuestions(
  ref: Pick<ReferenceData, "questions" | "questionOptions" | "questionRules" | "redFlagRules">,
  selectedSymptomIds: string[],
  answers: AnswerMap,
): QuestionWithOptions[] {
  const relevant = safetyRelevantQuestionIds(ref);
  return DynamicQuestionEngine
    .visibleQuestions(ref, selectedSymptomIds, answers)
    .filter((question) => relevant.has(question.id));
}

/**
 * Smart clarifiers are deliberately separate from safety questions.
 *
 * A clarifier can confirm a symptom for condition matching, but the confirmed
 * symptom is never injected into RedFlagEngine input. This prevents a
 * condition-matching question from silently becoming an emergency trigger.
 */
export function visibleClarifyingQuestions(
  ref: Pick<
    ReferenceData,
    "questions" | "questionOptions" | "questionRules" | "redFlagRules" |
    "conditions" | "conditionSymptoms" | "symptoms"
  >,
  selectedSymptomIds: string[],
  answers: AnswerMap,
  contentMode: AssessmentContentMode,
  maxQuestions = 4,
): QuestionWithOptions[] {
  const selected = new Set(selectedSymptomIds);
  const safetyQuestionIds = safetyRelevantQuestionIds(ref);
  const priorities = new Map<string, number>();

  for (const rule of ref.questionRules) {
    if (!rule.is_active || !rule.confirms_symptom_id || safetyQuestionIds.has(rule.question_id)) continue;

    const question = ref.questions.find((item) => item.id === rule.question_id);
    const target = ref.symptoms.find((item) => item.id === rule.confirms_symptom_id);
    if (!question || !target) continue;
    if (!contentVisible(question, contentMode) || !contentVisible(target, contentMode)) continue;
    if (selected.has(target.id)) continue;
    if (!clarifierRuleMatches(ref, rule, selectedSymptomIds, answers, contentMode)) continue;

    priorities.set(
      question.id,
      Math.min(priorities.get(question.id) ?? Number.POSITIVE_INFINITY, rule.priority),
    );
  }

  return [...priorities.keys()]
    .map((id) => ref.questions.find((question) => question.id === id)!)
    .sort(
      (a, b) =>
        (priorities.get(a.id)! - priorities.get(b.id)!) ||
        a.sort_order - b.sort_order,
    )
    .slice(0, Math.max(0, maxQuestions))
    .map((question) => ({
      ...question,
      options: ref.questionOptions
        .filter((option) => option.question_id === question.id)
        .sort((a, b) => a.sort_order - b.sort_order),
    }));
}

/**
 * Returns only user-confirmed symptoms (answer === "yes") from visible,
 * reviewed/active clarifier rules. These are intended for condition matching
 * and history display, not emergency triage.
 */
export function confirmedSymptomIdsFromAnswers(
  ref: Pick<
    ReferenceData,
    "questions" | "questionOptions" | "questionRules" | "redFlagRules" |
    "conditions" | "conditionSymptoms" | "symptoms"
  >,
  selectedSymptomIds: string[],
  answers: AnswerMap,
  contentMode: AssessmentContentMode,
): string[] {
  const visibleIds = new Set(
    visibleClarifyingQuestions(
      ref,
      selectedSymptomIds,
      answers,
      contentMode,
      Number.MAX_SAFE_INTEGER,
    ).map((question) => question.id),
  );

  const confirmed = new Set<string>();
  for (const rule of ref.questionRules) {
    if (
      !rule.is_active ||
      !rule.confirms_symptom_id ||
      !visibleIds.has(rule.question_id) ||
      answers[rule.question_id] !== "yes"
    ) {
      continue;
    }

    const target = ref.symptoms.find((symptom) => symptom.id === rule.confirms_symptom_id);
    if (!target || !contentVisible(target, contentMode)) continue;
    confirmed.add(target.id);
  }

  return [...confirmed];
}

function clarifierRuleMatches(
  ref: Pick<ReferenceData, "conditions" | "conditionSymptoms">,
  rule: ReferenceData["questionRules"][number],
  selectedSymptomIds: string[],
  answers: AnswerMap,
  contentMode: AssessmentContentMode,
): boolean {
  if (rule.trigger_type === "always") return true;

  if (rule.trigger_type === "symptom_selected") {
    return !!rule.symptom_id && selectedSymptomIds.includes(rule.symptom_id);
  }

  if (rule.trigger_type === "answer_equals" && rule.parent_question_id) {
    const value = answers[rule.parent_question_id];
    return value !== undefined && compare(value, rule.operator, rule.expected_value);
  }

  if (rule.trigger_type === "condition_candidate" && rule.condition_id) {
    return isConditionCandidate(ref, rule.condition_id, selectedSymptomIds, contentMode);
  }

  return false;
}

function isConditionCandidate(
  ref: Pick<ReferenceData, "conditions" | "conditionSymptoms">,
  conditionId: string,
  selectedSymptomIds: string[],
  contentMode: AssessmentContentMode,
): boolean {
  const condition = ref.conditions.find((item) => item.id === conditionId);
  if (!condition || !contentVisible(condition, contentMode)) return false;

  const supportive = ref.conditionSymptoms.filter(
    (link) =>
      link.condition_id === conditionId &&
      link.is_active &&
      link.relationship_type !== "contradicts",
  );

  const core = supportive.filter((link) => link.is_core_symptom);
  const candidateLinks = core.length ? core : supportive;

  return candidateLinks.some((link) => selectedSymptomIds.includes(link.symptom_id));
}

function contentVisible(
  item: { is_active: boolean; review_status: string },
  contentMode: AssessmentContentMode,
): boolean {
  if (!item.is_active || item.review_status === "retired") return false;
  return contentMode === "development" || item.review_status === "published";
}
