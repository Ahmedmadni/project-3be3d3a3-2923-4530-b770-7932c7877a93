import type { CareLevel, PossibleConditionResult, SessionInput, TriageResult } from "@/types/medical";
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
  const triage = RedFlagEngine.evaluate(
    ref,
    { symptomIds: input.symptomIds, answers: input.answers, severity, age },
    { contentMode: opts.contentMode },
  );
  if (triage.level === "emergency") return { triage, results: [] };
  const results = ConditionMatchingEngine.run(ref, input, opts);
  // results inform care level upward only
  let level: CareLevel = triage.level;
  for (const r of results) if (r.careLevel !== "emergency") level = maxCareLevel(level, r.careLevel);
  return { triage: { ...triage, level }, results };
}
