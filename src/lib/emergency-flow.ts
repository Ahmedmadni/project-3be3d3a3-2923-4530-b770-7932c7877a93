export type EmergencyUserRole = "public" | "practitioner" | "unsure";
export type EmergencyAnswer = "yes" | "no" | "unknown" | "";
export type EmergencyScenarioId =
  | "chest_pain"
  | "breathing"
  | "bleeding"
  | "choking"
  | "seizure"
  | "burns"
  | "head_injury"
  | "poisoning"
  | "allergy"
  | "fainting"
  | "other";

export interface EmergencyScenario {
  id: EmergencyScenarioId;
  publicQuestionIds: string[];
  practitionerQuestionIds: string[];
}

export const EMERGENCY_SCENARIOS: EmergencyScenario[] = [
  { id: "chest_pain", publicQuestionIds: ["pain_now", "pain_spread", "sweating_nausea"], practitionerQuestionIds: ["onset_context", "character_radiation", "associated_findings"] },
  { id: "breathing", publicQuestionIds: ["breath_at_rest", "cannot_speak_full_sentence", "blue_lips"], practitionerQuestionIds: ["onset_context", "respiratory_findings", "relevant_history"] },
  { id: "bleeding", publicQuestionIds: ["bleeding_now", "heavy_flow", "large_wound"], practitionerQuestionIds: ["bleeding_site", "estimated_loss", "bleeding_status"] },
  { id: "choking", publicQuestionIds: ["can_speak", "can_cough", "became_unresponsive"], practitionerQuestionIds: ["obstruction_assessment", "witnessed_object", "current_airway_findings"] },
  { id: "seizure", publicQuestionIds: ["seizure_ongoing", "back_to_usual", "injury_during_event"], practitionerQuestionIds: ["event_duration", "recurrent_events", "post_event_state"] },
  { id: "burns", publicQuestionIds: ["face_neck_burn", "chemical_or_electrical", "breathing_problem"], practitionerQuestionIds: ["burn_mechanism", "body_regions", "estimated_extent"] },
  { id: "head_injury", publicQuestionIds: ["lost_consciousness", "repeated_vomiting", "speech_movement_problem"], practitionerQuestionIds: ["injury_mechanism", "loc_details", "neuro_findings"] },
  { id: "poisoning", publicQuestionIds: ["known_substance", "exposure_route", "symptoms_now"], practitionerQuestionIds: ["agent", "route_amount", "exposure_time"] },
  { id: "allergy", publicQuestionIds: ["lip_tongue_swelling", "breathing_problem", "faint_dizzy"], practitionerQuestionIds: ["suspected_trigger", "airway_skin_findings", "circulation_findings"] },
  { id: "fainting", publicQuestionIds: ["awake_again", "injury_after_fall", "chest_pain_palpitations"], practitionerQuestionIds: ["event_duration", "prodrome_recovery", "relevant_history"] },
  { id: "other", publicQuestionIds: [], practitionerQuestionIds: ["focused_observations"] },
];

export function getEmergencyScenario(id: EmergencyScenarioId | null): EmergencyScenario | null {
  return id ? EMERGENCY_SCENARIOS.find((scenario) => scenario.id === id) ?? null : null;
}

export function scenarioFromRedFlags(flags: { code: string; title?: string }[]): EmergencyScenarioId | null {
  const haystack = flags.map((flag) => `${flag.code} ${flag.title ?? ""}`.toLowerCase()).join(" ");
  if (/chest|صدر/.test(haystack)) return "chest_pain";
  if (/dysp|breath|تنفس/.test(haystack)) return "breathing";
  if (/bleed|نزف|نزيف/.test(haystack)) return "bleeding";
  if (/chok|اختناق/.test(haystack)) return "choking";
  if (/seiz|تشنج/.test(haystack)) return "seizure";
  if (/burn|حرق/.test(haystack)) return "burns";
  if (/head|رأس/.test(haystack)) return "head_injury";
  if (/poison|سم/.test(haystack)) return "poisoning";
  if (/allerg|anaphyl|حساس/.test(haystack)) return "allergy";
  if (/faint|conscious|وعي|إغم/.test(haystack)) return "fainting";
  return null;
}

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
