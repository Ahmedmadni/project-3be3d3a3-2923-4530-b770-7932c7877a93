import type { MeasurementReleaseReadiness } from "./measurement-release-readiness";

export type MeasurementReviewPackKind =
  | "type"
  | "reference"
  | "red_flag"
  | "knowledge";

export type MeasurementReviewPackItem = {
  id: string;
  measurementTypeId: string;
  kind: MeasurementReviewPackKind;
  reviewStatus: string;
  readiness: MeasurementReleaseReadiness;
  actionable: boolean;
};

export type MeasurementReviewPack = {
  measurementTypeId: string;
  total: number;
  draft: number;
  inReview: number;
  changesRequested: number;
  approved: number;
  published: number;
  retired: number;
  publishBlocked: number;
  activationReady: number;
  actionable: number;
  typeCount: number;
  referenceCount: number;
  redFlagCount: number;
  knowledgeCount: number;
  nextActionableItemId: string | null;
};

export function buildMeasurementReviewPacks(
  items: MeasurementReviewPackItem[],
): MeasurementReviewPack[] {
  const packs = new Map<string, MeasurementReviewPack>();

  for (const item of items) {
    const pack =
      packs.get(item.measurementTypeId) ??
      createPack(item.measurementTypeId);

    pack.total += 1;

    switch (item.reviewStatus) {
      case "draft":
        pack.draft += 1;
        break;
      case "in_review":
        pack.inReview += 1;
        break;
      case "changes_requested":
        pack.changesRequested += 1;
        break;
      case "approved":
        pack.approved += 1;
        break;
      case "published":
        pack.published += 1;
        break;
      case "retired":
        pack.retired += 1;
        break;
    }

    if (item.readiness.publishBlockers.length > 0) {
      pack.publishBlocked += 1;
    }
    if (item.readiness.activationBlockers.length === 0) {
      pack.activationReady += 1;
    }
    if (item.actionable) {
      pack.actionable += 1;
      if (!pack.nextActionableItemId) {
        pack.nextActionableItemId = item.id;
      }
    }

    switch (item.kind) {
      case "type":
        pack.typeCount += 1;
        break;
      case "reference":
        pack.referenceCount += 1;
        break;
      case "red_flag":
        pack.redFlagCount += 1;
        break;
      case "knowledge":
        pack.knowledgeCount += 1;
        break;
    }

    packs.set(item.measurementTypeId, pack);
  }

  return [...packs.values()];
}

function createPack(
  measurementTypeId: string,
): MeasurementReviewPack {
  return {
    measurementTypeId,
    total: 0,
    draft: 0,
    inReview: 0,
    changesRequested: 0,
    approved: 0,
    published: 0,
    retired: 0,
    publishBlocked: 0,
    activationReady: 0,
    actionable: 0,
    typeCount: 0,
    referenceCount: 0,
    redFlagCount: 0,
    knowledgeCount: 0,
    nextActionableItemId: null,
  };
}
