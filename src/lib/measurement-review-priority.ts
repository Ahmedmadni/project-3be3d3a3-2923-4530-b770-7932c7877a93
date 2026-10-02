import type { MeasurementReleaseReadiness } from "./measurement-release-readiness";

export type MeasurementReviewKind =
  | "type"
  | "reference"
  | "red_flag"
  | "knowledge";

export type MeasurementReviewPriorityItem = {
  id: string;
  kind: MeasurementReviewKind;
  reviewStatus: string;
  readiness: MeasurementReleaseReadiness;
  priority?: number | null;
  submittedAt?: string | null;
  updatedAt?: string | null;
};

export function sortMeasurementReviewQueue<
  T extends MeasurementReviewPriorityItem,
>(items: T[]): T[] {
  return [...items].sort(compareReviewItems);
}

export function measurementReviewPriorityReason(
  item: MeasurementReviewPriorityItem,
): string {
  if (item.reviewStatus === "in_review") {
    return item.readiness.publishBlockers.length > 0
      ? "قيد المراجعة ويحتاج معالجة موانع النشر."
      : "قيد المراجعة وجاهز لاتخاذ قرار المراجع.";
  }

  if (item.reviewStatus === "approved") {
    return item.readiness.publishBlockers.length > 0
      ? "معتمد لكن توجد موانع قبل النشر."
      : "معتمد وجاهز لخطوة النشر الإدارية.";
  }

  if (item.reviewStatus === "changes_requested") {
    return "أعيد للمحرر بتعديلات مطلوبة.";
  }

  if (item.reviewStatus === "draft") {
    return "مسودة لم تدخل دورة المراجعة بعد.";
  }

  if (item.reviewStatus === "published") {
    return item.readiness.activationBlockers.length === 0
      ? "منشور ويمكن تفعيله وفق حواجز الحوكمة الحالية."
      : "منشور لكن التفعيل ما زال محظورًا.";
  }

  return "عنصر متقاعد خارج دورة المراجعة النشطة.";
}

function compareReviewItems(
  a: MeasurementReviewPriorityItem,
  b: MeasurementReviewPriorityItem,
): number {
  const statusDelta =
    workflowRank(a.reviewStatus) - workflowRank(b.reviewStatus);
  if (statusDelta !== 0) return statusDelta;

  const blockerDelta =
    attentionRank(a) - attentionRank(b);
  if (blockerDelta !== 0) return blockerDelta;

  const kindDelta = kindRank(a.kind) - kindRank(b.kind);
  if (kindDelta !== 0) return kindDelta;

  const priorityDelta =
    normalizePriority(a.priority) - normalizePriority(b.priority);
  if (priorityDelta !== 0) return priorityDelta;

  const submittedDelta =
    dateRank(a.submittedAt ?? a.updatedAt) -
    dateRank(b.submittedAt ?? b.updatedAt);
  if (submittedDelta !== 0) return submittedDelta;

  return a.id.localeCompare(b.id);
}

function workflowRank(status: string): number {
  switch (status) {
    case "in_review":
      return 0;
    case "approved":
      return 1;
    case "changes_requested":
      return 2;
    case "draft":
      return 3;
    case "published":
      return 4;
    case "retired":
      return 5;
    default:
      return 6;
  }
}

function attentionRank(item: MeasurementReviewPriorityItem): number {
  if (
    item.reviewStatus === "in_review" ||
    item.reviewStatus === "approved"
  ) {
    return item.readiness.publishBlockers.length > 0 ? 0 : 1;
  }

  if (item.reviewStatus === "published") {
    return item.readiness.activationBlockers.length > 0 ? 0 : 1;
  }

  return 0;
}

function kindRank(kind: MeasurementReviewKind): number {
  switch (kind) {
    case "red_flag":
      return 0;
    case "reference":
      return 1;
    case "type":
      return 2;
    case "knowledge":
      return 3;
  }
}

function normalizePriority(priority?: number | null): number {
  if (priority == null || !Number.isFinite(priority)) return 10_000;
  return priority;
}

function dateRank(value?: string | null): number {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
}
