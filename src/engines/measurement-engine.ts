import type {
  MeasurementClause,
  MeasurementContentMode,
  MeasurementEvaluation,
  MeasurementPredicate,
  MeasurementReading,
  MeasurementReferenceRule,
  MeasurementSafetyRule,
  MeasurementTypeDefinition,
} from "@/types/measurements";

export interface MeasurementEvaluationInput {
  type: MeasurementTypeDefinition;
  reading: MeasurementReading;
  referenceRules?: MeasurementReferenceRule[];
  safetyRules?: MeasurementSafetyRule[];
  /**
   * Code-defined, reviewed safety-floor rules. These are evaluated independently
   * from database visibility so a missing/partial database rule set cannot
   * silently suppress an established safety rule.
   *
   * This foundation intentionally ships with no clinical thresholds.
   */
  safetyFloorRules?: MeasurementSafetyRule[];
  mode?: MeasurementContentMode;
}

export function evaluateMeasurement(input: MeasurementEvaluationInput): MeasurementEvaluation {
  const mode = input.mode ?? "production";
  const errors = validateMeasurementReading(input.type, input.reading);

  if (errors.length) {
    return {
      status: "invalid",
      safetyMatches: [],
      referenceMatches: [],
      errors,
    };
  }

  if (
    input.type.valueKind === "scalar" &&
    input.type.canonicalUnit &&
    input.reading.unit !== input.type.canonicalUnit
  ) {
    return {
      status: "needs_normalization",
      safetyMatches: [],
      referenceMatches: [],
      errors: [],
    };
  }

  const safetyFloorMatches = (input.safetyFloorRules ?? [])
    .filter((rule) => rule.measurementTypeId === input.type.id)
    .filter((rule) => predicateMatches(rule.predicate, input.reading));

  const safetyMatches = [
    ...safetyFloorMatches,
    ...(input.safetyRules ?? [])
      .filter((rule) => rule.measurementTypeId === input.type.id)
      .filter((rule) => contentVisible(rule, mode))
      .filter((rule) => predicateMatches(rule.predicate, input.reading)),
  ].sort(byPriority);

  const referenceMatches = (input.referenceRules ?? [])
    .filter((rule) => rule.measurementTypeId === input.type.id)
    .filter((rule) => contentVisible(rule, mode))
    .filter((rule) => predicateMatches(rule.predicate, input.reading))
    .sort(byPriority);

  if (!safetyMatches.length && !referenceMatches.length) {
    const hasEligibleRules =
      (input.safetyFloorRules ?? []).some((rule) => rule.measurementTypeId === input.type.id) ||
      (input.safetyRules ?? []).some(
        (rule) => rule.measurementTypeId === input.type.id && contentVisible(rule, mode),
      ) ||
      (input.referenceRules ?? []).some(
        (rule) => rule.measurementTypeId === input.type.id && contentVisible(rule, mode),
      );

    return {
      status: hasEligibleRules ? "no_match" : "not_interpreted",
      safetyMatches: [],
      referenceMatches: [],
      errors: [],
    };
  }

  return {
    status: "matched",
    safetyMatches,
    referenceMatches,
    errors: [],
  };
}

export function validateMeasurementReading(
  type: MeasurementTypeDefinition,
  reading: MeasurementReading,
): string[] {
  const errors: string[] = [];

  if (reading.measurementTypeId !== type.id) {
    errors.push("MEASUREMENT_TYPE_MISMATCH");
  }

  if (!Number.isFinite(Date.parse(reading.measuredAt))) {
    errors.push("INVALID_MEASURED_AT");
  }

  if (type.valueKind === "scalar") {
    if (!Number.isFinite(reading.scalarValue)) {
      errors.push("SCALAR_VALUE_REQUIRED");
    }
    if (reading.components && Object.keys(reading.components).length) {
      errors.push("COMPONENTS_NOT_ALLOWED_FOR_SCALAR");
    }

    const allowed = new Set([
      ...(type.allowedUnits ?? []),
      ...(type.canonicalUnit ? [type.canonicalUnit] : []),
    ]);
    if (allowed.size && (!reading.unit || !allowed.has(reading.unit))) {
      errors.push("UNSUPPORTED_UNIT");
    }
  }

  if (type.valueKind === "compound") {
    if (reading.scalarValue !== null && reading.scalarValue !== undefined) {
      errors.push("SCALAR_NOT_ALLOWED_FOR_COMPOUND");
    }

    if (!reading.components) {
      errors.push("COMPONENTS_REQUIRED");
    } else {
      for (const component of type.components.filter((item) => item.required)) {
        if (!Number.isFinite(reading.components[component.code])) {
          errors.push(`COMPONENT_REQUIRED:${component.code}`);
        }
      }
    }
  }

  return errors;
}

export function predicateMatches(
  predicate: MeasurementPredicate,
  reading: MeasurementReading,
): boolean {
  const all = predicate.all ?? [];
  const any = predicate.any ?? [];

  // Empty predicates are deliberately non-matching. This prevents an
  // accidentally incomplete rule from becoming universally true.
  if (!all.length && !any.length) return false;

  const allOk = all.every((clause) => clauseMatches(clause, reading));
  const anyOk = !any.length || any.some((clause) => clauseMatches(clause, reading));
  return allOk && anyOk;
}

function clauseMatches(clause: MeasurementClause, reading: MeasurementReading): boolean {
  const actual = resolvePath(clause.path, reading);
  const expected = clause.value;

  if (clause.operator === "in") {
    return Array.isArray(expected) && expected.includes(actual);
  }

  if (clause.operator === "eq") return actual === expected;
  if (clause.operator === "neq") return actual !== expected;

  if (typeof actual !== "number" || typeof expected !== "number") return false;

  if (clause.operator === "lt") return actual < expected;
  if (clause.operator === "lte") return actual <= expected;
  if (clause.operator === "gt") return actual > expected;
  if (clause.operator === "gte") return actual >= expected;
  return false;
}

function resolvePath(
  path: MeasurementClause["path"],
  reading: MeasurementReading,
): string | number | boolean | null | undefined {
  if (path === "value") return reading.scalarValue ?? undefined;

  if (path.startsWith("components.")) {
    return reading.components?.[path.slice("components.".length)];
  }

  if (path.startsWith("context.")) {
    return reading.context?.[path.slice("context.".length)];
  }

  return undefined;
}

function contentVisible(
  item: {
    isActive: boolean;
    isDemo: boolean;
    reviewStatus: string;
    sourceId: string;
  },
  mode: MeasurementContentMode,
): boolean {
  if (!item.isActive || !item.sourceId || item.reviewStatus === "retired") return false;
  if (mode === "production") {
    return item.reviewStatus === "published" && !item.isDemo;
  }
  return true;
}

function byPriority<T extends { priority: number; code: string }>(a: T, b: T): number {
  return a.priority - b.priority || a.code.localeCompare(b.code);
}
