import { describe, expect, it } from "vitest";
import {
  medicationEventSummary,
  sortHealthTimeline,
} from "./health-timeline";

describe("health timeline", () => {
  it("sorts mixed health events newest first", () => {
    expect(
      sortHealthTimeline([
        {
          id: "a",
          kind: "journal",
          occurredAt: "2026-10-01T08:00:00Z",
          title: "Journal",
        },
        {
          id: "b",
          kind: "measurement",
          occurredAt: "2026-10-03T08:00:00Z",
          title: "Measurement",
        },
        {
          id: "c",
          kind: "medication",
          occurredAt: "2026-10-02T08:00:00Z",
          title: "Medication",
        },
      ]).map((item) => item.id),
    ).toEqual(["b", "c", "a"]);
  });

  it("summarizes only recorded medication actions", () => {
    expect(
      medicationEventSummary([
        { status: "taken" },
        { status: "taken" },
        { status: "skipped" },
      ]),
    ).toEqual({ total: 3, taken: 2, skipped: 1 });
  });
});
