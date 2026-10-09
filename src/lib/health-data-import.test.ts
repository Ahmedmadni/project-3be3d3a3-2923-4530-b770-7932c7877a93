import { describe, expect, it } from "vitest";
import {
  buildImportQaSummary,
  buildMeasurementImportPlan,
  detectCsvDelimiter,
  inferImportMapping,
  parseCsv,
  parseStrictImportDate,
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

  it("rejects ambiguous slash dates while accepting explicit ISO-like dates", () => {
    expect(parseStrictImportDate("10/09/2026")).toBeNull();
    expect(parseStrictImportDate("2026-10-09")).toMatch(/^2026-10-09T/);
    expect(parseStrictImportDate("2026-10-09 14:30")).toMatch(
      /^2026-10-09T/,
    );
    expect(parseStrictImportDate("2026-10-09T14:30:00+03:00")).toBe(
      "2026-10-09T11:30:00.000Z",
    );
  });

  it("builds only safe scalar import payloads and skips duplicates", () => {
    const plan = buildMeasurementImportPlan(
      [
        ["2026-10-09 09:00", "pulse", "80", "bpm", "ok"],
        ["2026-10-09 10:00", "pulse", "abc", "bpm", "bad"],
        ["2026-10-09 09:00", "pulse", "80", "bpm", "ok"],
      ],
      {
        measuredAt: 0,
        measurementType: 1,
        value: 2,
        unit: 3,
        notes: 4,
      },
      [
        {
          id: "pulse-id",
          code: "pulse",
          name_ar: "النبض",
          name_en: "Pulse",
          value_kind: "scalar",
          canonical_unit: "bpm",
          allowed_units: ["bpm"],
        },
      ],
    );

    expect(plan.rows).toHaveLength(1);
    expect(plan.rows[0]).toMatchObject({
      row_number: 2,
      measurement_type_id: "pulse-id",
      scalar_value: 80,
      unit: "bpm",
      components: null,
      notes: "ok",
    });
    expect(plan.skipped).toEqual([
      { rowNumber: 3, reasons: ["value_invalid"] },
      { rowNumber: 4, reasons: ["duplicate_row"] },
    ]);
  });

  it("builds blood-pressure components without clinical interpretation", () => {
    const plan = buildMeasurementImportPlan(
      [["2026-10-09", "blood_pressure", "120", "80", "mmHg"]],
      {
        measuredAt: 0,
        measurementType: 1,
        systolic: 2,
        diastolic: 3,
        unit: 4,
      },
      [
        {
          id: "bp-id",
          code: "blood_pressure",
          name_ar: "ضغط الدم",
          name_en: "Blood pressure",
          value_kind: "compound",
          canonical_unit: "mmHg",
          allowed_units: ["mmHg"],
        },
      ],
    );

    expect(plan.rows[0]).toMatchObject({
      measurement_type_id: "bp-id",
      scalar_value: null,
      components: { systolic: 120, diastolic: 80 },
      unit: "mmHg",
    });
  });

  it("rejects unsupported units instead of converting them automatically", () => {
    const plan = buildMeasurementImportPlan(
      [["2026-10-09", "pulse", "80", "hz"]],
      {
        measuredAt: 0,
        measurementType: 1,
        value: 2,
        unit: 3,
      },
      [
        {
          id: "pulse-id",
          code: "pulse",
          name_ar: "النبض",
          name_en: "Pulse",
          value_kind: "scalar",
          canonical_unit: "bpm",
          allowed_units: ["bpm"],
        },
      ],
    );

    expect(plan.rows).toHaveLength(0);
    expect(plan.skipped[0]?.reasons).toContain("unit_not_supported");
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
