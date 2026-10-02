import type {
  MeasurementReleaseReadiness,
} from "./measurement-release-readiness";

export type MeasurementAdminStatusFilter =
  | "all"
  | "draft"
  | "in_review"
  | "changes_requested"
  | "approved"
  | "published"
  | "retired";

export type MeasurementAdminReadinessFilter =
  | "all"
  | "publish_ready"
  | "publish_blocked"
  | "activation_ready"
  | "activation_blocked";

export type MeasurementAdminQueueItem = {
  id: string;
  measurementTypeId: string;
  searchText: string;
  reviewStatus: string;
  readiness: MeasurementReleaseReadiness;
};

export type MeasurementAdminQueueFilters = {
  search: string;
  status: MeasurementAdminStatusFilter;
  readiness: MeasurementAdminReadinessFilter;
  measurementTypeId: string;
};

export function filterMeasurementAdminQueue<
  T extends MeasurementAdminQueueItem,
>(
  items: T[],
  filters: MeasurementAdminQueueFilters,
): T[] {
  const search = normalize(filters.search);

  return items.filter((item) => {
    if (
      filters.status !== "all" &&
      item.reviewStatus !== filters.status
    ) {
      return false;
    }

    if (
      filters.measurementTypeId !== "all" &&
      item.measurementTypeId !== filters.measurementTypeId
    ) {
      return false;
    }

    if (search && !normalize(item.searchText).includes(search)) {
      return false;
    }

    switch (filters.readiness) {
      case "publish_ready":
        return item.readiness.publishBlockers.length === 0;
      case "publish_blocked":
        return item.readiness.publishBlockers.length > 0;
      case "activation_ready":
        return item.readiness.activationBlockers.length === 0;
      case "activation_blocked":
        return item.readiness.activationBlockers.length > 0;
      case "all":
        return true;
    }
  });
}

export function summarizeMeasurementAdminQueue(
  items: MeasurementAdminQueueItem[],
) {
  return {
    total: items.length,
    publishReady: items.filter(
      (item) => item.readiness.publishBlockers.length === 0,
    ).length,
    publishBlocked: items.filter(
      (item) => item.readiness.publishBlockers.length > 0,
    ).length,
    activationReady: items.filter(
      (item) => item.readiness.activationBlockers.length === 0,
    ).length,
  };
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("ar");
}
