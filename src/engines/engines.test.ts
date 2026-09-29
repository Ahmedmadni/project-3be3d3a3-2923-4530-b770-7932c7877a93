import { describe, expect, it } from "vitest";
import { RedFlagEngine } from "./red-flag-engine";
import { ConditionMatchingEngine, toLevel } from "./condition-matching-engine";
import { DynamicQuestionEngine } from "./dynamic-question-engine";
import { maxCareLevel } from "./care-level";
import { selectEmergencyContacts, primaryAmbulance } from "./emergency-contacts";
import { runSafetyPipeline } from "./pipeline";
import { emptyReference, type ReferenceData } from "./reference";
import type { SessionInput } from "@/types/medical";

// Test fixtures — synthetic ids, not medical content.
const any = <T,>(x: unknown) => x as T;
const redFlags = any<ReferenceData["redFlags"]>([
  { id: "rf1", code: "severe_chest", title_ar: "ألم صدر شديد", care_level: "emergency", priority: 10 },
  { id: "rf2", code: "high_fever_child", title_ar: "حرارة", care_level: "urgent", priority: 5 },
]);
const redFlagRules = any<ReferenceData["redFlagRules"]>([
  { id: "r1", red_flag_id: "rf1", symptom_id: "chest", question_id: null, operator: "selected", value: null, severity: "severe", min_age: null, max_age: null },
  { id: "r2", red_flag_id: "rf2", symptom_id: null, question_id: "q_fever", operator: "eq", value: "yes", severity: null, min_age: null, max_age: 5 },
]);
const conditions = any<ReferenceData["conditions"]>([
  { id: "c1", is_active: true, review_status: "draft", care_level: "routine" },
  { id: "c2", is_active: true, review_status: "reviewed", care_level: "self_care" },
]);
const conditionSymptoms = any<ReferenceData["conditionSymptoms"]>([
  { condition_id: "c1", symptom_id: "cough", relationship_type: "supports", weight: 1, is_core_symptom: true },
  { condition_id: "c1", symptom_id: "fever", relationship_type: "supports", weight: 1, is_core_symptom: false },
  { condition_id: "c2", symptom_id: "cough", relationship_type: "weak_support", weight: 1, is_core_symptom: false },
  { condition_id: "c2", symptom_id: "rash", relationship_type: "supports", weight: 2, is_core_symptom: true },
  { condition_id: "c2", symptom_id: "fever", relationship_type: "contradicts", weight: 1, is_core_symptom: false },
]);
const ref: ReferenceData = { ...emptyReference, redFlags, redFlagRules, conditions, conditionSymptoms };

const input = (symptomIds: string[], extra: Partial<SessionInput> = {}): SessionInput => any<SessionInput>({
  basic: { age: "30" }, symptomIds, details: {}, answers: {}, description: "", ...extra,
});

describe("CareLevel", () => {
  it("picks the more serious level", () => {
    expect(maxCareLevel("routine", "emergency")).toBe("emergency");
    expect(maxCareLevel("urgent", "self_care")).toBe("urgent");
  });
});

describe("RedFlagEngine", () => {
  it("fires emergency on severe chest pain", () => {
    const r = RedFlagEngine.evaluate(ref, { symptomIds: ["chest"], answers: {}, severity: { chest: "severe" } });
    expect(r.level).toBe("emergency");
    expect(r.flags[0]?.code).toBe("severe_chest");
  });
  it("does not fire on mild chest pain", () => {
    const r = RedFlagEngine.evaluate(ref, { symptomIds: ["chest"], answers: {}, severity: { chest: "mild" } });
    expect(r.flags).toHaveLength(0);
  });
  it("respects age bounds", () => {
    const base = { symptomIds: [], answers: { q_fever: "yes" }, severity: {} };
    expect(RedFlagEngine.evaluate(ref, { ...base, age: 3 }).level).toBe("urgent");
    expect(RedFlagEngine.evaluate(ref, { ...base, age: 30 }).level).toBe("self_care");
    expect(RedFlagEngine.evaluate(ref, base).level).toBe("self_care"); // missing age
  });
  it("ignores missing answers", () => {
    expect(RedFlagEngine.evaluate(ref, { symptomIds: [], answers: {}, severity: {}, age: 2 }).flags).toHaveLength(0);
  });
  it("falls back to safety net without rules", () => {
    const r = RedFlagEngine.evaluate({ ...emptyReference }, { symptomIds: ["fainting"], answers: {}, severity: {} });
    expect(r).toMatchObject({ level: "emergency", source: "fallback" });
  });
});

