import {
  availableTransitions,
  normalizeStatus,
  type Role,
  type WorkflowStatus,
} from "./governance";

export type MeasurementReviewPermissions = {
  transitions: WorkflowStatus[];
  canToggleActivation: boolean;
  canEditClinicalContent: boolean;
  canReviewClinicalContent: boolean;
  canPublish: boolean;
};

export function measurementReviewPermissions(
  roles: Role[],
  statusRaw: string,
): MeasurementReviewPermissions {
  const status = normalizeStatus(statusRaw);
  const isAdmin =
    roles.includes("admin") || roles.includes("super_admin");
  const isEditor =
    roles.includes("content_editor") ||
    roles.includes("admin") ||
    roles.includes("super_admin");
  const isReviewer =
    roles.includes("medical_reviewer") ||
    roles.includes("admin") ||
    roles.includes("super_admin");

  return {
    transitions: availableTransitions(roles, status),
    canToggleActivation: isAdmin && status === "published",
    canEditClinicalContent: isEditor && status !== "published",
    canReviewClinicalContent: isReviewer && status === "in_review",
    canPublish:
      isAdmin &&
      status === "approved" &&
      availableTransitions(roles, status).includes("published"),
  };
}
