import { describe, expect, it } from "vitest";
import { DisabledExternalClinicalEngine } from "./external-clinical-engine";

describe("external clinical engine", () => {
  it("is disabled by default and cannot influence the local safety pipeline", async () => {
    const engine = new DisabledExternalClinicalEngine();

    expect(engine.mode).toBe("disabled");
    expect(await engine.compare()).toBeNull();
  });
});
