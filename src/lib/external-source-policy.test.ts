import { describe, expect, it } from "vitest";
import {
  isTrustedGitHubRepository,
  mayImportClinicalKnowledge,
  mayUseForPopulationContext,
  mayUseForTerminology,
  normalizeGitHubRepositoryUrl,
  validateExternalRepositoryPolicy,
  type ExternalSourcePolicy,
} from "./external-source-policy";

function source(overrides: Partial<ExternalSourcePolicy> = {}): ExternalSourcePolicy {
  return {
    sourceKey: "test",
    trustTier: "authoritative",
    integrationMode: "terminology_mapping",
    maySupplyClinicalContent: false,
    maySupplyTerminology: false,
    maySupplyPopulationData: false,
    ...overrides,
  };
}

describe("external source policy", () => {
  it("does not treat a public/community GitHub repository as clinical evidence", () => {
    expect(mayImportClinicalKnowledge(source({
      trustTier: "community_reference",
      integrationMode: "reference_only",
      maySupplyClinicalContent: true,
      repositoryUrl: "https://github.com/example/symptom-checker",
    }))).toBe(false);
  });

  it("permits authoritative terminology sources without making them clinical evidence", () => {
    const umls = source({
      trustTier: "authoritative",
      integrationMode: "terminology_mapping",
      maySupplyTerminology: true,
    });

    expect(mayUseForTerminology(umls)).toBe(true);
    expect(mayImportClinicalKnowledge(umls)).toBe(false);
  });

  it("keeps population data out of patient-level clinical evidence", () => {
    const who = source({
      trustTier: "authoritative",
      integrationMode: "population_context",
      maySupplyPopulationData: true,
    });

    expect(mayUseForPopulationContext(who)).toBe(true);
    expect(mayImportClinicalKnowledge(who)).toBe(false);
  });

  it("blocks all use when a source is blocked", () => {
    const blocked = source({
      trustTier: "blocked",
      integrationMode: "blocked",
      maySupplyTerminology: true,
      maySupplyPopulationData: true,
      maySupplyClinicalContent: true,
    });

    expect(mayUseForTerminology(blocked)).toBe(false);
    expect(mayUseForPopulationContext(blocked)).toBe(false);
    expect(mayImportClinicalKnowledge(blocked)).toBe(false);
  });

  it("normalizes repository URLs before trust checks", () => {
    expect(normalizeGitHubRepositoryUrl("https://github.com/HL7/fhir.git"))
      .toBe("https://github.com/HL7/fhir");
    expect(normalizeGitHubRepositoryUrl("https://github.com/OHDSI/CommonDataModel/tree/main"))
      .toBe("https://github.com/OHDSI/CommonDataModel");
  });

  it("accepts only the approved organization repositories", () => {
    expect(isTrustedGitHubRepository("https://github.com/HL7/fhir")).toBe(true);
    expect(isTrustedGitHubRepository("https://github.com/openmrs/openmrs-core")).toBe(true);
    expect(isTrustedGitHubRepository("https://github.com/OHDSI/CommonDataModel")).toBe(true);
    expect(isTrustedGitHubRepository("https://github.com/random-user/medical-ai")).toBe(false);
  });

  it("never allows an approved GitHub repository to become clinical evidence", () => {
    const result = validateExternalRepositoryPolicy(source({
      repositoryUrl: "https://github.com/HL7/fhir",
      maySupplyClinicalContent: true,
      integrationMode: "reference_only",
    }));

    expect(result).toContain("GITHUB_NOT_ALLOWED_AS_CLINICAL_EVIDENCE");
    expect(mayImportClinicalKnowledge(source({
      repositoryUrl: "https://github.com/HL7/fhir",
      maySupplyClinicalContent: true,
      integrationMode: "reference_only",
    }))).toBe(false);
  });

  it("rejects unknown GitHub repositories at registration time", () => {
    expect(validateExternalRepositoryPolicy(source({
      repositoryUrl: "https://github.com/LabinatorSolutions/medical-symptom-checker",
      integrationMode: "reference_only",
    }))).toContain("UNTRUSTED_GITHUB_REPOSITORY");
  });
});
