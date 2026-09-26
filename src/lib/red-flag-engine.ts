import type { BasicInfo, CareLevel, SessionAnswer, Severity, SymptomDetail } from "@/types/medical";

export interface RedFlagInput {
  symptoms: string[];
  answers: SessionAnswer[];
  severity: Record<string, Severity | "">;
  age?: number;
  basic?: BasicInfo;
}
export interface RedFlagOutput { level: CareLevel; reasons: string[] }

/**
 * RedFlagEngine — MOCK logic for UI only. Not medical logic.
 * Will be replaced by database-driven rules.
 */
export const RedFlagEngine = {
  evaluate(input: RedFlagInput): RedFlagOutput {
    const reasons: string[] = [];
    const a = (id: string) => input.answers.find((x) => x.questionId === id)?.value;
    if (input.symptoms.includes("chest-pain") && input.severity["chest-pain"] === "severe") reasons.push("ألم صدر شديد");
    if (input.symptoms.includes("dyspnea") && (input.severity["dyspnea"] === "severe" || a("dy-rest") === "yes")) reasons.push("صعوبة شديدة في التنفس");
    if (a("dz-faint") === "yes") reasons.push("فقدان وعي");
    if (a("hd-worst") === "yes") reasons.push("صداع مفاجئ شديد");
    if (reasons.length) return { level: "emergency", reasons };
    if (Object.values(input.severity).includes("severe")) return { level: "urgent", reasons: ["عرض شديد"] };
    return { level: input.symptoms.length > 2 ? "routine" : "self-care", reasons: [] };
  },
};

export const severityMap = (details: Record<string, SymptomDetail>) =>
  Object.fromEntries(Object.entries(details).map(([k, v]) => [k, v.severity]));
