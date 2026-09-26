import type { PossibleConditionResult, SessionInput, TriageResult } from "@/types/medical";
import type { ReferenceData } from "./reference";
import { RedFlagEngine } from "./red-flag-engine";
import { ConditionMatchingEngine, type MatchingOptions } from "./condition-matching-engine";
import { maxCareLevel } from "./care-level";

export interface PipelineOutput { triage: TriageResult; results: PossibleConditionResult[] }

/**
 * Safety pipeline: RedFlagEngine runs first. If emergency, matching is skipped.
 * Matching can never downgrade the triage decision.
 */
export function runSafetyPipeline(ref: ReferenceData, input: SessionInput, opts: MatchingOptions): PipelineOutput {
  const severity = Object.fromEntries(input.symptomIds.map((id) => [id, input.details[id]?.severity ?? ""]));
  const age = Number(input.basic.age) || undefined;
  const triage = RedFlagEngine.evaluate(ref, { symptomIds: input.symptomIds, answers: input.answers, severity, age });
  if (triage.level === "emergency") return { triage, results: [] };
  const results = ConditionMatchingEngine.run(ref, input, opts);
  // results inform care level upward only
  const level = results.reduce((l, r) => (r.careLevel === "emergency" ? l : maxCareLevel(l, r.careLevel)), triage.level);
  return { triage: { ...triage, level }, results };
}
