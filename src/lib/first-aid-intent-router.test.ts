import { describe, expect, it } from "vitest";
import {
  classifyFirstAidIntent,
  matchesFirstAidIntent,
} from "./first-aid-intent-router";

describe("first-aid intent router", () => {
  it("routes colloquial Arabic choking descriptions", () => {
    const matches = classifyFirstAidIntent(
      "الولد شرق ومش قادر يتكلم",
    );

    expect(matches[0]?.code).toBe("choking");
  });

  it("routes chemical eye exposure without generating clinical advice", () => {
    const matches = classifyFirstAidIntent(
      "مادة كيميائية دخلت في العين",
    );

    expect(matches[0]?.code).toBe("eye_injury");
  });

  it("can return multiple relevant topics for ambiguous descriptions", () => {
    const matches = classifyFirstAidIntent(
      "عنده حساسية شديدة ومش قادر يتنفس",
      3,
    );

    expect(matches.map((item) => item.code)).toEqual(
      expect.arrayContaining(["anaphylaxis", "breathing"]),
    );
  });

  it("supports English descriptions as a fallback", () => {
    expect(
      classifyFirstAidIntent("possible broken bone after fall")[0]?.code,
    ).toBe("fractures");
  });

  it("returns no route for unrelated text", () => {
    expect(classifyFirstAidIntent("عايز اعرف مواعيد العيادة")).toEqual([]);
  });

  it("can test one existing topic code", () => {
    expect(matchesFirstAidIntent("وجع صدر شديد", "chest_pain")).toBe(true);
    expect(matchesFirstAidIntent("وجع صدر شديد", "burns")).toBe(false);
  });
});
