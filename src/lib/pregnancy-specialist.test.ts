import { describe, expect, it } from "vitest";
import { pregnancySpecialistTopics, pregnancySpecialistSources } from "@/data/pregnancy-specialist";
import { pregnancyGuidance, pregnancyGuidanceSources } from "@/data/pregnancy-guidance";
import { pregnancyVisits } from "@/data/pregnancy-journey";
import { guidanceForStage } from "./pregnancy-guidance";

describe("specialist pregnancy education", () => {
  it("includes all six specialist topics without duplicate identities", () => {
    const ids = pregnancySpecialistTopics.map((topic) => topic.id);
    expect(ids).toEqual(["diabetes", "hypertension", "rh-negative", "anaemia", "multiple-pregnancy", "chronic-treatment"]);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("resolves every specialist reference to an authoritative HTTPS source", () => {
    for (const topic of pregnancySpecialistTopics) {
      expect(topic.sources.length).toBeGreaterThan(0);
      for (const id of topic.sources) expect(pregnancySpecialistSources[id]?.url).toMatch(/^https:\/\/www\.(nhs\.uk|cdc\.gov)\//);
    }
  });
  it("keeps chronic medicine and vaccination review available in every stage", () => {
    for (const stage of [0, 1, 2]) {
      const ids = guidanceForStage(pregnancyGuidance, stage).map((item) => item.id);
      expect(ids).toContain("vaccination-review");
      expect(ids).toContain("medicines-herbs");
      expect(ids).toContain("nausea-treatment");
    }
  });
  it("resolves every expanded guidance source", () => {
    for (const item of pregnancyGuidance) for (const id of item.sources) expect(pregnancyGuidanceSources[id]?.url).toMatch(/^https:\/\//);
  });
  it("retains the gestational diabetes testing window across the trimester boundary", () => {
    const diabetes = pregnancyVisits.find((visit) => visit.id === "diabetes");
    expect(diabetes?.weeks).toEqual([24, 28]);
    expect(diabetes?.trimesters).toEqual([1, 2]);
  });
});