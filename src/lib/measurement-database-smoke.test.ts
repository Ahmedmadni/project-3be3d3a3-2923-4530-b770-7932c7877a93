import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const smokeSql = readFileSync(
  new URL("../../supabase/measurement_smoke.sql", import.meta.url),
  "utf8",
);

describe("measurement database smoke SQL", () => {
  it("covers every measurement table", () => {
    for (const table of [
      "measurement_types",
      "measurement_sources",
      "measurement_reference_rules",
      "measurement_red_flags",
      "measurement_readings",
      "measurement_knowledge_articles",
      "measurement_knowledge_sections",
      "measurement_knowledge_sources",
    ]) {
      expect(smokeSql).toContain(table);
    }
  });

  it("checks governance columns, functions and trigger set", () => {
    expect(smokeSql).toContain("submitted_at");

    for (const fn of [
      "guard_measurement_clinical_activation",
      "guard_measurement_knowledge_activation",
      "guard_published_measurement_knowledge_sections",
      "measurement_governed_write_guard",
      "snapshot_measurement_on_publish",
    ]) {
      expect(smokeSql).toContain(fn);
    }

    for (const trigger of [
      "aa_measurement_role_guard",
      "gov_guard",
      "gov_created_by",
      "gov_audit",
      "measurement_publish_snapshot",
    ]) {
      expect(smokeSql).toContain(trigger);
    }
  });

  it("is read-only and safe when a measurement relation is absent", () => {
    expect(smokeSql).toContain("to_regclass('public.' || table_name)");
    expect(smokeSql).not.toContain("::regclass");
    expect(smokeSql).not.toMatch(/\bINSERT\b/i);
    expect(smokeSql).not.toMatch(/\bUPDATE\b/i);
    expect(smokeSql).not.toMatch(/\bDELETE\b/i);
    expect(smokeSql).not.toMatch(/\bALTER\b/i);
    expect(smokeSql).not.toMatch(/\bCREATE\b/i);
    expect(smokeSql).not.toMatch(/\bDROP\b/i);
  });
});
