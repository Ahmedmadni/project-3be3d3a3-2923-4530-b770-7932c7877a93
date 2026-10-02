export type MeasurementDiffEntry = {
  path: string;
  before: unknown;
  after: unknown;
};

const governanceKeys = new Set([
  "id",
  "created_at",
  "updated_at",
  "created_by",
  "submitted_at",
  "review_status",
  "review_note",
  "reviewed_by",
  "reviewed_at",
  "approved_by",
  "approved_at",
  "published_by",
  "published_at",
  "last_medical_review_at",
  "is_active",
  "version",
]);

export function diffMeasurementSnapshot(
  current: unknown,
  previous: unknown,
): MeasurementDiffEntry[] {
  const currentValue = sanitize(current);
  const previousValue = sanitize(previous);
  const changes: MeasurementDiffEntry[] = [];
  walkDiff("", previousValue, currentValue, changes);
  return changes;
}

export function formatMeasurementDiffValue(value: unknown): string {
  if (value === undefined) return "—";
  if (value === null) return "فارغ";
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (typeof value === "string") return value || "فارغ";
  if (typeof value === "number") return String(value);
  return JSON.stringify(value, null, 2);
}

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitize);
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !governanceKeys.has(key))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entryValue]) => [key, sanitize(entryValue)]),
    );
  }

  return value;
}

function walkDiff(
  path: string,
  before: unknown,
  after: unknown,
  changes: MeasurementDiffEntry[],
) {
  if (deepEqual(before, after)) return;

  if (isRecord(before) && isRecord(after)) {
    const keys = new Set([
      ...Object.keys(before),
      ...Object.keys(after),
    ]);

    for (const key of [...keys].sort()) {
      const childPath = path ? `${path}.${key}` : key;
      walkDiff(childPath, before[key], after[key], changes);
    }
    return;
  }

  changes.push({ path: path || "value", before, after });
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (Array.isArray(a) && Array.isArray(b)) {
    return (
      a.length === b.length &&
      a.every((value, index) => deepEqual(value, b[index]))
    );
  }

  if (isRecord(a) && isRecord(b)) {
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();
    return (
      deepEqual(aKeys, bKeys) &&
      aKeys.every((key) => deepEqual(a[key], b[key]))
    );
  }

  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
