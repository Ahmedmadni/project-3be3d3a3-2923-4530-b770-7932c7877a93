export type CsvDelimiter = "," | ";" | "\t";

export type ImportColumnRole =
  | "ignore"
  | "measured_at"
  | "measurement_type"
  | "value"
  | "unit"
  | "systolic"
  | "diastolic"
  | "notes";

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
  delimiter: CsvDelimiter;
  errors: string[];
}

export interface ImportMapping {
  measuredAt?: number;
  measurementType?: number;
  value?: number;
  unit?: number;
  systolic?: number;
  diastolic?: number;
  notes?: number;
}

export interface ImportQaIssue {
  rowNumber: number;
  kind:
    | "missing_type"
    | "invalid_date"
    | "invalid_value"
    | "invalid_systolic"
    | "invalid_diastolic";
  message: string;
}

export interface ImportQaSummary {
  totalRows: number;
  duplicateRows: number;
  emptyRows: number;
  missingCells: number;
  validRows: number;
  rowsWithIssues: number;
  issues: ImportQaIssue[];
}

const aliases: Record<Exclude<ImportColumnRole, "ignore">, string[]> = {
  measured_at: [
    "date",
    "datetime",
    "timestamp",
    "measuredat",
    "measureddate",
    "measurementdate",
    "time",
    "التاريخ",
    "تاريخ",
    "تاريخالقياس",
    "وقت",
    "الوقت",
  ],
  measurement_type: [
    "type",
    "measurementtype",
    "measurement",
    "code",
    "name",
    "نوع",
    "نوعالقياس",
    "القياس",
    "اسمالقياس",
  ],
  value: [
    "value",
    "reading",
    "result",
    "measurementvalue",
    "القيمة",
    "قراءه",
    "قراءة",
    "النتيجة",
  ],
  unit: ["unit", "units", "الوحدة", "وحدة"],
  systolic: [
    "systolic",
    "sys",
    "sbp",
    "انقباضي",
    "الانقباضي",
  ],
  diastolic: [
    "diastolic",
    "dia",
    "dbp",
    "انبساطي",
    "الانبساطي",
  ],
  notes: [
    "notes",
    "note",
    "comment",
    "comments",
    "ملاحظات",
    "ملاحظة",
    "تعليق",
  ],
};

export function normalizeImportHeader(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\s_\-./\\()[\]{}:]+/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .trim();
}

export function detectCsvDelimiter(text: string): CsvDelimiter {
  const firstLogicalLine = firstNonEmptyLogicalLine(text);
  const candidates: CsvDelimiter[] = [",", ";", "\t"];

  let best: CsvDelimiter = ",";
  let bestCount = -1;

  for (const candidate of candidates) {
    const count = countDelimiterOutsideQuotes(firstLogicalLine, candidate);
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }

  return best;
}

export function parseCsv(text: string): ParsedCsv {
  const cleaned = text.replace(/^\uFEFF/, "");
  const delimiter = detectCsvDelimiter(cleaned);
  const rows = parseDelimited(cleaned, delimiter);
  const errors: string[] = [];

  if (!rows.length) {
    return { headers: [], rows: [], delimiter, errors: ["EMPTY_FILE"] };
  }

  const headers = rows[0].map((value) => value.trim());
  const width = headers.length;

  if (width <= 1) {
    errors.push("SINGLE_COLUMN_FILE");
  }

  const dataRows = rows.slice(1).filter((row) => row.some((cell) => cell.trim()));

  dataRows.forEach((row, index) => {
    if (row.length !== width) {
      errors.push(
        `ROW_WIDTH_MISMATCH:${index + 2}:${row.length}:${width}`,
      );
    }
  });

  return { headers, rows: dataRows, delimiter, errors };
}

export function inferImportMapping(headers: readonly string[]): ImportMapping {
  const mapping: ImportMapping = {};

  headers.forEach((header, index) => {
    const normalized = normalizeImportHeader(header);

    for (const [role, values] of Object.entries(aliases) as Array<
      [Exclude<ImportColumnRole, "ignore">, string[]]
    >) {
      if (mappingRoleAlreadyAssigned(mapping, role)) continue;
      if (
        values.some(
          (alias) => normalizeImportHeader(alias) === normalized,
        )
      ) {
        assignRole(mapping, role, index);
        break;
      }
    }
  });

  return mapping;
}

