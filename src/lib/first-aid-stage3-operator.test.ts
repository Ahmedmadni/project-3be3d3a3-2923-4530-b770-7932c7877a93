import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const script = readFileSync(
  new URL("../../supabase/first_aid_stage3_seed.sql", import.meta.url),
  "utf8",
);

describe("first-aid stage 3 operator script", () => {
  it("contains only the seeding stage", () => {
    expect(script).toContain("STAGE 3:");
    expect(script).not.toContain("STAGE 1:");
    expect(script).not.toContain("STAGE 2:");
    expect(script).not.toContain("ALTER TABLE public.first_aid_sections");
  });

  it("contains all 12 first-aid topic packs", () => {
    for (const code of [
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
    ]) {
      expect(script).toContain(`t.code = '${code}'`);
    }
    expect(script.match(/AS v\(section_type/g)).toHaveLength(12);
  });

  it("keeps section inserts in draft state and is idempotent", () => {
    expect(script).toContain("'draft'::public.review_status");
    expect(script).toContain("WHERE NOT EXISTS");
    expect(script).toContain("ON CONFLICT DO NOTHING");
    expect(script).not.toMatch(/UPDATE\s+public\.first_aid_topics/i);
  });

  it("wraps the seed stage in one transaction", () => {
    expect(script.match(/\bBEGIN;/g)).toHaveLength(1);
    expect(script.match(/\bCOMMIT;/g)).toHaveLength(1);
  });
});
