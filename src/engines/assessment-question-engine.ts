import type { AnswerMap, QuestionWithOptions } from "@/types/medical";
import type { ReferenceData } from "./reference";
import { DynamicQuestionEngine } from "./dynamic-question-engine";

/**
 * Returns only follow-up questions that can currently affect emergency/urgent
 * safety routing. Questions used only for future enrichment are kept out of the
 * public checker until they actually influence a result or care decision.
 *
 * Parent questions needed to reveal a safety question are included recursively.
 */
export function safetyRelevantQuestionIds(
  ref: Pick<ReferenceData, "questionRules" | "redFlagRules">,
): Set<string> {
  const ids = new Set(
    ref.redFlagRules
      .filter((rule) => rule.is_active && !!rule.question_id)
      .map((rule) => rule.question_id!)
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
