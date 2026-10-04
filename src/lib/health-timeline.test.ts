import { describe, expect, it } from "vitest";
import {
  countHealthTimelineKinds,
  filterHealthTimeline,
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

  it("filters by kind, range, and free-text search", () => {
    const now = new Date("2026-10-10T12:00:00Z");
    const items = [
      {
        id: "journal-old",
        kind: "journal" as const,
        occurredAt: "2026-08-01T08:00:00Z",
        title: "Old note",
      },
      {
        id: "journal-recent",
        kind: "journal" as const,
        occurredAt: "2026-10-08T08:00:00Z",
        title: "Headache note",
        subtitle: "Morning symptoms",
      },
      {
        id: "measurement-recent",
        kind: "measurement" as const,
        occurredAt: "2026-10-09T08:00:00Z",
        title: "Blood pressure",
      },
    ];

    expect(
      filterHealthTimeline(items, {
        kind: "journal",
        query: "headache",
        rangeDays: 7,
        now,
      }).map((item) => item.id),
    ).toEqual(["journal-recent"]);
  });

  it("counts timeline categories without changing clinical meaning", () => {
    expect(
      countHealthTimelineKinds([
        {
          id: "1",
          kind: "journal",
          occurredAt: "2026-10-01T08:00:00Z",
          title: "A",
        },
        {
          id: "2",
          kind: "measurement",
          occurredAt: "2026-10-02T08:00:00Z",
          title: "B",
        },
        {
          id: "3",
          kind: "measurement",
          occurredAt: "2026-10-03T08:00:00Z",
          title: "C",
        },
      ]),
    ).toEqual({
      journal: 1,
      medication: 0,
      measurement: 2,
      symptom_check: 0,
    });
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
