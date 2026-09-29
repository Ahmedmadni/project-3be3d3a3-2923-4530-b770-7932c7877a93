export type ExternalTrustLevel =
  | "official"
  | "validated_commercial"
  | "community"
  | "unknown";

export type ExternalClinicalUseStatus =
  | "terminology_only"
  | "population_data_only"
  | "shadow_evaluation"
  | "engineering_reference"
  | "not_approved";

export interface ExternalSourceAssessment {
  resourceType: "github_repository" | "terminology_api" | "population_data_api" | "clinical_engine" | "reference";
  trustLevel: ExternalTrustLevel;
  clinicalUseStatus: ExternalClinicalUseStatus;
  ownerVerified: boolean;
  url: string;
}

/**
 * GitHub repositories are never accepted as clinical evidence merely because
 * their code/data is public. For GitHub, the owner must be verified and the
 * registry must explicitly limit the repository to an approved non-clinical
 * role unless a separate medical-source review has been completed.
 */
export function githubResourceIsTrustedReference(source: ExternalSourceAssessment): boolean {
  if (source.resourceType !== "github_repository") return false;
  if (!source.ownerVerified || source.trustLevel !== "official") return false;
  return source.clinicalUseStatus === "engineering_reference";
}

export function maySupportClinicalPublication(source: {
  clinicalUseAllowed: boolean;
  trustLevel: string;
  active: boolean;
}): boolean {
  return (
    source.active &&
    source.clinicalUseAllowed &&
    ["authoritative", "trusted_nonprofit", "validated_commercial"].includes(source.trustLevel)
  );
}
