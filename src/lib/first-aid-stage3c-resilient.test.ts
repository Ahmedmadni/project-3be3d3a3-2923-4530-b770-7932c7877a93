import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const script = readFileSync(
  new URL("../../supabase/first_aid_stage3c_resilient_seed.sql", import.meta.url),
  "utf8",
);

describe("resilient first-aid Stage 3C seeder", () => {
  it("isolates all twelve topic packs", () => {
    expect(script.match(/DO \$seed\$/g)).toHaveLength(12);
    expect(script.match(/INSERT INTO public\.first_aid_sections/g)).toHaveLength(12);
    expect(script.match(/AS v\(section_type/g)).toHaveLength(12);
  });

  it("captures per-topic SQL errors instead of using one global transaction", () => {
    expect(script).toContain("WHEN OTHERS THEN");
    expect(script).toContain("SQLSTATE");
    expect(script).toContain("SQLERRM");
    expect(script).toContain("_first_aid_stage3c_results");
    expect(script).not.toContain("\nBEGIN;\n");
  });

  it("keeps all section packs draft-only and idempotent", () => {
    expect(script).toContain("'draft'::public.review_status");
    expect(script).toContain("NOT EXISTS");
    expect(script).not.toMatch(/UPDATE\s+public\.first_aid_topics/i);
  });

  it("reports persistent topic state after all attempts", () => {
    expect(script).toContain("COUNT(DISTINCT s.id) AS sections");
    expect(script).toContain("COUNT(DISTINCT s.section_type) AS section_types");
    expect(script).toContain("sections_all_draft");
    expect(script).toContain("published_sections");
  });
});
