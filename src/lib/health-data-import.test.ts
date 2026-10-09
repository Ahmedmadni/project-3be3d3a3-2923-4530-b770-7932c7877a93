import { describe, expect, it } from "vitest";
import {
  buildImportQaSummary,
  detectCsvDelimiter,
  inferImportMapping,
  parseCsv,
  setImportMappingRole,
  summarizeMeasurementTypeMatches,
} from "./health-data-import";

describe("health data import QA", () => {
  it("detects common CSV delimiters", () => {
    expect(detectCsvDelimiter("date,type,value\n2026-10-01,pulse,80")).toBe(",");
    expect(detectCsvDelimiter("date;type;value\n2026-10-01;pulse;80")).toBe(";");
    expect(detectCsvDelimiter("date\ttype\tvalue\n2026-10-01\tpulse\t80")).toBe("\t");
  });

  it("parses quoted delimiters and escaped quotes", () => {
    const parsed = parseCsv(
      'date,type,notes\n2026-10-01,pulse,"felt, fine"\n2026-10-02,pulse,"said ""ok"""',
    );

    expect(parsed.rows[0]).toEqual([
      "2026-10-01",
      "pulse",
      "felt, fine",
    ]);
    expect(parsed.rows[1]?.[2]).toBe('said "ok"');
  });

  it("infers Arabic and English measurement columns", () => {
    expect(
      inferImportMapping([
        "تاريخ القياس",
        "نوع القياس",
        "القيمة",
        "الوحدة",
        "ملاحظات",
      ]),
    ).toEqual({
      measuredAt: 0,
      measurementType: 1,
      value: 2,
      unit: 3,
      notes: 4,
    });
  });

  it("finds duplicates and invalid mapped values without writing data", () => {
    const rows = [
      ["2026-10-01", "pulse", "80"],
      ["not-a-date", "pulse", "abc"],
      ["2026-10-01", "pulse", "80"],
    ];

    const summary = buildImportQaSummary(rows, {
      measuredAt: 0,
      measurementType: 1,
      value: 2,
    });

    expect(summary.duplicateRows).toBe(1);
    expect(summary.rowsWithIssues).toBe(1);
    expect(summary.validRows).toBe(2);
    expect(summary.issues.map((issue) => issue.kind)).toEqual([
      "invalid_date",
      "invalid_value",
    ]);
  });

  it("keeps only one role assignment per mapped column", () => {
    const first = setImportMappingRole({}, 2, "value");
    const next = setImportMappingRole(first, 2, "unit");

    expect(next.value).toBeUndefined();
    expect(next.unit).toBe(2);
  });

  it("matches imported measurement type values against the app catalog", () => {
    const summary = summarizeMeasurementTypeMatches(
      [
        ["pulse", "80"],
        ["النبض", "82"],
        ["mystery metric", "1"],
      ],
      { measurementType: 0, value: 1 },
      [
        {
          code: "pulse",
          name_ar: "النبض",
          name_en: "Pulse",
        },
      ],
    );

    expect(summary.recognizedValues).toEqual(["pulse", "النبض"]);
    expect(summary.unrecognizedValues).toEqual(["mystery metric"]);
  });
});