export function buildImportQaSummary(
  rows: readonly string[][],
  mapping: ImportMapping,
): ImportQaSummary {
  let duplicateRows = 0;
  let emptyRows = 0;
  let missingCells = 0;
  const issues: ImportQaIssue[] = [];
  const seen = new Set<string>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const normalizedRow = row.map((cell) => cell.trim()).join("\u241F");

    if (!row.some((cell) => cell.trim())) {
      emptyRows += 1;
      return;
    }

    if (seen.has(normalizedRow)) duplicateRows += 1;
    else seen.add(normalizedRow);

    missingCells += row.filter((cell) => !cell.trim()).length;

    if (mapping.measurementType != null) {
      const value = row[mapping.measurementType]?.trim() ?? "";
      if (!value) {
        issues.push({
          rowNumber,
          kind: "missing_type",
          message: "نوع القياس مفقود.",
        });
      }
    }

    if (mapping.measuredAt != null) {
      const value = row[mapping.measuredAt]?.trim() ?? "";
      if (value && !isValidDateInput(value)) {
        issues.push({
          rowNumber,
          kind: "invalid_date",
          message: "صيغة التاريخ أو الوقت غير صالحة.",
        });
      }
    }

    if (mapping.value != null) {
      const value = row[mapping.value]?.trim() ?? "";
      if (value && !isFiniteNumber(value)) {
        issues.push({
          rowNumber,
          kind: "invalid_value",
          message: "القيمة ليست رقمًا صالحًا.",
        });
      }
    }

    if (mapping.systolic != null) {
      const value = row[mapping.systolic]?.trim() ?? "";
      if (value && !isFiniteNumber(value)) {
        issues.push({
          rowNumber,
          kind: "invalid_systolic",
          message: "القيمة الانقباضية ليست رقمًا صالحًا.",
        });
      }
    }

    if (mapping.diastolic != null) {
      const value = row[mapping.diastolic]?.trim() ?? "";
      if (value && !isFiniteNumber(value)) {
        issues.push({
          rowNumber,
          kind: "invalid_diastolic",
          message: "القيمة الانبساطية ليست رقمًا صالحًا.",
        });
      }
    }
  });

  const issueRows = new Set(issues.map((issue) => issue.rowNumber));

  return {
    totalRows: rows.length,
    duplicateRows,
    emptyRows,
    missingCells,
    validRows: Math.max(0, rows.length - issueRows.size),
    rowsWithIssues: issueRows.size,
    issues,
  };
}

export function importMappingRoleForIndex(
  mapping: ImportMapping,
  index: number,
): ImportColumnRole {
  if (mapping.measuredAt === index) return "measured_at";
  if (mapping.measurementType === index) return "measurement_type";
  if (mapping.value === index) return "value";
  if (mapping.unit === index) return "unit";
  if (mapping.systolic === index) return "systolic";
  if (mapping.diastolic === index) return "diastolic";
  if (mapping.notes === index) return "notes";
  return "ignore";
}

export function setImportMappingRole(
  mapping: ImportMapping,
  index: number,
  role: ImportColumnRole,
): ImportMapping {
  const next = { ...mapping };

  for (const key of Object.keys(next) as Array<keyof ImportMapping>) {
    if (next[key] === index) delete next[key];
  }

  if (role === "ignore") return next;

  assignRole(next, role, index);
  return next;
}

function assignRole(
  mapping: ImportMapping,
  role: Exclude<ImportColumnRole, "ignore">,
  index: number,
) {
  const key = roleToMappingKey(role);
  for (const existingKey of Object.keys(mapping) as Array<keyof ImportMapping>) {
    if (existingKey === key) continue;
    if (mapping[existingKey] === index) delete mapping[existingKey];
  }
  mapping[key] = index;
}

function roleToMappingKey(
  role: Exclude<ImportColumnRole, "ignore">,
): keyof ImportMapping {
  switch (role) {
    case "measured_at":
      return "measuredAt";
    case "measurement_type":
      return "measurementType";
    case "value":
      return "value";
    case "unit":
      return "unit";
    case "systolic":
      return "systolic";
    case "diastolic":
      return "diastolic";
    case "notes":
      return "notes";
  }
}

export interface ImportMeasurementTypeLike {
  code: string;
  name_ar: string | null;
  name_en: string | null;
}

export interface MeasurementTypeMatchSummary {
  distinctValues: string[];
  recognizedValues: string[];
  unrecognizedValues: string[];
}

