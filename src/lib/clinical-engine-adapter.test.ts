import { describe, expect, it } from "vitest";
import { buildShadowComparison } from "./clinical-engine-adapter";

describe("clinical engine adapter", () => {
  it("keeps comparison informational rather than replacing the local result", () => {
    const comparison = buildShadowComparison(
      "infermedica",
      { triage: { level: "urgent", flags: [], source: "rules" }, results: [] },
      { triage: { level: "emergency", flags: [], source: "rules" }, results: [] },
    );

    expect(comparison).toMatchObject({
      providerCode: "infermedica",
      localCareLevel: "urgent",
      externalCareLevel: "emergency",
      agreement: false,
    });
  });
});
