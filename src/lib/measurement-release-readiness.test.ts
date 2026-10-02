import { describe, expect, it } from "vitest";
import { measurementReleaseReadiness } from "./measurement-release-readiness";

describe("measurement release readiness", () => {
  it("blocks measurement-type publication without an active source", () => {
    const result = measurementReleaseReadiness({
      kind: "type",
      reviewStatus: "approved",
      isDemo: false,
      sourceCount: 1,
      activeSourceCount: 0,
    });

    expect(result.publishBlockers).toContain("missing_active_type_source");
    expect(result.activationBlockers).toContain("not_published");
  });

  it("allows publishing a sourced rule while keeping activation source-aware", () => {
    const result = measurementReleaseReadiness({
      kind: "reference",
      reviewStatus: "approved",
      isDemo: false,
      sourceCount: 1,
      sourceActive: false,
      parentReviewStatus: "published",
      parentActive: true,
    });

    expect(result.publishBlockers).toEqual([]);
    expect(result.activationBlockers).toContain("inactive_source");
  });

  it("allows activation when a published rule has active source and released parent", () => {
    const result = measurementReleaseReadiness({
      kind: "red_flag",
      reviewStatus: "published",
      isDemo: false,
      sourceCount: 1,
      sourceActive: true,
      parentReviewStatus: "published",
      parentActive: true,
    });

    expect(result.activationBlockers).toEqual([]);
  });

  it("blocks empty knowledge articles from release", () => {
    const result = measurementReleaseReadiness({
      kind: "knowledge",
      reviewStatus: "approved",
      isDemo: false,
      sourceCount: 0,
      activeSourceCount: 0,
      sectionCount: 0,
      parentReviewStatus: "published",
      parentActive: true,
    });

    expect(result.publishBlockers).toEqual(
      expect.arrayContaining([
        "missing_knowledge_source",
        "missing_knowledge_sections",
      ]),
    );
  });

  it("blocks demo content for publication and activation", () => {
    const result = measurementReleaseReadiness({
      kind: "type",
      reviewStatus: "published",
      isDemo: true,
      sourceCount: 1,
      activeSourceCount: 1,
    });

    expect(result.publishBlockers).toContain("demo_content");
    expect(result.activationBlockers).toContain("demo_content");
  });
});
