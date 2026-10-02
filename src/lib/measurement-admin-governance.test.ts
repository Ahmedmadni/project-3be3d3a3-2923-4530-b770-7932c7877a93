import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const knowledgeMigration = readFileSync(
  new URL("../../supabase/migrations/20261002034500_measurement_knowledge_base.sql", import.meta.url),
  "utf8",
);
const workflowMigration = readFileSync(
  new URL("../../supabase/migrations/20261002130000_measurement_governance_admin.sql", import.meta.url),
  "utf8",
);

describe("measurement admin governance migrations", () => {
  it("keeps the knowledge-section immutability guard syntactically consistent", () => {
    expect(knowledgeMigration).toContain("target_article_id uuid;");
    expect(knowledgeMigration).not.toContain("target_v_article_id");
    expect(knowledgeMigration).toContain("WHERE a.id = target_article_id");
    expect(knowledgeMigration).toContain("END\n$$;");
  });

  it("attaches workflow, role and audit guards to governed measurement entities", () => {
    expect(workflowMigration).toContain("measurement_governed_write_guard");
    expect(workflowMigration).toContain("public.governance_guard()");
    expect(workflowMigration).toContain("public.governance_audit()");
    expect(workflowMigration).toContain("snapshot_measurement_on_publish");
  });

  it("restricts activation to admins at the database layer", () => {
    expect(workflowMigration).toContain(
      "MEASUREMENT_ADMIN_REQUIRED: only admins may activate or deactivate measurement content",
    );
  });

  it("requires a review note when changes are requested", () => {
    expect(workflowMigration).toContain(
      "REVIEW_NOTE_REQUIRED: explain requested changes",
    );
  });
});
