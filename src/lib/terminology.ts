export type TerminologyEntityType =
  | "symptom"
  | "condition"
  | "question"
  | "first_aid_topic";

export type TerminologyMappingStatus =
  | "draft"
  | "reviewed"
  | "approved"
  | "rejected";

export interface TerminologyCandidate {
  terminologySystem: string;
  externalCode: string;
  preferredTerm: string;
  externalUri?: string | null;
  semanticType?: string | null;
}

export interface TerminologySearchRequest {
  text: string;
  language?: string;
  semanticGroup?: string;
  pageSize?: number;
}

export interface TerminologyProvider {
  readonly key: string;
  readonly requiresCredentials: boolean;
  search(request: TerminologySearchRequest): Promise<TerminologyCandidate[]>;
}

/**
 * Safe no-op provider used until a server-side licensed terminology provider
 * is explicitly configured. UMLS keys must never be exposed to the browser.
 */
export class DisabledTerminologyProvider implements TerminologyProvider {
  readonly key = "disabled";
  readonly requiresCredentials = false;

  async search(): Promise<TerminologyCandidate[]> {
    return [];
  }
}
