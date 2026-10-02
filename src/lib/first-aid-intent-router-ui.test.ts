import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = readFileSync(
  new URL("../routes/first-aid.index.tsx", import.meta.url),
  "utf8",
);

describe("first-aid governed intent-routing UI", () => {
  it("routes natural-language input to existing governed topics", () => {
    expect(route).toContain("classifyFirstAidIntent");
    expect(route).toContain('to="/first-aid/$slug"');
    expect(route).toContain("اقتراحات من وصفك");
  });

  it("states that intent matching is not diagnosis", () => {
    expect(route).toContain("ليست تشخيصًا أو قرارًا طبيًا");
  });

  it("does not embed a free-form medical LLM answer path", () => {
    expect(route.toLowerCase()).not.toContain("openrouter");
    expect(route.toLowerCase()).not.toContain("deepseek");
    expect(route.toLowerCase()).not.toContain("generated_text");
    expect(route).not.toContain("/api/chat");
  });
});
