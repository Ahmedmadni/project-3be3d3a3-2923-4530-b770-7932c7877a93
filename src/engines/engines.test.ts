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
  { id: "rf1", code: "severe_chest", title_ar: "ألم صدر شديد", care_level: "emergency", priority: 10, is_active: true },
  { id: "rf2", code: "high_fever_child", title_ar: "حرارة", care_level: "urgent", priority: 5, is_active: true },
]);
const redFlagRules = any<ReferenceData["redFlagRules"]>([
  { id: "r1", red_flag_id: "rf1", symptom_id: "chest", question_id: null, operator: "selected", value: null, severity: "severe", min_age: null, max_age: null, is_active: true },
  { id: "r2", red_flag_id: "rf2", symptom_id: null, question_id: "q_fever", operator: "eq", value: "yes", severity: null, min_age: null, max_age: 5, is_active: true },
]);
const conditions = any<ReferenceData["conditions"]>([
  { id: "c1", is_active: true, review_status: "draft", care_level: "routine" },
  { id: "c2", is_active: true, review_status: "reviewed", care_level: "self_care" },
]);
const conditionSymptoms = any<ReferenceData["conditionSymptoms"]>([
  { condition_id: "c1", symptom_id: "cough", relationship_type: "supports", weight: 1, is_core_symptom: true, is_active: true },
  { condition_id: "c1", symptom_id: "fever", relationship_type: "supports", weight: 1, is_core_symptom: false, is_active: true },
  { condition_id: "c2", symptom_id: "cough", relationship_type: "weak_support", weight: 1, is_core_symptom: false, is_active: true },
  { condition_id: "c2", symptom_id: "rash", relationship_type: "supports", weight: 2, is_core_symptom: true, is_active: true },
  { condition_id: "c2", symptom_id: "fever", relationship_type: "contradicts", weight: 1, is_core_symptom: false, is_active: true },
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

  it("ignores draft/demo database red flags in production", () => {
    const productionRef = any<ReferenceData>({
      ...emptyReference,
      redFlags: [
        {
          id: "draft",
          code: "draft_flag",
          title_ar: "مسودة",
          care_level: "emergency",
          priority: 100,
          is_active: true,
          is_demo: false,
          review_status: "draft",
        },
        {
          id: "demo",
          code: "demo_flag",
          title_ar: "تجريبي",
          care_level: "emergency",
          priority: 100,
          is_active: true,
          is_demo: true,
          review_status: "published",
        },
      ],
      redFlagRules: [
        { id: "dr", red_flag_id: "draft", question_id: "q", operator: "eq", value: "yes", is_active: true },
        { id: "dm", red_flag_id: "demo", question_id: "q", operator: "eq", value: "yes", is_active: true },
      ],
    });

    const result = RedFlagEngine.evaluate(
      productionRef,
      { symptomIds: [], answers: { q: "yes" }, severity: {} },
      { contentMode: "production" },
    );

    expect(result.flags).toEqual([]);
    expect(result.level).toBe("self_care");
  });

  it("accepts published non-demo red flags in production", () => {
    const productionRef = any<ReferenceData>({
      ...emptyReference,
      redFlags: [
        {
          id: "real",
          code: "published_flag",
          title_ar: "منشور",
          care_level: "urgent",
          priority: 50,
          is_active: true,
          is_demo: false,
          review_status: "published",
        },
      ],
      redFlagRules: [
        { id: "rr", red_flag_id: "real", question_id: "q", operator: "eq", value: "yes", is_active: true },
      ],
    });

    const result = RedFlagEngine.evaluate(
      productionRef,
      { symptomIds: [], answers: { q: "yes" }, severity: {} },
      { contentMode: "production" },
    );

    expect(result.flags.map((flag) => flag.code)).toContain("published_flag");
    expect(result.level).toBe("urgent");
  });

  it("keeps the deterministic safety floor when the reviewed database rule set is partial", () => {
    const partial = any<ReferenceData>({
      ...emptyReference,
      symptoms: [
        { id: "cp", code: "chest_pain" },
      ],
      redFlags: [
        {
          id: "real",
          code: "unrelated_published_flag",
          title_ar: "منشور",
          care_level: "urgent",
          priority: 50,
          is_active: true,
          is_demo: false,
          review_status: "published",
        },
      ],
      redFlagRules: [
        { id: "rr", red_flag_id: "real", question_id: "other", operator: "eq", value: "yes", is_active: true },
      ],
    });

    const result = RedFlagEngine.evaluate(
      partial,
      { symptomIds: ["cp"], answers: {}, severity: { cp: "severe" } },
      { contentMode: "production" },
    );

    expect(result.level).toBe("emergency");
    expect(result.flags.map((flag) => flag.code)).toContain("severe_chest_pain");
  });

  it("keeps legacy sudden-headache and chest-radiation safety checks", () => {
    const legacyRef = any<ReferenceData>({
      ...emptyReference,
      symptoms: [
        { id: "hd", code: "headache" },
        { id: "cp", code: "chest_pain" },
      ],
      questions: [
        { id: "q-hd", code: "hd_sudden" },
        { id: "q-cp", code: "cp_radiate" },
      ],
    });

    const headache = RedFlagEngine.evaluate(
      legacyRef,
      { symptomIds: ["hd"], answers: { "q-hd": "yes" }, severity: { hd: "moderate" } },
      { contentMode: "production" },
    );
    const chest = RedFlagEngine.evaluate(
      legacyRef,
      { symptomIds: ["cp"], answers: { "q-cp": "yes" }, severity: { cp: "mild" } },
      { contentMode: "production" },
    );

    expect(headache.level).toBe("emergency");
    expect(headache.flags.map((flag) => flag.code)).toContain("thunderclap_headache");
    expect(chest.level).toBe("emergency");
    expect(chest.flags.map((flag) => flag.code)).toContain("severe_chest_pain");
  });
});

