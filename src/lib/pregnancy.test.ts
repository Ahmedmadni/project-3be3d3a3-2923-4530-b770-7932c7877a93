import { describe, expect, it } from "vitest";
import { pregnancyProgress, validPregnancyDates } from "./pregnancy";

describe("pregnancy dating", () => {
  it("starts at day zero on the first day of the last period", () => {
    expect(pregnancyProgress("2026-10-26", null, "2026-10-26")).toMatchObject({ weeks: 0, days: 0, elapsed: 0, due: "2027-08-02" });
  });
  it("uses 280 days and completed weeks rather than conception dating", () => {
    expect(pregnancyProgress("2026-01-01", null, "2026-01-11")).toMatchObject({ weeks: 1, days: 3, due: "2026-10-08" });
  });
  it("gives clinician dating precedence", () => {
    expect(pregnancyProgress("2026-01-01", "2026-10-15", "2026-01-11")).toMatchObject({ weeks: 0, days: 3, due: "2026-10-15" });
  });
  it("changes trimester at completed weeks 14 and 28", () => {
    expect(pregnancyProgress("2026-01-01", null, "2026-04-08").trimester).toBe(0);
    expect(pregnancyProgress("2026-01-01", null, "2026-04-09").trimester).toBe(1);
    expect(pregnancyProgress("2026-01-01", null, "2026-07-16").trimester).toBe(2);
  });
  it("rejects future and malformed last periods", () => {
    expect(validPregnancyDates("2026-10-27", "", "2026-10-26")).toBe(false);
    expect(validPregnancyDates("2026-02-30", "", "2026-10-26")).toBe(false);
    expect(validPregnancyDates("2026-10-26", "", "2026-10-26")).toBe(true);
  });
  it("identifies due date reached without implying a diagnosis", () => {
    expect(pregnancyProgress("2026-01-01", null, "2026-10-08").remaining).toBe(0);
  });
});