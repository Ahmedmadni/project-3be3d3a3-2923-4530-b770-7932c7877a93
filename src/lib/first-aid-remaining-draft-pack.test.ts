import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/20261002233500_first_aid_remaining_draft_pack.sql",
    import.meta.url,
  ),
  "utf8",
);

const remainingTopics = [
  "fainting",
  "head_injury",
  "fractures",
  "poisoning",
  "anaphylaxis",
  "chest_pain",
  "breathing",
  "eye_injury",
];

describe("remaining first-aid draft pack", () => {
  it("covers all eight previously empty first-aid topics", () => {
    for (const code of remainingTopics) {
      expect(migration).toContain(`WHERE t.code = '${code}'`);
    }
  });

  it("keeps every inserted section in draft workflow", () => {
    expect(migration).toContain("'draft'::public.review_status");
    expect(migration).not.toMatch(
      /UPDATE\s+public\.first_aid_topics[\s\S]*review_status\s*=\s*'published'/i,
    );
    expect(migration).not.toMatch(
      /INSERT[\s\S]*'published'::public\.review_status/i,
    );
  });

  it("links each remaining topic to an authoritative non-GitHub source", () => {
    for (const code of remainingTopics) {
      expect(migration).toContain(`('${code}', 'https://`);
    }

    expect(migration).not.toMatch(
      /first_aid_sources[\s\S]*github\.com/i,
    );
  });

  it("uses the five governed section types for each topic", () => {
    for (const sectionType of [
      "what_is_happening",
      "when_to_call",
      "do_now",
      "dont_do",
      "while_waiting",
    ]) {
      expect(migration.split(`'${sectionType}'`).length - 1).toBeGreaterThanOrEqual(
        remainingTopics.length,
      );
    }
  });

  it("is idempotent for sources, links, and sections", () => {
    expect(migration).toContain("WHERE NOT EXISTS");
    expect(migration).toContain("ON CONFLICT DO NOTHING");
    expect(migration).toContain("x.section_type = v.section_type");
  });
});
