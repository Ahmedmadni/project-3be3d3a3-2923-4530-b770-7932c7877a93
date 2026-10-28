// Domain types. Table rows come from the generated database schema;
// only engine-specific shapes are declared here.
import type { Tables, Enums } from "@/integrations/supabase/types";

export type Symptom = Tables<"symptoms">;
export type Condition = Tables<"conditions">;
export type ConditionSymptom = Tables<"condition_symptoms">;
export type Question = Tables<"questions">;
export type QuestionOption = Tables<"question_options">;
export type QuestionRule = Tables<"question_rules">;
export type RedFlag = Tables<"red_flags">;
export type RedFlagRule = Tables<"red_flag_rules">;
export type EmergencyContact = Tables<"emergency_contacts">;
export type MedicalSource = Tables<"medical_sources">;
export type FirstAidTopic = Tables<"first_aid_topics">;
export type FirstAidSection = Tables<"first_aid_sections">;
export type Profile = Tables<"profiles">;
export type SymptomSessionRow = Tables<"symptom_sessions">;
export type PregnancyTracking = Tables<"pregnancy_tracking">;
export type PregnancyDailyEntry = Tables<"pregnancy_daily_entries">;
export type PregnancyGuidanceCategory = "food" | "activity" | "care";
export type PregnancyGuidanceStatus = "avoid" | "conditional" | "recommended";
export interface PregnancyGuidanceItem {
  id: string;
  category: PregnancyGuidanceCategory;
  status: PregnancyGuidanceStatus;
  scope: "throughout" | "stage";
  stages: number[];
  fromWeek?: number;
  numericLimit?: { value: number; unit: "mg/day" };
  title: { ar: string; en: string };
  body: { ar: string; en: string };
  sources: string[];
}

export interface PregnancyWeek {
  week: number; // 1–40
  baby: { ar: string; en: string };
  mother: { ar: string; en: string };
  sources: string[];
}

export type PregnancyWarningSeverity = "emergency" | "same_day";
export interface PregnancyWarningSign {
  id: string;
  severity: PregnancyWarningSeverity; // emergency = call emergency services now; same_day = contact maternity care today
  scope: "throughout" | "stage";
  stages: number[];
  title: { ar: string; en: string };
  body: { ar: string; en: string };
  sources: string[];
}

export type PregnancyVisitKind = "visit" | "test";
export interface PregnancyVisit {
  id: string;
  kind: PregnancyVisitKind;
  weeks: [number, number]; // approximate gestational window in weeks
  title: { ar: string; en: string };
  body: { ar: string; en: string };
  trimesters?: number[]; // limit display to these trimesters when present
  sources: string[];
}

export type Severity = Enums<"severity_level">;
export type CareLevel = Enums<"care_level">;
export type Compatibility = Enums<"matching_level">;
export type SymptomPattern = Enums<"symptom_pattern">;
export type Sex = "male" | "female";

export interface QuestionWithOptions extends Question { options: QuestionOption[] }

export interface BasicInfo { age: string; sex: Sex | ""; pregnant: "yes" | "no" | "unsure" | ""; chronic: string; medications: string }
export interface SymptomDetail { onset: string; pattern: SymptomPattern | ""; severity: Severity | ""; triggers: string; associated: string }
/** answers keyed by question id */
export type AnswerMap = Record<string, string>;

export interface SessionInput {
  basic: BasicInfo;
  symptomIds: string[];
  details: Record<string, SymptomDetail>;
  answers: AnswerMap;
  description: string;
}

export type ReasonCode =
  | "MATCHED_PRIMARY_SYMPTOM"
  | "MATCHED_SECONDARY_SYMPTOM"
  | "SEVERITY_MATCH"
  | "DURATION_MATCH"
  | "CONTRADICTING_FINDING";

export interface Reason { code: ReasonCode; symptomId?: string }

export interface PossibleConditionResult {
  conditionId: string;
  internalScore: number; // internal only — never displayed
  compatibilityLevel: Compatibility;
  matchedSymptoms: string[]; // symptom ids
  contradictingSymptoms: string[];
  reasonCodes: Reason[];
  careLevel: CareLevel;
}

export interface TriageResult { level: CareLevel; flags: { code: string; title: string }[]; source: "rules" | "fallback" }
