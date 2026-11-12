import { describe, expect, it } from "vitest";
import { contractionSeconds, formatElapsed, intervalSincePrevious } from "./contraction-tracker";

describe("session-only contraction recorder", () => {
  it("shows duration, never a medical recommendation", () => {
    expect(contractionSeconds({ startedAt: 1000, endedAt: 76000 })).toBe(75);
    expect(formatElapsed(75)).toBe("1:15");
  });
  it("reports start-to-start intervals, not end-to-start", () => {
    const list = [
      { startedAt: 420000, endedAt: 462000 },
      { startedAt: 60000, endedAt: 120000 },
    ];
    expect(intervalSincePrevious(list, 0)).toBe(360);
    expect(intervalSincePrevious(list, 1)).toBeNull();
  });
  it("handles bad clocks and negative intervals conservatively", () => {
    expect(contractionSeconds({ startedAt: 5000, endedAt: 2000 })).toBe(0);
    expect(contractionSeconds({ startedAt: Number.NaN, endedAt: 1000 })).toBe(0);
    expect(formatElapsed(-12)).toBe("0:00");
    expect(intervalSincePrevious([{ startedAt: 1000, endedAt: 2000 }, { startedAt: 2000, endedAt: 3000 }], 0)).toBeNull();
  });
});