describe("ConditionMatchingEngine", () => {
  it("matches condition-symptom rows using the real database shape", () => {
    const realShape = any<ReferenceData["conditionSymptoms"]>([
      { condition_id: "c1", symptom_id: "cough", relationship_type: "supports", weight: 1, is_core_symptom: true, is_demo: false },
    ]);
    const realRef: ReferenceData = { ...ref, conditionSymptoms: realShape };
    const r = ConditionMatchingEngine.run(realRef, input(["cough"]), { contentMode: "development" });
    expect(r[0]?.conditionId).toBe("c1");
  });

  it("returns ranked results without percentages", () => {
    const r = ConditionMatchingEngine.run(ref, input(["cough", "fever"]), { contentMode: "development" });
    expect(r[0]?.conditionId).toBe("c1");
    expect(r[0]?.compatibilityLevel).toBe("high");
  });
  it("shows only published conditions in production", () => {
    const r = ConditionMatchingEngine.run(ref, input(["cough", "fever", "rash"]), { contentMode: "production" });
    expect(r).toEqual([]);
  });
  it("ignores inactive clinical links until they are reviewed and activated", () => {
    const guarded = {
      ...ref,
      conditionSymptoms: any<ReferenceData["conditionSymptoms"]>([
        { condition_id: "c1", symptom_id: "cough", relationship_type: "supports", weight: 10, is_core_symptom: true, is_active: false },
      ]),
    };
    expect(ConditionMatchingEngine.run(guarded, input(["cough"]), { contentMode: "development" })).toEqual([]);
  });
  it("accepts published content in production", () => {
    const published = {
      ...ref,
      conditions: any<ReferenceData["conditions"]>([
        { id: "cp", is_active: true, review_status: "published", care_level: "routine" },
      ]),
      conditionSymptoms: any<ReferenceData["conditionSymptoms"]>([
        { condition_id: "cp", symptom_id: "cough", relationship_type: "supports", weight: 1, is_core_symptom: true },
      ]),
    };
    expect(ConditionMatchingEngine.run(published, input(["cough"]), { contentMode: "production" })[0]?.conditionId).toBe("cp");
  });
  it("returns empty for no symptoms or no data", () => {
    expect(ConditionMatchingEngine.run(ref, input([]), { contentMode: "development" })).toEqual([]);
    expect(ConditionMatchingEngine.run(emptyReference, input(["cough"]), { contentMode: "development" })).toEqual([]);
  });
  it("applies contradicting findings", () => {
    const r = ConditionMatchingEngine.run(ref, input(["rash", "fever"]), { contentMode: "development" });
    const c2 = r.find((x) => x.conditionId === "c2")!;
    expect(c2.contradictingSymptoms).toContain("fever");
  });
  it("maps thresholds", () => {
    expect([toLevel(0.7), toLevel(0.4), toLevel(0.1)]).toEqual(["high", "medium", "low"]);
  });
});

describe("DynamicQuestionEngine", () => {
  const qref = any<Pick<ReferenceData, "questions" | "questionOptions" | "questionRules">>({
    questions: [
      { id: "q1", is_active: true, sort_order: 1 },
      { id: "q2", is_active: true, sort_order: 2 },
      { id: "q3", is_active: false, sort_order: 3 },
    ],
    questionOptions: [],
    questionRules: [
      { question_id: "q1", trigger_type: "symptom_selected", symptom_id: "cough", operator: "eq", priority: 1 },
      { question_id: "q2", trigger_type: "answer_equals", parent_question_id: "q1", operator: "eq", expected_value: "yes", priority: 2 },
      { question_id: "q3", trigger_type: "always", operator: "eq", priority: 0 },
    ],
  });
  it("shows questions progressively", () => {
    expect(DynamicQuestionEngine.visibleQuestions(qref, [], {}).map((q) => q.id)).toEqual([]);
    expect(DynamicQuestionEngine.visibleQuestions(qref, ["cough"], {}).map((q) => q.id)).toEqual(["q1"]);
    expect(DynamicQuestionEngine.visibleQuestions(qref, ["cough"], { q1: "yes" }).map((q) => q.id)).toEqual(["q1", "q2"]);
    expect(DynamicQuestionEngine.visibleQuestions(qref, ["cough"], { q1: "no" }).map((q) => q.id)).toEqual(["q1"]);
  });
  it("ignores inactive question rules", () => {
    const inactive = any<Pick<ReferenceData, "questions" | "questionOptions" | "questionRules">>({
      ...qref,
      questionRules: [{ question_id: "q1", trigger_type: "symptom_selected", symptom_id: "cough", operator: "eq", priority: 1, is_active: false }],
    });
    expect(DynamicQuestionEngine.visibleQuestions(inactive, ["cough"], {})).toEqual([]);
  });
  it("reports missing answers", () => {
    const qs = DynamicQuestionEngine.visibleQuestions(qref, ["cough"], { q1: "yes" });
    expect(DynamicQuestionEngine.missing(qs, { q1: "yes" })).toEqual(["q2"]);
  });
});

describe("Emergency contacts", () => {
  const contacts = any<ReferenceData["emergencyContacts"]>([
    { id: "a", country_code: "SA", region_code: null, service_type: "ambulance", priority: 10 },
    { id: "b", country_code: "SA", region_code: "EP", service_type: "unified_emergency", priority: 20 },
    { id: "c", country_code: "AE", region_code: null, service_type: "ambulance", priority: 10 },
    { id: "d", country_code: "SA", region_code: null, service_type: "police", priority: 5, is_active: false },
  ]);
  it("filters by country/region and sorts by priority", () => {
    expect(selectEmergencyContacts(contacts, "SA").map((c) => c.id)).toEqual(["a"]);
    expect(selectEmergencyContacts(contacts, "SA", "EP").map((c) => c.id)).toEqual(["b", "a"]);
    expect(primaryAmbulance(selectEmergencyContacts(contacts, "SA"))?.id).toBe("a");
  });
});

describe("Safety pipeline", () => {
  it("emergency skips matching (redirect)", () => {
    const out = runSafetyPipeline(ref, input(["chest", "cough"], { details: any({ chest: { severity: "severe" } }) }), { contentMode: "development" });
    expect(out.triage.level).toBe("emergency");
    expect(out.results).toEqual([]);
  });
  it("normal session returns results and only raises care level", () => {
    const out = runSafetyPipeline(ref, input(["cough", "fever"]), { contentMode: "development" });
    expect(out.results.length).toBeGreaterThan(0);
    expect(out.triage.level).toBe("routine");
  });
  it("empty results when no data", () => {
    const out = runSafetyPipeline({ ...emptyReference, redFlags, redFlagRules }, input(["cough"]), { contentMode: "development" });
    expect(out.results).toEqual([]);
  });
});
