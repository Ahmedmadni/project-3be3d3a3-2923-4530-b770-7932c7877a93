import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = readFileSync(
  new URL("../routes/data-import.tsx", import.meta.url),
  "utf8",
);

describe("measurement import history UI", () => {
  it("loads user batch history and exact-hash duplicate state", () => {
    expect(route).toContain('.from("measurement_import_batches")');
    expect(route).toContain('"measurement-import-history"');
    expect(route).toContain('"measurement-import-duplicate"');
    expect(route).toContain('.eq("file_sha256", fileSha256)');
    expect(route).toContain('.eq("status", "imported")');
  });

  it("prevents save when the exact file is already active", () => {
    expect(route).toContain("Boolean(duplicateBatch)");
    expect(route).toContain("هذا الملف مستورد بالفعل");
    expect(route).toContain("تراجع عن الـBatch السابقة أولًا");
  });

  it("requires explicit confirmation before a batch revert", () => {
    expect(route).toContain("window.confirm(");
    expect(route).toContain('"revert_measurement_import_batch"');
    expect(route).toContain("التراجع عن هذه العملية");
  });

  it("explains that provenance survives a revert", () => {
    expect(route).toContain(
      "يُحتفظ بسجل الـBatch حتى بعد التراجع",
    );
    expect(route).toContain("batch.reverted_count");
    expect(route).toContain("batch.reverted_at");
  });
});
