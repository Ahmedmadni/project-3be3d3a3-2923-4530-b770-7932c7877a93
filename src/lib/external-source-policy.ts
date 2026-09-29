export type ExternalTrustTier =
  | "authoritative"
  | "established_organization"
  | "commercial_vendor"
  | "community_reference"
  | "blocked";

export type ExternalIntegrationMode =
  | "terminology_mapping"
  | "shadow_compare"
  | "population_context"
  | "reference_only"
  | "blocked";

export interface ExternalSourcePolicy {
  sourceKey: string;
  trustTier: ExternalTrustTier;
  integrationMode: ExternalIntegrationMode;
  maySupplyClinicalContent: boolean;
  maySupplyTerminology: boolean;
  maySupplyPopulationData: boolean;
}

/**
 * Clinical content is intentionally stricter than reference/technical use.
 * A GitHub repository being public or popular is not enough to make it an
 * approved clinical-knowledge source.
 */
export function mayImportClinicalKnowledge(source: ExternalSourcePolicy): boolean {
  return (
    source.maySupplyClinicalContent &&
    source.trustTier === "authoritative" &&
    source.integrationMode !== "reference_only" &&
    source.integrationMode !== "blocked"
  );
}

export function mayUseForTerminology(source: ExternalSourcePolicy): boolean {
  return (
    source.maySupplyTerminology &&
    source.trustTier !== "blocked" &&
    source.integrationMode !== "blocked"
  );
}

export function mayUseForPopulationContext(source: ExternalSourcePolicy): boolean {
  return (
    source.maySupplyPopulationData &&
    source.trustTier === "authoritative" &&
    source.integrationMode === "population_context"
  );
}