describe("ConditionMatchingEngine", () => {
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
        { condition_id: "cp", symptom_id: "cough", relationship_type: "supports", weight: 1, is_core_symptom: true, is_active: true },
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
      { question_id: "q1", trigger_type: "symptom_selected", symptom_id: "cough", operator: "eq", priority: 1, is_active: true },
      { question_id: "q2", trigger_type: "answer_equals", parent_question_id: "q1", operator: "eq", expected_value: "yes", priority: 2, is_active: true },
      { question_id: "q3", trigger_type: "always", operator: "eq", priority: 0, is_active: true },
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
    { id: "a", country_code: "SA", region_code: null, service_type: "ambulance", priority: 10, is_active: true },
    { id: "b", country_code: "SA", region_code: "EP", service_type: "unified_emergency", priority: 20, is_active: true },
    { id: "c", country_code: "AE", region_code: null, service_type: "ambulance", priority: 10, is_active: true },
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

  it("uses a yes clarifier for matching without turning it into a red-flag symptom", () => {
    const smartRef = any<ReferenceData>({
      ...emptyReference,
      symptoms: [
        { id: "headache", is_active: true, review_status: "published" },
        { id: "light", is_active: true, review_status: "published" },
      ],
      conditions: [
        { id: "migraine", is_active: true, review_status: "published", care_level: "routine" },
      ],
      conditionSymptoms: [
        { condition_id: "migraine", symptom_id: "headache", relationship_type: "supports", weight: 1, is_core_symptom: true, is_active: true },
        { condition_id: "migraine", symptom_id: "light", relationship_type: "supports", weight: 1, is_core_symptom: true, is_active: true },
      ],
      questions: [
        { id: "q-light", is_active: true, review_status: "published", sort_order: 1 },
      ],
      questionOptions: [
        { id: "yes", question_id: "q-light", value: "yes", sort_order: 1 },
      ],
      questionRules: [
        {
          id: "qr1",
          question_id: "q-light",
          trigger_type: "condition_candidate",
          condition_id: "migraine",
          confirms_symptom_id: "light",
          priority: 1,
          is_active: true,
        },
      ],
      redFlags: [
        { id: "rf-light", code: "light_selected", title_ar: "test", care_level: "emergency", priority: 1, is_active: true },
      ],
      redFlagRules: [
        { id: "rr-light", red_flag_id: "rf-light", symptom_id: "light", operator: "selected", is_active: true },
      ],
    });

    const out = runSafetyPipeline(
      smartRef,
      input(["headache"], { answers: { "q-light": "yes" } }),
      { contentMode: "production" },
    );

    expect(out.triage.level).toBe("routine");
    expect(out.results[0]?.matchedSymptoms).toEqual(["headache", "light"]);
  });
});
