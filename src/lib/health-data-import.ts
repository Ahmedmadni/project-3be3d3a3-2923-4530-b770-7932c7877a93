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
  return !Number.isNaN(Date.parse(trimmed));
}
