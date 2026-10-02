import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = readFileSync(
  new URL("../routes/admin.measurements.tsx", import.meta.url),
  "utf8",
);

describe("measurement review pack dashboard UI", () => {
  it("renders review packs and their content mix", () => {
    expect(route).toContain("حزم المراجعة حسب نوع القياس");
    expect(route).toContain("pack.referenceCount");
    expect(route).toContain("pack.redFlagCount");
    expect(route).toContain("pack.knowledgeCount");
    expect(route).toContain("pack.publishBlocked");
    expect(route).toContain("pack.activationReady");
  });

  it("opens the next actionable item in a pack when available", () => {
    expect(route).toContain("pack.nextActionableItemId");
    expect(route).toContain('nextItem ? "فتح التالي في الحزمة" : "عرض الحزمة"');
    expect(route).toContain("nextItem ? onOpen(nextItem) : onViewPack(type.id)");
  });

  it("can focus a pack even when the current role has no actionable item", () => {
    expect(route).toContain("setMeasurementTypeFilter(measurementTypeId)");
    expect(route).toContain('setTab("types")');
    expect(route).toContain("setFocusTargetId(measurementTypeId)");
  });
});
