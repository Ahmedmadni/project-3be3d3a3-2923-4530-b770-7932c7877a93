import type { AnswerMap, QuestionWithOptions } from "@/types/medical";
import type { ReferenceData } from "./reference";

/**
 * DynamicQuestionEngine — decides which follow-up questions are visible.
 * Rules:
 *  - symptom_selected: show when the symptom is selected
 *  - answer_equals: show when parent question's answer matches expected_value
 *  - always: always show
 * Re-run after each answer so follow-ups appear progressively.
 */
export const DynamicQuestionEngine = {
  visibleQuestions(ref: Pick<ReferenceData, "questions" | "questionOptions" | "questionRules">, selectedSymptomIds: string[], answers: AnswerMap): QuestionWithOptions[] {
    const active = new Map(ref.questions.filter((q) => q.is_active).map((q) => [q.id, q]));
    const priority = new Map<string, number>();

    for (const rule of ref.questionRules) {
      if (!rule.is_active || !active.has(rule.question_id)) continue;
      let match = false;
      if (rule.trigger_type === "always") match = true;
      else if (rule.trigger_type === "symptom_selected") match = !!rule.symptom_id && selectedSymptomIds.includes(rule.symptom_id);
      else if (rule.trigger_type === "answer_equals" && rule.parent_question_id) {
        const v = answers[rule.parent_question_id];
        match = v !== undefined && compare(v, rule.operator, rule.expected_value);
      }
      if (match) priority.set(rule.question_id, Math.min(priority.get(rule.question_id) ?? Infinity, rule.priority));
    }

    return [...priority.keys()]
      .map((id) => active.get(id)!)
      .sort((a, b) => (priority.get(a.id)! - priority.get(b.id)!) || a.sort_order - b.sort_order)
      .map((q) => ({ ...q, options: ref.questionOptions.filter((o) => o.question_id === q.id).sort((a, b) => a.sort_order - b.sort_order) }));
  },

  /** Returns ids of visible questions that are unanswered. */
  missing(questions: QuestionWithOptions[], answers: AnswerMap) {
    return questions.filter((q) => !answers[q.id]).map((q) => q.id);
  },
};

export function compare(actual: string, operator: string, expected: string | null): boolean {
  switch (operator) {
    case "neq": return actual !== expected;
    case "in": return (expected ?? "").split(",").map((s) => s.trim()).includes(actual);
    case "gt": return Number(actual) > Number(expected);
    case "lt": return Number(actual) < Number(expected);
    default: return actual === expected;
  }
}
