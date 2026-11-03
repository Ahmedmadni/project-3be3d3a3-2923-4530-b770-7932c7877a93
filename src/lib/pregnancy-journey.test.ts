import { describe, expect, it } from "vitest";
import { pregnancyWeeks, pregnancyWarningSigns, pregnancyVisits } from "@/data/pregnancy-journey";
import { warningsForStage, visitsForStage } from "./pregnancy-weeks";

describe("pregnancy journey safety", () => {
  it("covers every week from 1 to 40 without gaps", () => {
    expect(pregnancyWeeks.map((item) => item.week)).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
    expect(pregnancyWeeks.every((item) => item.sources.length > 0)).toBe(true);
  });
  it("never hides reduced-movement immediate contact when stages change", () => {
    for (const stage of [0, 1, 2]) expect(warningsForStage(pregnancyWarningSigns, stage).find((item) => item.id === "movement-change")?.severity).toBe("immediate");
  });
  it("orders ambulance warnings before immediate and same-day contact", () => {
    const signs = warningsForStage(pregnancyWarningSigns, 0);
    expect(signs[0].severity).toBe("emergency");
    expect(signs.at(-1)?.severity).toBe("same_day");
  });
  it("preserves the sourced NHS scan windows", () => {
    expect(pregnancyVisits.find((item) => item.id === "dating-scan")?.weeks).toEqual([11, 14]);
    expect(visitsForStage(pregnancyVisits, 1).find((item) => item.id === "anatomy")?.weeks).toEqual([18, 21]);
  });
});