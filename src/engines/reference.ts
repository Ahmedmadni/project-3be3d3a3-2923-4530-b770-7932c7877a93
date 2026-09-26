import type {
  Condition, ConditionSymptom, EmergencyContact, QuestionOption, Question, QuestionRule,
  RedFlag, RedFlagRule, Symptom,
} from "@/types/medical";

/** All reference data the engines need, loaded once from the database. */
export interface ReferenceData {
  symptoms: Symptom[];
  conditions: Condition[];
  conditionSymptoms: ConditionSymptom[];
  questions: Question[];
  questionOptions: QuestionOption[];
  questionRules: QuestionRule[];
  redFlags: RedFlag[];
  redFlagRules: RedFlagRule[];
  emergencyContacts: EmergencyContact[];
}

export const emptyReference: ReferenceData = {
  symptoms: [], conditions: [], conditionSymptoms: [], questions: [], questionOptions: [],
  questionRules: [], redFlags: [], redFlagRules: [], emergencyContacts: [],
};
