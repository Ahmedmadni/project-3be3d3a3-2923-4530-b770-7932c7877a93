// Domain types — mirror future database tables.
export type ID = string;
export type Sex = "male" | "female";
export type Severity = "mild" | "moderate" | "severe";
export type Compatibility = "high" | "medium" | "low";
export type CareLevel = "emergency" | "urgent" | "routine" | "self-care";

export interface User { id: ID; name: string; email?: string; role: "public" | "professional"; createdAt: string }
export interface Symptom { id: ID; name: string; aliases?: string[]; category?: string; isRedFlag?: boolean }
export interface Condition { id: ID; name: string; summary: string; specialty: string; whenToSeeDoctor: string; careLevel: CareLevel }
export interface ConditionSymptom { conditionId: ID; symptomId: ID; weight: number }

export type QuestionType = "yes_no" | "yes_no_unsure" | "single" | "multi" | "text";
export interface QuestionOption { value: string; label: string }
export interface Question { id: ID; symptomId?: ID; text: string; type: QuestionType; options: QuestionOption[] }
export interface QuestionRule { id: ID; questionId: ID; showIf: { questionId: ID; equals: string } }
export interface RedFlag { id: ID; symptomId?: ID; questionId?: ID; answer?: string; severity?: Severity; careLevel: CareLevel; message: string }

export interface MedicalSource { id: ID; title: string; publisher: string; url?: string }
export interface FirstAidStep { order: number; text: string }
export interface FirstAidTopic {
  slug: string; title: string; summary: string; icon: string; critical?: boolean;
  whatIsHappening?: string; whenToCall?: string[]; doNow?: FirstAidStep[]; dontDo?: string[];
  whileWaiting?: string[]; sources?: MedicalSource[]; lastReviewed?: string;
}

export interface SymptomDetail { onset: string; pattern: "continuous" | "intermittent" | ""; severity: Severity | ""; triggers: string; associated: string }
export interface BasicInfo { age: string; sex: Sex | ""; pregnant: "yes" | "no" | "unsure" | ""; chronic: string; medications: string }
export interface SessionAnswer { questionId: ID; value: string }
export interface SymptomSession {
  id: ID; basic: BasicInfo; symptomIds: ID[]; description: string;
  details: Record<ID, SymptomDetail>; answers: SessionAnswer[]; createdAt: string;
}
export interface PossibleConditionResult {
  condition: Condition; compatibility: Compatibility; matchedSymptoms: string[]; reason: string;
}
