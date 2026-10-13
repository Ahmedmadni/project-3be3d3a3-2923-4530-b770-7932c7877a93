import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = readFileSync(
  new URL("../routes/data-import.tsx", import.meta.url),
  "utf8",
);

const professional = readFileSync(
  new URL("../routes/professional.tsx", import.meta.url),
  "utf8",
);

describe("professional health data import surface", () => {
  it("keeps the raw file local and never uploads it", () => {
    expect(route).toContain("file.text()");
    expect(route).toContain("file.arrayBuffer()");
    expect(route).toContain("الملف نفسه يبقى في جهازك");
    expect(route).not.toContain(".storage.");
    expect(route).not.toContain(".upload(");
  });

  it("uses the atomic import RPC rather than direct measurement inserts", () => {
    expect(route).toContain('"import_measurement_reading_batch_v2"');
    expect(route).toContain("buildMeasurementImportPlan");
    expect(route).not.toContain('.from("measurement_readings").insert');
    expect(route).not.toContain('.from("measurement_readings")\n        .insert');
  });

  it("requires explicit confirmation before save", () => {
    expect(route).toContain("importConfirmed");
    expect(route).toContain("راجعت تعيين الأعمدة والمعاينة");
    expect(route).toContain("checked={confirmed}");
    expect(route).toContain("setConfirmed(event.target.checked)");
    expect(route).toContain("!confirmed ||");
  });

  it("hashes the local file and records batch provenance metadata", () => {
    expect(route).toContain('digest(\n    "SHA-256"');
    expect(route).toContain("p_file_sha256");
    expect(route).toContain("p_source_row_count");
    expect(route).toContain("p_mapping");
    expect(route).toContain("p_qa_summary");
  });

  it("exports QA metadata without raw row values", () => {
    expect(route).toContain("privacy_note");
    expect(route).toContain(
      "Raw row values are not included in this QA report.",
    );
    expect(route).toContain("URL.createObjectURL");
  });

  it("is reachable from professional mode", () => {
    expect(professional).toContain('to: "/data-import"');
    expect(professional).toContain('"professional.tool.import.title"');
  });

  it("explains when all measurement types are unpublished or unavailable", () => {
    expect(route).toContain("review_status,is_active,is_demo");
    expect(route).toContain("measurementTypesQuery.data?.length === 0");
    expect(route).toContain("لا تتوفر لهذا الحساب أنواع قياسات منشورة ومفعلة");
    expect(route).toContain("يمكن فحص الملف محليًا");
  });

  it("flags draft measurement types as professional preview only", () => {
    expect(route).toContain("previewOnlyTypeCount > 0");
    expect(route).toContain("type.review_status !== \"published\"");
    expect(route).toContain("type.is_active !== true");
    expect(route).toContain("معاينة مهنية فقط");
    expect(route).toContain("بيانات وهمية وحساب اختبار مخوّل");
  });

  it("retains the non-diagnostic safety framing", () => {
    expect(route).toContain("لا تعتبر الملف دليلًا سريريًا");
    expect(route).toContain("لا تستنتج تشخيصًا أو علاجًا");
    expect(route).toContain("<MedicalDisclaimer");
  });
});
