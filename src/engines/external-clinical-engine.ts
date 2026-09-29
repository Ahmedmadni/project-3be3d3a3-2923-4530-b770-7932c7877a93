import type { CareLevel } from "@/types/medical";

export interface ExternalClinicalObservation {
  code: string;
  present: boolean;
  sourceSystem?: string;
}

export interface ExternalClinicalAssessment {
  age?: number;
  sex?: "male" | "female";
  observations: ExternalClinicalObservation[];
}

export interface ExternalClinicalCondition {
  externalId: string;
  name: string;
  confidence?: number;
}

export interface ExternalClinicalComparison {
  provider: string;
  triage?: CareLevel | string;
  conditions: ExternalClinicalCondition[];
  rawVersion?: string;
}

export interface ExternalClinicalEngine {
  readonly key: string;
  readonly mode: "disabled" | "shadow_compare";
  compare(input: ExternalClinicalAssessment): Promise<ExternalClinicalComparison | null>;
}

/**
 * Default production adapter. External clinical engines are opt-in and may
 * never replace or suppress the local deterministic safety pipeline.
 */
export class DisabledExternalClinicalEngine implements ExternalClinicalEngine {
  readonly key = "disabled";
  readonly mode = "disabled" as const;

  async compare(): Promise<null> {
    return null;
  }
}

/**
 * Contract placeholder for a future Infermedica server adapter.
 *
 * Important:
 * - credentials belong on the server only;
 * - shadow comparison must run after the local safety decision;
 * - output is QA evidence, not the user-visible source of truth;
 * - identifiable health information must not be sent by default.
 */
export interface InfermedicaShadowConfig {
  endpointBase: string;
  appId: string;
  appKey: string;
  enabled: boolean;
  sendIdentifiableHealthData: false;
}
