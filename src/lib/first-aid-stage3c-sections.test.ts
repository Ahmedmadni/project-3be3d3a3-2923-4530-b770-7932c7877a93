import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const script = readFileSync(
  new URL("../../supabase/first_aid_stage3c_sections.sql", import.meta.url),
  "utf8",
);

const topicCodes = [
  "bleeding",
  "burns",
  "choking",
  "seizures",
  "fainting",
  "head_injury",
  "fractures",
  "poisoning",
  "anaphylaxis",
  "chest_pain",
  "breathing",
  "eye_injury",
];

describe("standalone first-aid Stage 3C section seed", () => {
  it("contains exactly twelve first-aid section packs", () => {
    expect(script.match(/INSERT INTO public\.first_aid_sections/g)).toHaveLength(12);
    expect(script.match(/AS v\(section_type/g)).toHaveLength(12);

    for (const code of topicCodes) {
      expect(script).toContain(`WHERE t.code = '${code}'`);
    }
  });

  it("contains all five governed section types for every topic", () => {
    for (const sectionType of [
      "what_is_happening",
      "when_to_call",
      "do_now",
      "dont_do",
      "while_waiting",
    ]) {
      expect(script.split(`'${sectionType}'`).length - 1).toBeGreaterThanOrEqual(12);
    }
  });

  it("keeps inserted sections draft-only and idempotent", () => {
    expect(script).toContain("'draft'::public.review_status");
    expect(script).toContain("NOT EXISTS");
    expect(script).not.toMatch(/UPDATE\s+public\.first_aid_topics/i);
    expect(script).not.toMatch(/INSERT\s+INTO\s+public\.medical_sources/i);
    expect(script).not.toMatch(/INSERT\s+INTO\s+public\.first_aid_sources/i);
  });

  it("runs as one isolated transaction", () => {
    expect(script.match(/\bBEGIN;/g)).toHaveLength(1);
    expect(script.match(/\bCOMMIT;/g)).toHaveLength(1);
  });
});
