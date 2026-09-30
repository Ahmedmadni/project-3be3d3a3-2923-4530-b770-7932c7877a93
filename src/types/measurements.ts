import type { CareLevel } from "@/types/medical";

export type MeasurementReviewStatus =
  | "draft"
  | "in_review"
  | "changes_requested"
  | "approved"
  | "published"
  | "retired";

export type MeasurementValueKind = "scalar" | "compound";
export type MeasurementQuality = "unknown" | "good" | "questionable";

export interface MeasurementComponentDefinition {
  code: string;
  labelAr: string;
  labelEn?: string | null;
  unit: string;
  required: boolean;
}

export interface MeasurementTypeDefinition {
  id: string;
  code: string;
  nameAr: string;
  nameEn?: string | null;
  valueKind: MeasurementValueKind;
  canonicalUnit?: string | null;
  allowedUnits: string[];
  components: MeasurementComponentDefinition[];
  reviewStatus: MeasurementReviewStatus;
  isActive: boolean;
  isDemo: boolean;
  version: number;
}

export type MeasurementContextValue = string | number | boolean | null;
export type MeasurementContext = Record<string, MeasurementContextValue>;

export interface MeasurementReading {
  measurementTypeId: string;
  measuredAt: string;
  scalarValue?: number | null;
  unit?: string | null;
  components?: Record<string, number> | null;
  context?: MeasurementContext;
  quality?: MeasurementQuality;
}

export type MeasurementClauseOperator =
  | "eq"
  | "neq"
  | "lt"
  | "lte"
  | "gt"
  | "gte"
  | "in";

export interface MeasurementClause {
  path: "value" | `components.${string}` | `context.${string}`;
  operator: MeasurementClauseOperator;
  value: MeasurementContextValue | MeasurementContextValue[];
}

export interface MeasurementPredicate {
  all?: MeasurementClause[];
  any?: MeasurementClause[];
  /** OR between groups, AND inside each group. */
  anyOf?: MeasurementClause[][];
}

export interface MeasurementReferenceRule {
  id: string;
  measurementTypeId: string;
  code: string;
  labelAr: string;
  interpretationCode: string;
  predicate: MeasurementPredicate;
  careLevel?: CareLevel | null;
  sourceId: string;
  reviewStatus: MeasurementReviewStatus;
  isActive: boolean;
  isDemo: boolean;
  priority: number;
  version: number;
}

export interface MeasurementSafetyRule {
  id: string;
  measurementTypeId: string;
  code: string;
  titleAr: string;
  predicate: MeasurementPredicate;
  careLevel: CareLevel;
  sourceId: string;
  reviewStatus: MeasurementReviewStatus;
  isActive: boolean;
  isDemo: boolean;
  priority: number;
  version: number;
}

export type MeasurementContentMode = "production" | "development";

export type MeasurementEvaluationStatus =
  | "matched"
  | "no_match"
  | "not_interpreted"
  | "needs_normalization"
  | "invalid";

export interface MeasurementEvaluation {
  status: MeasurementEvaluationStatus;
  safetyMatches: MeasurementSafetyRule[];
  referenceMatches: MeasurementReferenceRule[];
  /** Highest-priority matching reference rule, if any. */
  primaryReferenceMatch: MeasurementReferenceRule | null;
  errors: string[];
}
