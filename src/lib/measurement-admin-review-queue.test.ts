import { describe, expect, it } from "vitest";
import {
  filterMeasurementAdminQueue,
  summarizeMeasurementAdminQueue,
  type MeasurementAdminQueueItem,
} from "./measurement-admin-review-queue";

const items: MeasurementAdminQueueItem[] = [
  {
    id: "bp",
    measurementTypeId: "type-bp",
    searchText: "ضغط الدم blood_pressure",
    reviewStatus: "draft",
    readiness: { publishBlockers: [], activationBlockers: ["not_published"] },
  },
  {
    id: "spo2",
    measurementTypeId: "type-spo2",
    searchText: "تشبع الأكسجين oxygen_saturation",
    reviewStatus: "in_review",
    readiness: {
      publishBlockers: ["missing_source"],
      activationBlockers: ["not_published", "missing_source"],
    },
  },
  {
    id: "pulse",
    measurementTypeId: "type-pulse",
    searchText: "النبض pulse",
    reviewStatus: "published",
    readiness: { publishBlockers: [], activationBlockers: [] },
  },
];

describe("measurement admin review queue", () => {
  it("filters by Arabic search text", () => {
    const result = filterMeasurementAdminQueue(items, {
      search: "الأكسجين",
      status: "all",
      readiness: "all",
      measurementTypeId: "all",
    });

    expect(result.map((item) => item.id)).toEqual(["spo2"]);
  });

  it("combines status, type and readiness filters", () => {
    const result = filterMeasurementAdminQueue(items, {
      search: "",
      status: "published",
      readiness: "activation_ready",
      measurementTypeId: "type-pulse",
    });

    expect(result.map((item) => item.id)).toEqual(["pulse"]);
  });

  it("separates publish readiness from activation readiness", () => {
    const publishReady = filterMeasurementAdminQueue(items, {
      search: "",
      status: "all",
      readiness: "publish_ready",
      measurementTypeId: "all",
    });
    const activationReady = filterMeasurementAdminQueue(items, {
      search: "",
      status: "all",
      readiness: "activation_ready",
      measurementTypeId: "all",
    });

    expect(publishReady).toHaveLength(2);
    expect(activationReady.map((item) => item.id)).toEqual(["pulse"]);
  });

  it("summarizes the review queue", () => {
    expect(summarizeMeasurementAdminQueue(items)).toEqual({
      total: 3,
      publishReady: 2,
      publishBlocked: 1,
      activationReady: 1,
    });
  });
});
