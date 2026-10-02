import { describe, expect, it } from "vitest";
import { buildMeasurementReviewPacks } from "./measurement-review-packs";

const ready = { publishBlockers: [], activationBlockers: [] };
const blocked = {
  publishBlockers: ["missing_source" as const],
  activationBlockers: ["not_published" as const],
};

describe("measurement review packs", () => {
  it("groups governed entities under their measurement type", () => {
    const packs = buildMeasurementReviewPacks([
      {
        id: "type-bp",
        measurementTypeId: "bp",
        kind: "type",
        reviewStatus: "draft",
        readiness: ready,
        actionable: true,
      },
      {
        id: "rule-bp",
        measurementTypeId: "bp",
        kind: "reference",
        reviewStatus: "in_review",
        readiness: blocked,
        actionable: false,
      },
      {
        id: "flag-bp",
        measurementTypeId: "bp",
        kind: "red_flag",
        reviewStatus: "approved",
        readiness: ready,
        actionable: true,
      },
      {
        id: "kb-spo2",
        measurementTypeId: "spo2",
        kind: "knowledge",
        reviewStatus: "published",
        readiness: ready,
        actionable: false,
      },
    ]);

    expect(packs).toHaveLength(2);

    const bp = packs.find((pack) => pack.measurementTypeId === "bp");
    expect(bp).toMatchObject({
      total: 3,
      draft: 1,
      inReview: 1,
      approved: 1,
      publishBlocked: 1,
      actionable: 2,
      typeCount: 1,
      referenceCount: 1,
      redFlagCount: 1,
      knowledgeCount: 0,
    });
  });

  it("keeps the first actionable item as the pack next action", () => {
    const [pack] = buildMeasurementReviewPacks([
      {
        id: "first",
        measurementTypeId: "x",
        kind: "red_flag",
        reviewStatus: "in_review",
        readiness: ready,
        actionable: true,
      },
      {
        id: "second",
        measurementTypeId: "x",
        kind: "reference",
        reviewStatus: "approved",
        readiness: ready,
        actionable: true,
      },
    ]);

    expect(pack?.nextActionableItemId).toBe("first");
  });

  it("counts activation readiness independently from publication blockers", () => {
    const [pack] = buildMeasurementReviewPacks([
      {
        id: "a",
        measurementTypeId: "x",
        kind: "type",
        reviewStatus: "published",
        readiness: ready,
        actionable: true,
      },
      {
        id: "b",
        measurementTypeId: "x",
        kind: "knowledge",
        reviewStatus: "draft",
        readiness: blocked,
        actionable: false,
      },
    ]);

    expect(pack?.activationReady).toBe(1);
    expect(pack?.publishBlocked).toBe(1);
  });
});
