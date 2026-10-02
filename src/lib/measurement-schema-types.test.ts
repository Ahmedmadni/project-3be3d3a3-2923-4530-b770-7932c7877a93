import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const generatedTypes = readFileSync(
  new URL("../integrations/supabase/types.ts", import.meta.url),
  "utf8",
);
const measurementsDb = readFileSync(
  new URL("./measurements-db.ts", import.meta.url),
  "utf8",
);
const adminRoute = readFileSync(
  new URL("../routes/admin.measurements.tsx", import.meta.url),
  "utf8",
);

describe("measurement Supabase schema typing", () => {
  it("includes every deployed measurement table in Database", () => {
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
      expect(generatedTypes).toContain(`      ${table}: {`);
    }
  });

  it("includes submitted_at on every governed measurement entity", () => {
    for (const table of [
      "measurement_types",
      "measurement_reference_rules",
      "measurement_red_flags",
      "measurement_knowledge_articles",
    ]) {
      const start = generatedTypes.indexOf(`      ${table}: {`);
      expect(start).toBeGreaterThanOrEqual(0);
      const next = generatedTypes.indexOf("\n      ", start + 8);
      const block =
        next > start
          ? generatedTypes.slice(start, next)
          : generatedTypes.slice(start);
      expect(block).toContain("submitted_at:");
    }
  });

  it("uses the normal typed Supabase client for measurement access", () => {
    expect(measurementsDb).toContain("export const measurementsDb = supabase");
    expect(measurementsDb).not.toContain("as unknown as SupabaseClient");
    expect(adminRoute).not.toContain('from("measurement_types" as never)');
    expect(adminRoute).not.toContain("from(table as never)");
    expect(adminRoute).not.toContain("as unknown as TypeRow[]");
  });
});