export function summarizeMeasurementTypeMatches(
  rows: readonly string[][],
  mapping: ImportMapping,
  types: readonly ImportMeasurementTypeLike[],
): MeasurementTypeMatchSummary {
  if (mapping.measurementType == null) {
    return {
      distinctValues: [],
      recognizedValues: [],
      unrecognizedValues: [],
    };
  }

  const distinctValues = Array.from(
    new Set(
      rows
        .map((row) => row[mapping.measurementType!]?.trim() ?? "")
        .filter(Boolean),
    ),
  );

  const known = new Set<string>();

  for (const type of types) {
    for (const value of [type.code, type.name_ar ?? "", type.name_en ?? ""]) {
      const normalized = normalizeMeasurementTypeToken(value);
      if (normalized) known.add(normalized);
    }
  }

  const recognizedValues: string[] = [];
  const unrecognizedValues: string[] = [];

  for (const value of distinctValues) {
    if (known.has(normalizeMeasurementTypeToken(value))) {
      recognizedValues.push(value);
    } else {
      unrecognizedValues.push(value);
    }
  }

  return {
    distinctValues,
    recognizedValues,
    unrecognizedValues,
  };
}

export function normalizeMeasurementTypeToken(value: string): string {
  return normalizeImportHeader(value);
}

export interface ImportMeasurementCatalogItem extends ImportMeasurementTypeLike {
  id: string;
  value_kind: "scalar" | "compound";
  canonical_unit: string | null;
  allowed_units: string[];
}

export interface MeasurementImportRowPayload {
  row_number: number;
  measurement_type_id: string;
  measured_at: string;
  scalar_value: number | null;
  unit: string | null;
  components: Record<string, number> | null;
  notes: string | null;
}

export interface MeasurementImportSkippedRow {
  rowNumber: number;
  reasons: string[];
}

export interface MeasurementImportPlan {
  rows: MeasurementImportRowPayload[];
  skipped: MeasurementImportSkippedRow[];
}

export function buildMeasurementImportPlan(
  rows: readonly string[][],
  mapping: ImportMapping,
  types: readonly ImportMeasurementCatalogItem[],
): MeasurementImportPlan {
  const output: MeasurementImportRowPayload[] = [];
  const skipped: MeasurementImportSkippedRow[] = [];
  const seenRows = new Set<string>();
  const typeLookup = buildMeasurementTypeLookup(types);

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const reasons: string[] = [];
    const rowSignature = row.map((cell) => cell.trim()).join("\u241F");

    if (seenRows.has(rowSignature)) {
      reasons.push("duplicate_row");
    } else {
      seenRows.add(rowSignature);
    }

    const typeToken =
      mapping.measurementType == null
        ? ""
        : row[mapping.measurementType]?.trim() ?? "";

    const type = typeLookup.get(normalizeMeasurementTypeToken(typeToken));
    if (!typeToken) reasons.push("measurement_type_missing");
    else if (!type) reasons.push("measurement_type_unknown");

    const dateToken =
      mapping.measuredAt == null
        ? ""
        : row[mapping.measuredAt]?.trim() ?? "";
    const measuredAt = parseStrictImportDate(dateToken);

    if (!dateToken) reasons.push("measured_at_missing");
    else if (!measuredAt) reasons.push("measured_at_invalid_or_ambiguous");

    let scalarValue: number | null = null;
    let components: Record<string, number> | null = null;
    let unit: string | null = null;

    if (type) {
      unit = resolveImportedUnit(
        mapping.unit == null ? "" : row[mapping.unit]?.trim() ?? "",
        type,
      );

      const unitToken =
        mapping.unit == null ? "" : row[mapping.unit]?.trim() ?? "";
      if (unitToken && unit == null) {
        reasons.push("unit_not_supported");
      }

      if (type.value_kind === "scalar") {
        const valueToken =
          mapping.value == null ? "" : row[mapping.value]?.trim() ?? "";
        const parsedValue = parseImportNumber(valueToken);

        if (!valueToken) reasons.push("value_missing");
        else if (parsedValue == null) reasons.push("value_invalid");
        else scalarValue = parsedValue;
      } else if (type.code === "blood_pressure") {
        const systolicToken =
          mapping.systolic == null ? "" : row[mapping.systolic]?.trim() ?? "";
        const diastolicToken =
          mapping.diastolic == null ? "" : row[mapping.diastolic]?.trim() ?? "";
        const systolic = parseImportNumber(systolicToken);
        const diastolic = parseImportNumber(diastolicToken);

        if (!systolicToken) reasons.push("systolic_missing");
        else if (systolic == null) reasons.push("systolic_invalid");

        if (!diastolicToken) reasons.push("diastolic_missing");
        else if (diastolic == null) reasons.push("diastolic_invalid");

        if (systolic != null && diastolic != null) {
          components = { systolic, diastolic };
        }
      } else {
        reasons.push("compound_type_not_supported_for_csv");
      }
    }

    if (reasons.length || !type || !measuredAt) {
      skipped.push({ rowNumber, reasons });
      return;
    }

    const notes =
      mapping.notes == null ? "" : row[mapping.notes]?.trim() ?? "";

    output.push({
      row_number: rowNumber,
      measurement_type_id: type.id,
      measured_at: measuredAt,
      scalar_value: scalarValue,
      unit,
      components,
      notes: notes || null,
    });
  });

  return { rows: output, skipped };
}

