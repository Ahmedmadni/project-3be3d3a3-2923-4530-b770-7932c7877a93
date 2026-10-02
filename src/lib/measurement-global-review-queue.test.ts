import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = readFileSync(
  new URL("../routes/admin.measurements.tsx", import.meta.url),
  "utf8",
);

describe("measurement global review queue UI", () => {
  it("renders a unified queue across governed measurement entities", () => {
    expect(route).toContain("طابور المراجعة الموحد");
    expect(route).toContain("globalActiveQueue.slice(0, 5)");
    expect(route).toContain("sortMeasurementReviewQueue([");
    expect(route).toContain("...typeQueueItems");
    expect(route).toContain("...referenceQueueItems");
    expect(route).toContain("...redFlagQueueItems");
    expect(route).toContain("...knowledgeQueueItems");
  });

  it("opens a queue item in its owning tab and clears hiding filters", () => {
    expect(route).toContain('setSearchQuery("");');
    expect(route).toContain('setStatusFilter("all");');
    expect(route).toContain('setReadinessFilter("all");');
    expect(route).toContain('setMeasurementTypeFilter("all");');
    expect(route).toContain("setTab(tabForReviewKind(item.kind));");
    expect(route).toContain("setFocusTargetId(item.id);");
  });

  it("scrolls to the selected review card after the tab changes", () => {
    expect(route).toContain("measurement-review-\${focusTargetId}");
    expect(route).toContain('behavior: "smooth"');
    expect(route).toContain('block: "start"');
  });
});
