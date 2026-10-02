import { describe, expect, it } from "vitest";
import {
  measurementReviewPriorityReason,
  sortMeasurementReviewQueue,
  type MeasurementReviewPriorityItem,
} from "./measurement-review-priority";

const ready = { publishBlockers: [], activationBlockers: [] };
const blocked = {
  publishBlockers: ["missing_source" as const],
  activationBlockers: ["not_published" as const],
};

describe("measurement review priority", () => {
  it("puts active review work before drafts and published items", () => {
    const items: MeasurementReviewPriorityItem[] = [
      { id: "draft", kind: "type", reviewStatus: "draft", readiness: ready },
      { id: "published", kind: "red_flag", reviewStatus: "published", readiness: ready },
      { id: "review", kind: "knowledge", reviewStatus: "in_review", readiness: ready },
      { id: "approved", kind: "type", reviewStatus: "approved", readiness: ready },
    ];

    expect(sortMeasurementReviewQueue(items).map((item) => item.id)).toEqual([
      "review",
      "approved",
      "draft",
      "published",
    ]);
  });

  it("prioritizes blocked review items for attention within the same workflow state", () => {
    const items: MeasurementReviewPriorityItem[] = [
      { id: "clean", kind: "red_flag", reviewStatus: "in_review", readiness: ready },
      { id: "blocked", kind: "knowledge", reviewStatus: "in_review", readiness: blocked },
    ];

    expect(sortMeasurementReviewQueue(items)[0]?.id).toBe("blocked");
  });

  it("uses safety-related entity kind and stored priority as deterministic tie breakers", () => {
    const items: MeasurementReviewPriorityItem[] = [
      { id: "knowledge", kind: "knowledge", reviewStatus: "in_review", readiness: ready },
      { id: "rule-20", kind: "reference", reviewStatus: "in_review", readiness: ready, priority: 20 },
      { id: "rule-5", kind: "reference", reviewStatus: "in_review", readiness: ready, priority: 5 },
      { id: "flag", kind: "red_flag", reviewStatus: "in_review", readiness: ready, priority: 99 },
    ];

    expect(sortMeasurementReviewQueue(items).map((item) => item.id)).toEqual([
      "flag",
      "rule-5",
      "rule-20",
      "knowledge",
    ]);
  });

  it("explains why the next item is prioritized", () => {
    expect(
      measurementReviewPriorityReason({
        id: "x",
        kind: "reference",
        reviewStatus: "approved",
        readiness: ready,
      }),
    ).toContain("جاهز");
  });
});
