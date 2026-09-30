import { describe, expect, it } from "vitest";
import { importGovernanceDefaults, validateMedicalImport } from "./medical-import";

const source = {
  ref: "src-1",
  title: "Clinical guideline",
  organization: "Example authority",
  url: "https://example.org/guideline",
  sourceType: "clinical_guideline" as const,
};

describe("controlled medical import", () => {
  it("accepts a source-backed draft bundle", () => {
    const result = validateMedicalImport({
      schemaVersion: "1",
      bundleId: "bundle-1",
      createdAt: "2026-09-28T00:00:00.000Z",
      sources: [source],
      items: [{
        kind: "condition",
        code: "example_condition",
        nameAr: "حالة تجريبية",
        summaryAr: "ملخص تجريبي",
        sourceRefs: ["src-1"],
        changeReason: "Initial controlled import",
      }],
    });
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects clinical content without sources", () => {
    const result = validateMedicalImport({
      schemaVersion: "1",
      bundleId: "bundle-1",
      createdAt: "2026-09-28T00:00:00.000Z",
      sources: [source],
      items: [{
        kind: "red_flag",
        code: "example_flag",
        titleAr: "علامة خطر",
        descriptionAr: "وصف",
        careLevel: "emergency",
        sourceRefs: [],
        changeReason: "Initial controlled import",
      }],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects references to sources that are not in the bundle", () => {
    const result = validateMedicalImport({
      schemaVersion: "1",
      bundleId: "bundle-1",
      createdAt: "2026-09-28T00:00:00.000Z",
      sources: [source],
      items: [{
        kind: "question",
        code: "q1",
        questionAr: "هل يوجد عرض؟",
        questionType: "yes_no",
        sourceRefs: ["missing"],
        changeReason: "Initial controlled import",
      }],
    });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain("unknown source ref");
  });

  it("rejects duplicate clinical item codes within the same kind", () => {
    const item = {
      kind: "first_aid" as const,
      code: "burns",
      titleAr: "الحروق",
      summaryAr: "ملخص",
      sourceRefs: ["src-1"],
      changeReason: "Initial controlled import",
    };
    const result = validateMedicalImport({
      schemaVersion: "1",
      bundleId: "bundle-1",
      createdAt: "2026-09-28T00:00:00.000Z",
      sources: [source],
      items: [item, item],
    });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain("duplicate item code");
  });

  it("rejects GitHub repository URLs as primary clinical evidence", () => {
    const result = validateMedicalImport({
      schemaVersion: "1",
      bundleId: "bundle-github",
      createdAt: "2026-09-30T00:00:00.000Z",
      sources: [{
        ref: "github-source",
        title: "Open repository",
        organization: "Example",
        url: "https://github.com/HL7/fhir",
        sourceType: "reference",
      }],
      items: [{
        kind: "condition",
        code: "github_condition",
        nameAr: "حالة",
        summaryAr: "ملخص",
        sourceRefs: ["github-source"],
        changeReason: "Test GitHub source rejection",
      }],
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("not accepted as primary clinical evidence");
  });

  it("forces imported knowledge into a non-active draft state", () => {
    expect(importGovernanceDefaults()).toEqual({
      review_status: "draft",
      is_active: false,
      is_demo: false,
      translation_status: "not_started",
    });
  });
});
