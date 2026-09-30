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
  repositoryUrl?: string | null;
}

export const trustedGitHubRepositories = [
  "https://github.com/HL7/fhir",
  "https://github.com/openmrs/openmrs-core",
  "https://github.com/OHDSI/CommonDataModel",
] as const;

/**
 * Clinical content is intentionally stricter than reference/technical use.
 * A GitHub repository being public, popular, or open source is not enough to
 * make it an approved clinical-knowledge source.
 */
export function mayImportClinicalKnowledge(source: ExternalSourcePolicy): boolean {
  return (
    source.maySupplyClinicalContent &&
    source.trustTier === "authoritative" &&
    source.integrationMode !== "reference_only" &&
    source.integrationMode !== "blocked" &&
    !isGitHubUrl(source.repositoryUrl ?? null)
  );
}

export function mayUseForTerminology(source: ExternalSourcePolicy): boolean {
  return (
    source.maySupplyTerminology &&
    source.trustTier !== "blocked" &&
    source.integrationMode !== "blocked" &&
    (!source.repositoryUrl || isTrustedGitHubRepository(source.repositoryUrl))
  );
}

export function mayUseForPopulationContext(source: ExternalSourcePolicy): boolean {
  return (
    source.maySupplyPopulationData &&
    source.trustTier === "authoritative" &&
    source.integrationMode === "population_context"
  );
}

export function isGitHubUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.hostname.toLowerCase() === "github.com";
  } catch {
    return false;
  }
}

export function normalizeGitHubRepositoryUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.hostname.toLowerCase() !== "github.com") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return `https://github.com/${parts[0]}/${parts[1]!.replace(/\.git$/i, "")}`;
  } catch {
    return null;
  }
}

/**
 * GitHub repositories are permitted only as technical/reference sources when
 * they are explicitly allow-listed and owned by established organizations.
 * They are never treated as patient-level clinical evidence.
 */
export function isTrustedGitHubRepository(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = normalizeGitHubRepositoryUrl(value);
  return !!normalized && trustedGitHubRepositories.includes(
    normalized as (typeof trustedGitHubRepositories)[number],
  );
}

export function validateExternalRepositoryPolicy(source: ExternalSourcePolicy): string[] {
  const errors: string[] = [];
  if (!source.repositoryUrl) return errors;

  if (isGitHubUrl(source.repositoryUrl) && !isTrustedGitHubRepository(source.repositoryUrl)) {
    errors.push("UNTRUSTED_GITHUB_REPOSITORY");
  }

  if (isGitHubUrl(source.repositoryUrl) && source.maySupplyClinicalContent) {
    errors.push("GITHUB_NOT_ALLOWED_AS_CLINICAL_EVIDENCE");
  }

  return errors;
}
