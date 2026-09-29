import type { SessionInput, PossibleConditionResult, TriageResult } from "@/types/medical";

export interface ClinicalEngineAssessment {
  triage: TriageResult;
  results: PossibleConditionResult[];
}

export interface ClinicalEngineAdapter {
  readonly providerCode: string;
  readonly mode: "disabled" | "shadow" | "active";

  /**
   * External engines must be called server-side. Implementations must never
   * expose provider credentials in the browser bundle.
   */
  assess(input: SessionInput): Promise<ClinicalEngineAssessment>;
}

export interface ShadowComparison {
  providerCode: string;
  localCareLevel: TriageResult["level"];
  externalCareLevel: TriageResult["level"] | null;
  agreement: boolean | null;
  error?: string;
}

/**
 * Shadow mode is quality assurance only: the local reviewed engine remains the
 * user-facing authority. External output must not silently change care advice.
 */
export function buildShadowComparison(
  providerCode: string,
  local: ClinicalEngineAssessment,
  external: ClinicalEngineAssessment | null,
  error?: string,
): ShadowComparison {
  return {
    providerCode,
    localCareLevel: local.triage.level,
    externalCareLevel: external?.triage.level ?? null,
    agreement: external ? local.triage.level === external.triage.level : null,
    error,
  };
}
