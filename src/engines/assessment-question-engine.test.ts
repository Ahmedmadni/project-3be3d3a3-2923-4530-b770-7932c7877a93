import { describe, expect, it } from "vitest";
import {
  confirmedSymptomIdsFromAnswers,
  safetyRelevantQuestionIds,
  visibleClarifyingQuestions,
  visibleSafetyQuestions,
} from "./assessment-question-engine";
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

  it("shows a clarifier only when an active candidate condition has a selected core symptom", () => {
    const data = ref({
      symptoms: [
        { id: "headache", is_active: true, review_status: "published" },
        { id: "light", is_active: true, review_status: "published" },
      ] as ReferenceData["symptoms"],
      conditions: [
        { id: "migraine", is_active: true, review_status: "published" },
      ] as ReferenceData["conditions"],
      conditionSymptoms: [
        {
          condition_id: "migraine",
          symptom_id: "headache",
          relationship_type: "supports",
          is_core_symptom: true,
          is_active: true,
        },
      ] as ReferenceData["conditionSymptoms"],
      questions: [
        {
          id: "q-light",
          is_active: true,
          review_status: "published",
          sort_order: 1,
        },
      ] as ReferenceData["questions"],
      questionOptions: [
        { id: "yes", question_id: "q-light", value: "yes", sort_order: 1 },
        { id: "no", question_id: "q-light", value: "no", sort_order: 2 },
      ] as ReferenceData["questionOptions"],
      questionRules: [
        {
          id: "clarifier",
          question_id: "q-light",
          trigger_type: "condition_candidate",
          condition_id: "migraine",
          confirms_symptom_id: "light",
          priority: 1,
          is_active: true,
        },
      ] as ReferenceData["questionRules"],
    });

    expect(visibleClarifyingQuestions(data, [], {}, "production")).toEqual([]);
    expect(visibleClarifyingQuestions(data, ["headache"], {}, "production").map((q) => q.id))
      .toEqual(["q-light"]);
  });

  it("does not ask a clarifier when the target symptom is already selected", () => {
    const data = ref({
      symptoms: [
        { id: "headache", is_active: true, review_status: "published" },
        { id: "light", is_active: true, review_status: "published" },
      ] as ReferenceData["symptoms"],
      conditions: [
        { id: "migraine", is_active: true, review_status: "published" },
      ] as ReferenceData["conditions"],
      conditionSymptoms: [
        {
          condition_id: "migraine",
          symptom_id: "headache",
          relationship_type: "supports",
          is_core_symptom: true,
          is_active: true,
        },
      ] as ReferenceData["conditionSymptoms"],
      questions: [
        { id: "q-light", is_active: true, review_status: "published", sort_order: 1 },
      ] as ReferenceData["questions"],
      questionRules: [
        {
          id: "clarifier",
          question_id: "q-light",
          trigger_type: "condition_candidate",
          condition_id: "migraine",
          confirms_symptom_id: "light",
          priority: 1,
          is_active: true,
        },
      ] as ReferenceData["questionRules"],
    });

    expect(visibleClarifyingQuestions(data, ["headache", "light"], {}, "production")).toEqual([]);
  });

  it("turns only a visible yes answer into a confirmed matching symptom", () => {
    const data = ref({
      symptoms: [
        { id: "headache", is_active: true, review_status: "published" },
        { id: "light", is_active: true, review_status: "published" },
      ] as ReferenceData["symptoms"],
      conditions: [
        { id: "migraine", is_active: true, review_status: "published" },
      ] as ReferenceData["conditions"],
      conditionSymptoms: [
        {
          condition_id: "migraine",
          symptom_id: "headache",
          relationship_type: "supports",
          is_core_symptom: true,
          is_active: true,
        },
      ] as ReferenceData["conditionSymptoms"],
      questions: [
        { id: "q-light", is_active: true, review_status: "published", sort_order: 1 },
      ] as ReferenceData["questions"],
      questionRules: [
        {
          id: "clarifier",
          question_id: "q-light",
          trigger_type: "condition_candidate",
          condition_id: "migraine",
          confirms_symptom_id: "light",
          priority: 1,
          is_active: true,
        },
      ] as ReferenceData["questionRules"],
    });

    expect(confirmedSymptomIdsFromAnswers(data, ["headache"], { "q-light": "yes" }, "production"))
      .toEqual(["light"]);
    expect(confirmedSymptomIdsFromAnswers(data, ["headache"], { "q-light": "no" }, "production"))
      .toEqual([]);
    expect(confirmedSymptomIdsFromAnswers(data, [], { "q-light": "yes" }, "production"))
      .toEqual([]);
  });

  it("keeps draft or inactive clarifiers out of production", () => {
    const data = ref({
      symptoms: [
        { id: "headache", is_active: true, review_status: "published" },
        { id: "light", is_active: true, review_status: "published" },
      ] as ReferenceData["symptoms"],
      conditions: [
        { id: "migraine", is_active: true, review_status: "published" },
      ] as ReferenceData["conditions"],
      conditionSymptoms: [
        {
          condition_id: "migraine",
          symptom_id: "headache",
          relationship_type: "supports",
          is_core_symptom: true,
          is_active: true,
        },
      ] as ReferenceData["conditionSymptoms"],
      questions: [
        { id: "q-light", is_active: true, review_status: "draft", sort_order: 1 },
      ] as ReferenceData["questions"],
      questionRules: [
        {
          id: "clarifier",
          question_id: "q-light",
          trigger_type: "condition_candidate",
          condition_id: "migraine",
          confirms_symptom_id: "light",
          priority: 1,
          is_active: true,
        },
      ] as ReferenceData["questionRules"],
    });

    expect(visibleClarifyingQuestions(data, ["headache"], {}, "production")).toEqual([]);
  });
});
