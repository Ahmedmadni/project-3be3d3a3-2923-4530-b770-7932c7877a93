import { describe, expect, it } from "vitest";
import {
  diffMeasurementSnapshot,
  formatMeasurementDiffValue,
} from "./measurement-snapshot-diff";

describe("measurement snapshot diff", () => {
  it("ignores governance metadata and reports content changes", () => {
    const previous = {
      id: "same",
      review_status: "published",
      updated_at: "2026-01-01",
      label_ar: "قديم",
      predicate: { all: [{ value: 10 }] },
      is_active: true,
      version: 1,
    };
    const current = {
      id: "same",
      review_status: "in_review",
      updated_at: "2026-10-02",
      label_ar: "جديد",
      predicate: { all: [{ value: 12 }] },
      is_active: false,
      version: 2,
    };

    expect(diffMeasurementSnapshot(current, previous)).toEqual([
      { path: "label_ar", before: "قديم", after: "جديد" },
      {
        path: "predicate.all",
        before: [{ value: 10 }],
        after: [{ value: 12 }],
      },
    ]);
  });

  it("reports added and removed fields", () => {
    expect(
      diffMeasurementSnapshot(
        { code: "x", description_ar: "نص" },
        { code: "x", name_en: "Name" },
      ),
    ).toEqual([
      { path: "description_ar", before: undefined, after: "نص" },
      { path: "name_en", before: "Name", after: undefined },
    ]);
  });

  it("formats values for Arabic review UI", () => {
    expect(formatMeasurementDiffValue(null)).toBe("فارغ");
    expect(formatMeasurementDiffValue(true)).toBe("نعم");
    expect(formatMeasurementDiffValue(undefined)).toBe("—");
  });
});
