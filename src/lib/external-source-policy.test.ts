import { describe, expect, it } from "vitest";
import { githubResourceIsTrustedReference, maySupportClinicalPublication } from "./external-source-policy";

describe("external source policy", () => {
  it("rejects community GitHub repositories as trusted clinical references", () => {
    expect(githubResourceIsTrustedReference({
      resourceType: "github_repository",
      trustLevel: "community",
      clinicalUseStatus: "engineering_reference",
      ownerVerified: false,
      url: "https://github.com/example/project",
    })).toBe(false);
  });

  it("allows an officially verified GitHub repository only as an engineering reference", () => {
    expect(githubResourceIsTrustedReference({
      resourceType: "github_repository",
      trustLevel: "official",
      clinicalUseStatus: "engineering_reference",
      ownerVerified: true,
      url: "https://github.com/WorldHealthOrganization/godata",
    })).toBe(true);
  });

  it("requires explicit clinical approval as well as source trust", () => {
    expect(maySupportClinicalPublication({
      active: true,
      clinicalUseAllowed: true,
      trustLevel: "authoritative",
    })).toBe(true);

    expect(maySupportClinicalPublication({
      active: true,
      clinicalUseAllowed: false,
      trustLevel: "authoritative",
    })).toBe(false);

    expect(maySupportClinicalPublication({
      active: true,
      clinicalUseAllowed: true,
      trustLevel: "community",
    })).toBe(false);
  });
});
