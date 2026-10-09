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

describe("professional health data import QA surface", () => {
  it("reads the selected file locally without uploading raw data", () => {
    expect(route).toContain("await file.text()");
    expect(route).toContain("الملف يبقى في جهازك");
    expect(route).not.toContain(".storage.");
    expect(route).not.toContain(".upload(");
    expect(route).not.toContain(".insert(");
    expect(route).not.toContain(".upsert(");
  });

  it("stops at QA and preview rather than saving measurements", () => {
    expect(route).toContain("لا يوجد استيراد تلقائي بعد");
    expect(route).toContain("buildImportQaSummary");
    expect(route).toContain("inferImportMapping");
    expect(route).toContain("summarizeMeasurementTypeMatches");
    expect(route).not.toContain('.from("measurement_readings")');
  });

  it("exports only the QA report and explicitly omits raw row values", () => {
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

  it("retains the non-diagnostic professional safety framing", () => {
    expect(route).toContain("لا تستنتج تشخيصًا أو علاجًا");
    expect(route).toContain("<MedicalDisclaimer");
  });
});