export function parseStrictImportDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    const date = new Date(year, month - 1, day, 0, 0, 0, 0);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }
    return date.toISOString();
  }

  const localDateTime =
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
      trimmed,
    );

  if (localDateTime) {
    const year = Number(localDateTime[1]);
    const month = Number(localDateTime[2]);
    const day = Number(localDateTime[3]);
    const hour = Number(localDateTime[4]);
    const minute = Number(localDateTime[5]);
    const second = Number(localDateTime[6] ?? "0");

    const date = new Date(year, month - 1, day, hour, minute, second, 0);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day ||
      date.getHours() !== hour ||
      date.getMinutes() !== minute ||
      date.getSeconds() !== second
    ) {
      return null;
    }
    return date.toISOString();
  }

  if (
    /^\d{4}-\d{2}-\d{2}T/.test(trimmed) &&
    /(Z|[+-]\d{2}:?\d{2})$/i.test(trimmed)
  ) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  return null;
}

export function parseImportNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized =
    trimmed.includes(",") && !trimmed.includes(".")
      ? trimmed.replace(",", ".")
      : trimmed;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildMeasurementTypeLookup(
  types: readonly ImportMeasurementCatalogItem[],
): Map<string, ImportMeasurementCatalogItem> {
  const map = new Map<string, ImportMeasurementCatalogItem>();

  for (const type of types) {
    for (const value of [type.code, type.name_ar ?? "", type.name_en ?? ""]) {
      const normalized = normalizeMeasurementTypeToken(value);
      if (normalized && !map.has(normalized)) {
        map.set(normalized, type);
      }
    }
  }

  return map;
}

function resolveImportedUnit(
  providedUnit: string,
  type: ImportMeasurementCatalogItem,
): string | null {
  if (!providedUnit) return type.canonical_unit;

  if (!type.allowed_units.length) return providedUnit;

  const normalizedProvided = providedUnit.trim().toLocaleLowerCase();
  const matched = type.allowed_units.find(
    (unit) => unit.trim().toLocaleLowerCase() === normalizedProvided,
  );

  return matched ?? null;
}

function mappingRoleAlreadyAssigned(
  mapping: ImportMapping,
  role: Exclude<ImportColumnRole, "ignore">,
): boolean {
  return mapping[roleToMappingKey(role)] != null;
}

function firstNonEmptyLogicalLine(text: string): string {
  const rows = parseDelimited(text, "\n" as CsvDelimiter, true);
  const row = rows.find((item) => item.some((cell) => cell.trim()));
  return row?.join("\n") ?? text.split(/\r?\n/)[0] ?? "";
}

function countDelimiterOutsideQuotes(text: string, delimiter: CsvDelimiter): number {
  let count = 0;
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && char === delimiter) count += 1;
  }

  return count;
}

function parseDelimited(
  text: string,
  delimiter: string,
  delimiterAsNewline = false,
): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  const pushCell = () => {
    row.push(cell);
    cell = "";
  };

  const pushRow = () => {
    pushCell();
    rows.push(row);
    row = [];
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && !delimiterAsNewline && char === delimiter) {
      pushCell();
      continue;
    }

    if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      pushRow();
      continue;
    }

    if (!quoted && delimiterAsNewline && char === delimiter) {
      pushRow();
      continue;
    }

    cell += char;
  }

  if (cell.length || row.length) pushRow();

  return rows;
}

function isFiniteNumber(value: string): boolean {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return false;
  const parsed = Number(normalized);
  return Number.isFinite(parsed);
}

function isValidDateInput(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return parseStrictImportDate(trimmed) != null;
}
