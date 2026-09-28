import { describe, expect, it } from "vitest";
import { safetyRelevantQuestionIds, visibleSafetyQuestions } from "./assessment-question-engine";
import type { ReferenceData } from "./reference";

function ref(overrides: Partial<ReferenceData>): ReferenceData {
  return {
    symptoms: [],
    conditions: [],
    conditionSymptoms: [],
    questions: [],
    questionOptions: [],
    questionRules: [],
    redFlags: [],
    redFlagRules: [],
    emergencyContacts: [],
    ...overrides,
  } as ReferenceData;
}

describe("assessment question engine", () => {
  it("keeps questions referenced by active red-flag rules", () => {
    const data = ref({
      redFlagRules: [
        { id: "rf1", is_active: true, question_id: "q2" },
        { id: "rf2", is_active: false, question_id: "q3" },
      ] as ReferenceData["redFlagRules"],
    });

    expect([...safetyRelevantQuestionIds(data)]).toEqual(["q2"]);
  });

  it("includes parent questions needed to reveal a safety question", () => {
    const data = ref({
      redFlagRules: [
        { id: "rf1", is_active: true, question_id: "q2" },
      ] as ReferenceData["redFlagRules"],
      questionRules: [
        { id: "r1", is_active: true, question_id: "q2", parent_question_id: "q1" },
        { id: "r2", is_active: true, question_id: "q1", parent_question_id: "q0" },
      ] as ReferenceData["questionRules"],
    });

    expect([...safetyRelevantQuestionIds(data)].sort()).toEqual(["q0", "q1", "q2"]);
  });

  it("filters visible questions that do not affect safety routing", () => {
    const data = ref({
      questions: [
        { id: "q-safety", is_active: true, sort_order: 1 },
        { id: "q-extra", is_active: true, sort_order: 2 },
      ] as ReferenceData["questions"],
      questionRules: [
        { id: "r1", is_active: true, question_id: "q-safety", trigger_type: "always", priority: 1 },
        { id: "r2", is_active: true, question_id: "q-extra", trigger_type: "always", priority: 2 },
      ] as ReferenceData["questionRules"],
      redFlagRules: [
        { id: "rf1", is_active: true, question_id: "q-safety" },
      ] as ReferenceData["redFlagRules"],
    });

    expect(visibleSafetyQuestions(data, [], {}).map((q) => q.id)).toEqual(["q-safety"]);
  });
});
