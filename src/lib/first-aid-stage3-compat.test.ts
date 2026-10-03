import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const script = readFileSync(
  new URL("../../supabase/first_aid_stage3_compat_seed.sql", import.meta.url),
  "utf8",
);

describe("first-aid Stage 3 compatibility seed", () => {
  it("uses only baseline medical_sources columns in Stage 3A", () => {
    const stageA = script.slice(
      script.indexOf("STAGE 3A:"),
      script.indexOf("STAGE 3B:"),
    );

    expect(stageA).toContain("title");
    expect(stageA).toContain("organization");
    expect(stageA).toContain("url");
    expect(stageA).toContain("source_type");
    expect(stageA).toContain("is_active");

    for (const optionalColumn of [
      "language",
      "country",
      "organization_type",
      "last_verified_at",
      "notes",
      "evidence_level",
      "expires_review_at",
    ]) {
      expect(stageA).not.toContain(optionalColumn);
    }
  });

  it("commits sources, links, and sections independently", () => {
    expect(script.match(/\bBEGIN;/g)).toHaveLength(3);
    expect(script.match(/\bCOMMIT;/g)).toHaveLength(3);
    expect(script).toContain("STAGE 3A:");
    expect(script).toContain("STAGE 3B:");
    expect(script).toContain("STAGE 3C:");
  });

  it("contains 12 source mappings and 12 section packs", () => {
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
      expect(script).toContain(`'${code}'`);
    }

    expect(script.match(/AS v\(section_type/g)).toHaveLength(12);
  });

  it("keeps all inserted sections as draft and does not alter topics", () => {
    expect(script).toContain("'draft'::public.review_status");
    expect(script).not.toMatch(/UPDATE\s+public\.first_aid_topics/i);
  });
});
