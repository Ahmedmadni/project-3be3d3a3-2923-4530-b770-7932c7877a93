import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/20261003123000_first_aid_foundation_repair.sql",
    import.meta.url,
  ),
  "utf8",
);

const generatedTypes = readFileSync(
  new URL("../integrations/supabase/types.ts", import.meta.url),
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

describe("first-aid foundation repair", () => {
  it("repairs all missing first-aid section governance columns", () => {
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

  it("keeps first-aid sections in content version governance beside measurement entities", () => {
    for (const entityType of [
      "first_aid_sections",
      "measurement_types",
      "measurement_reference_rules",
      "measurement_red_flags",
      "measurement_knowledge_articles",
    ]) {
      expect(migration).toContain(`'${entityType}'`);
    }
  });

  it("restores source-backed content for all twelve topics", () => {
    for (const code of topicCodes) {
      expect(migration).toContain(`t.code = '${code}'`);
    }

    expect(migration.match(/AS v\(section_type/g)?.length).toBe(12);
  });

  it("uses all five governed section types throughout the repair", () => {
    for (const sectionType of [
      "what_is_happening",
      "when_to_call",
      "do_now",
      "dont_do",
      "while_waiting",
    ]) {
      const count = migration.split(`'${sectionType}'`).length - 1;
      expect(count).toBeGreaterThanOrEqual(12);
    }
  });

  it("does not publish or change first-aid topic activation", () => {
    expect(migration).not.toMatch(
      /UPDATE\s+public\.first_aid_topics/i,
    );
    expect(migration).not.toMatch(
      /INSERT\s+INTO\s+public\.first_aid_sections[\s\S]{0,500}?'published'::public\.review_status/i,
    );
    expect(migration).not.toMatch(
      /is_active\s*=\s*(true|false)/i,
    );
  });

  it("reinstates first-aid section governance triggers and policies", () => {
    for (const marker of [
      "CREATE TRIGGER gov_guard",
      "CREATE TRIGGER gov_created_by",
      "CREATE TRIGGER gov_audit",
      "CREATE TRIGGER first_aid_section_publish_snapshot",
      'CREATE POLICY "public read"',
      'CREATE POLICY "staff insert"',
      'CREATE POLICY "staff update"',
      'CREATE POLICY "admin delete"',
    ]) {
      expect(migration).toContain(marker);
    }
  });

  it("keeps repair transactional and safe to re-run", () => {
    expect(migration.trimStart().startsWith("-- First-aid foundation repair.")).toBe(true);
    expect(migration).toContain("BEGIN;");
    expect(migration.trimEnd().endsWith("COMMIT;")).toBe(true);
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS");
    expect(migration).toContain("WHERE NOT EXISTS");
    expect(migration).toContain("ON CONFLICT DO NOTHING");
  });

  it("aligns generated first-aid section types with the real schema", () => {
    const start = generatedTypes.indexOf("      first_aid_sections: {");
    const end = generatedTypes.indexOf("      first_aid_sources: {", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);

    const block = generatedTypes.slice(start, end);

    for (const sectionType of [
      "what_is_happening",
      "when_to_call",
      "do_now",
      "dont_do",
      "while_waiting",
    ]) {
      expect(block).toContain(`"${sectionType}"`);
    }

    for (const column of [
      "version:",
      "change_reason:",
      "translation_status:",
      "submitted_at:",
    ]) {
      expect(block).toContain(column);
    }

    expect(block).not.toContain('"overview"');
    expect(block).not.toContain('"how_to_measure"');
  });
});
