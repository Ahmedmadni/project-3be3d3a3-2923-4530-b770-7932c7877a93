import { describe, expect, it } from "vitest";
import {
  mayImportClinicalKnowledge,
  mayUseForPopulationContext,
  mayUseForTerminology,
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
});
