import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/20261003143000_first_aid_foundation_repair_v2.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("first-aid foundation repair V2", () => {
  it("commits schema, governance, and seed stages independently", () => {
    expect(migration.match(/\bBEGIN;/g)).toHaveLength(3);
    expect(migration.match(/\bCOMMIT;/g)).toHaveLength(3);
    expect(migration).toContain("STAGE 1: schema repair");
    expect(migration).toContain("STAGE 2: governance");
    expect(migration).toContain("STAGE 3: authoritative sources");
  });

  it("does not depend on the missing content_visible function", () => {
    expect(migration).not.toContain("content_visible(");
    expect(migration).toContain("review_status::text = 'published'");
    expect(migration).toContain("public.is_staff(auth.uid())");
  });

  it("preserves current content-version entity types while adding first-aid sections", () => {
    expect(migration).toContain("allowed_types text[]");
    expect(migration).toContain("SELECT entity_type");
    expect(migration).toContain("FROM public.content_versions");
    expect(migration).toContain("'first_aid_sections'");
    expect(migration).toContain("allowed_types::text");
  });

  it("adds the twelve missing governance columns before later stages", () => {
    for (const column of [
      "version",
      "created_by",
      "submitted_at",
      "reviewed_by",
      "reviewed_at",
      "approved_by",
      "approved_at",
      "published_by",
      "published_at",
      "review_note",
      "change_reason",
      "translation_status",
    ]) {
      expect(migration).toContain(`ADD COLUMN IF NOT EXISTS ${column}`);
    }
  });

  it("keeps all first-aid seed sections as draft and does not change topic activation", () => {
    expect(migration).toContain("'draft'::public.review_status");
    expect(migration).not.toMatch(/UPDATE\s+public\.first_aid_topics/i);
    expect(migration).not.toMatch(/is_active\s*=\s*(true|false)/i);
  });

  it("contains all twelve governed first-aid topic packs", () => {
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
      expect(migration).toContain(`t.code = '${code}'`);
    }

    expect(migration.match(/AS v\(section_type/g)).toHaveLength(12);
  });
});
