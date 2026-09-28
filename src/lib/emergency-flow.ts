export type EmergencyUserRole = "public" | "practitioner" | "unsure";
export type EmergencyAnswer = "yes" | "no" | "unknown" | "";

export interface PublicEmergencyAnswers {
  conscious: EmergencyAnswer;
  breathingNormally: EmergencyAnswer;
  severeBleeding: EmergencyAnswer;
  choking: EmergencyAnswer;
  seizure: EmergencyAnswer;
  majorInjury: EmergencyAnswer;
}

export interface ProfessionalEmergencyAssessment {
  consciousness: string;
  airwayConcern: EmergencyAnswer;
  breathingConcern: EmergencyAnswer;
  circulationConcern: EmergencyAnswer;
  systolicBp: string;
  diastolicBp: string;
  heartRate: string;
  respiratoryRate: string;
  spo2: string;
  temperature: string;
  glucose: string;
  onset: string;
  allergies: string;
  medications: string;
  relevantHistory: string;
  notes: string;
}

export const EMPTY_PUBLIC_EMERGENCY_ANSWERS: PublicEmergencyAnswers = {
  conscious: "",
  breathingNormally: "",
  severeBleeding: "",
  choking: "",
  seizure: "",
  majorInjury: "",
};

export const EMPTY_PROFESSIONAL_EMERGENCY_ASSESSMENT: ProfessionalEmergencyAssessment = {
  consciousness: "",
  airwayConcern: "",
  breathingConcern: "",
  circulationConcern: "",
  systolicBp: "",
  diastolicBp: "",
  heartRate: "",
  respiratoryRate: "",
  spo2: "",
  temperature: "",
  glucose: "",
  onset: "",
  allergies: "",
  medications: "",
  relevantHistory: "",
  notes: "",
};

export function effectiveEmergencyRole(role: EmergencyUserRole | null): "public" | "practitioner" | null {
  if (!role) return null;
  return role === "practitioner" ? "practitioner" : "public";
}

export function publicEmergencyAttentionItems(answers: PublicEmergencyAnswers): string[] {
  const items: string[] = [];
  if (answers.conscious === "no") items.push("unconscious");
  if (answers.breathingNormally === "no") items.push("abnormal_breathing");
  if (answers.severeBleeding === "yes") items.push("severe_bleeding");
  if (answers.choking === "yes") items.push("choking");
  if (answers.seizure === "yes") items.push("seizure");
  if (answers.majorInjury === "yes") items.push("major_injury");
  return items;
}

function clean(value: string) {
  return value.trim();
}

/**
 * Creates a factual handover note only from values entered by the practitioner.
 * It does not infer diagnoses, treatments, medication doses, or clinical decisions.
 */
export function buildProfessionalHandover(a: ProfessionalEmergencyAssessment): string {
  const lines: string[] = ["Emergency handover"];

  if (clean(a.onset)) lines.push(`Onset: ${clean(a.onset)}`);
  if (clean(a.consciousness)) lines.push(`Consciousness: ${clean(a.consciousness)}`);

  const primary: string[] = [];
  if (a.airwayConcern) primary.push(`Airway concern: ${a.airwayConcern}`);
  if (a.breathingConcern) primary.push(`Breathing concern: ${a.breathingConcern}`);
  if (a.circulationConcern) primary.push(`Circulation concern: ${a.circulationConcern}`);
  if (primary.length) lines.push(primary.join(" | "));

  const vitals: string[] = [];
  if (clean(a.systolicBp) || clean(a.diastolicBp)) {
    vitals.push(`BP ${clean(a.systolicBp) || "?"}/${clean(a.diastolicBp) || "?"}`);
  }
  if (clean(a.heartRate)) vitals.push(`HR ${clean(a.heartRate)}`);
  if (clean(a.respiratoryRate)) vitals.push(`RR ${clean(a.respiratoryRate)}`);
  if (clean(a.spo2)) vitals.push(`SpO2 ${clean(a.spo2)}%`);
  if (clean(a.temperature)) vitals.push(`Temp ${clean(a.temperature)}`);
  if (clean(a.glucose)) vitals.push(`Glucose ${clean(a.glucose)}`);
  if (vitals.length) lines.push(`Vitals: ${vitals.join(", ")}`);

  if (clean(a.allergies)) lines.push(`Allergies: ${clean(a.allergies)}`);
  if (clean(a.medications)) lines.push(`Medications: ${clean(a.medications)}`);
  if (clean(a.relevantHistory)) lines.push(`Relevant history: ${clean(a.relevantHistory)}`);
  if (clean(a.notes)) lines.push(`Notes: ${clean(a.notes)}`);

  return lines.join("\n");
}
