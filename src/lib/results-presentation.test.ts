import { describe, expect, it } from "vitest";
import { resultCarePresentation } from "./results-presentation";

describe("results care presentation", () => {
  it("keeps emergency as the only care level with an emergency route action", () => {
    expect(resultCarePresentation("emergency").href).toBe("/emergency");
    expect(resultCarePresentation("urgent").href).toBeUndefined();
    expect(resultCarePresentation("routine").href).toBeUndefined();
    expect(resultCarePresentation("self_care").href).toBeUndefined();
  });

  it("uses a distinct presentation tone for each care level", () => {
    expect(resultCarePresentation("emergency").tone).toBe("danger");
    expect(resultCarePresentation("urgent").tone).toBe("warning");
    expect(resultCarePresentation("routine").tone).toBe("primary");
    expect(resultCarePresentation("self_care").tone).toBe("success");
  });
});
