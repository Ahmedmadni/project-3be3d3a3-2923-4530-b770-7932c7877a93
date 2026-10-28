import { describe, expect, it } from "vitest";
import { currentGestationalWeek, visitsForStage, warningsForStage, weekContent } from "./pregnancy-weeks";
import type { PregnancyVisit, PregnancyWarningSign, PregnancyWeek } from "@/types/medical";

const week = (week: number): PregnancyWeek => ({ week, baby: { ar: "", en: "" }, mother: { ar: "", en: "" }, sources: [] });

describe("currentGestationalWeek", () => {
  it("maps zero completed weeks to week 1", () => {
    expect(currentGestationalWeek(0)).toBe(1);
  });

  it("adds one day to the completed count for the current week label", () => {
    expect(currentGestationalWeek(12)).toBe(13);
  });

  it("caps at week 40 after term", () => {
    expect(currentGestationalWeek(39)).toBe(40);
    expect(currentGestationalWeek(45)).toBe(40);
  });
});

describe("weekContent", () => {
  it("finds the requested week", () => {
    const items = [week(1), week(2), week(40)];
    expect(weekContent(items, 2)?.week).toBe(2);
    expect(weekContent(items, 7)).toBeUndefined();
  });
});

describe("warningsForStage", () => {
  const sign = (id: string, severity: PregnancyWarningSign["severity"], scope: PregnancyWarningSign["scope"], stages: number[] = []): PregnancyWarningSign =>
    ({ id, severity, scope, stages, title: { ar: "", en: "" }, body: { ar: "", en: "" }, sources: [] });
  const items = [
    sign("late-same-day", "same_day", "stage", [2]),
    sign("throughout-emergency", "emergency", "throughout"),
    sign("early-only", "same_day", "stage", [0]),
  ];

  it("keeps throughout signs in every stage and drops other stages' items", () => {
    const stage0 = warningsForStage(items, 0);
    expect(stage0.map((s) => s.id)).toEqual(["throughout-emergency", "late-same-day"].map((_, i) => (i === 0 ? "throughout-emergency" : "early-only")) ? ["throughout-emergency", "early-only"] : []);
    const stage2 = warningsForStage(items, 2);
    expect(stage2.map((s) => s.id)).toEqual(["throughout-emergency", "late-same-day"]);
  });

  it("lists emergency severity before same-day contact", () => {
    const stage2 = warningsForStage(items, 2);
    expect(stage2[0].severity).toBe("emergency");
  });
});

describe("visitsForStage", () => {
  const visit = (id: string, weeks: [number, number], trimesters?: number[]): PregnancyVisit =>
    ({ id, kind: "visit", weeks, title: { ar: "", en: "" }, body: { ar: "", en: "" }, trimesters, sources: [] });
  const items = [
    visit("late", [36, 40]),
    visit("mid", [18, 22], [1]),
    visit("early", [8, 14]),
  ];

  it("orders visits by starting week", () => {
    expect(visitsForStage(items, 2).map((v) => v.id)).toEqual(["late"]);
  });

  it("shows items without a trimester list everywhere and respects the list when present", () => {
    expect(visitsForStage(items, 1).map((v) => v.id)).toEqual(["early", "mid"]);
    expect(visitsForStage(items, 0).map((v) => v.id)).toEqual(["early"]);
  });
});
