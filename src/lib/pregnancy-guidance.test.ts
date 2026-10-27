import { describe, expect, it } from "vitest";
import { pregnancyGuidance } from "@/data/pregnancy-guidance";
import { guidanceForStage } from "./pregnancy-guidance";

describe("pregnancy care guidance", () => {
  it("retains throughout-pregnancy food and action precautions in all three stages", () => {
    for (const stage of [0, 1, 2]) {
      const ids = guidanceForStage(pregnancyGuidance, stage).map((i) => i.id);
      expect(ids).toContain("raw-food");
      expect(ids).toContain("alcohol");
      expect(ids).toContain("smoking");
      expect(ids).toContain("medicines-herbs");
    }
  });
  it("shows distinct care across the first and subsequent trimesters", () => {
    expect(guidanceForStage(pregnancyGuidance, 0).map((i) => i.id)).toContain("early-care");
    expect(guidanceForStage(pregnancyGuidance, 1).map((i) => i.id)).not.toContain("early-care");
    expect(guidanceForStage(pregnancyGuidance, 1).map((i) => i.id)).toContain("mid-care");
    expect(guidanceForStage(pregnancyGuidance, 2).map((i) => i.id)).toContain("late-movements");
  });
  it("keeps caffeine's sourced daily total at 200 mg in every stage", () => {
    for (const stage of [0, 1, 2]) expect(guidanceForStage(pregnancyGuidance, stage).find((i) => i.id === "caffeine")?.numericLimit).toEqual({ value: 200, unit: "mg/day" });
  });
  it("applies side-sleep advice from week 28 rather than forbidding all back positions", () => {
    const item = pregnancyGuidance.find((i) => i.id === "side-sleep");
    expect(item?.fromWeek).toBe(28);
    expect(item?.status).toBe("recommended");
    expect(guidanceForStage(pregnancyGuidance, 0).map((i) => i.id)).not.toContain("side-sleep");
    expect(guidanceForStage(pregnancyGuidance, 2).map((i) => i.id)).toContain("side-sleep");
  });
  it("filters foods without losing stage-independent precautions", () => {
    const list = guidanceForStage(pregnancyGuidance, 2, "food");
    expect(list.every((i) => i.category === "food")).toBe(true);
    expect(list.map((i) => i.id)).toContain("unpasteurized");
    expect(list.map((i) => i.id)).not.toContain("side-sleep");
  });
});