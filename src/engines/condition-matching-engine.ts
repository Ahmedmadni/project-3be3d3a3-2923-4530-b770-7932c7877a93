import type { AnswerMap, Compatibility, PossibleConditionResult, Reason, SessionInput } from "@/types/medical";
import type { ReferenceData } from "./reference";

export const ENGINE_VERSION = "matching-v1";

export interface MatchingOptions {
  /** production: published conditions only; development: visible demo/draft data may be exercised for testing */
  contentMode: "production" | "development";
  maxResults?: number;
}

export type Adjuster = (ctx: { conditionId: string; input: SessionInput; score: number; reasons: Reason[] }) => number;
const adjusters: Adjuster[] = [];

export const ConditionMatchingEngine = {
  run(ref: Pick<ReferenceData, "conditions" | "conditionSymptoms">, input: SessionInput, opts: MatchingOptions): PossibleConditionResult[] {
    const selected = new Set(input.symptomIds);
    if (selected.size === 0) return [];

    const conditions = ref.conditions.filter(
      (c) =>
        c.is_active &&
        c.review_status !== "retired" &&
        (opts.contentMode === "development" || c.review_status === "published"),
    );

    const out: PossibleConditionResult[] = [];
    for (const c of conditions) {
      const links = ref.conditionSymptoms.filter((l) => l.condition_id === c.id && l.is_active);
      if (!links.length) continue;
      let score = 0;
      let max = 0;
      const matched: string[] = [];
      const contradicting: string[] = [];
      const reasons: Reason[] = [];
      for (const l of links) {
        const w = Number(l.weight) || 0;
        const factor = l.relationship_type === "supports" ? (l.is_core_symptom ? 1.5 : 1) : l.relationship_type === "weak_support" ? 0.5 : 0;
        max += w * factor;
        if (!selected.has(l.symptom_id)) continue;
        if (l.relationship_type === "contradicts") {
          score -= w;
          contradicting.push(l.symptom_id);
          reasons.push({ code: "CONTRADICTING_FINDING", symptomId: l.symptom_id });
        } else if (factor > 0) {
          score += w * factor;
          matched.push(l.symptom_id);
          reasons.push({ code: l.is_core_symptom ? "MATCHED_PRIMARY_SYMPTOM" : "MATCHED_SECONDARY_SYMPTOM", symptomId: l.symptom_id });
        }
      }
      for (const adj of adjusters) score = adj({ conditionId: c.id, input, score, reasons });
      if (!matched.length || max <= 0) continue;
      const normalised = Math.max(0, score / max);
      if (normalised <= 0) continue;
      out.push({
        conditionId: c.id,
        internalScore: Number(normalised.toFixed(4)),
        compatibilityLevel: toLevel(normalised),
        matchedSymptoms: matched,
        contradictingSymptoms: contradicting,
        reasonCodes: reasons,
        careLevel: c.care_level,
      });
    }
    return out.sort((a, b) => b.internalScore - a.internalScore).slice(0, opts.maxResults ?? 5);
  },
};

export function toLevel(score: number): Compatibility {
  if (score >= 0.6) return "high";
  if (score >= 0.3) return "medium";
  return "low";
}

export type { AnswerMap };
