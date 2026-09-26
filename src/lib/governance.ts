// Client mirror of the database workflow rules (public.can_transition).
// The database is the enforcement point; this file only drives the UI and tests.
export type Role = "user" | "content_editor" | "medical_reviewer" | "admin" | "super_admin" | "moderator";
export type WorkflowStatus = "draft" | "in_review" | "changes_requested" | "approved" | "published" | "retired";
export const WORKFLOW: WorkflowStatus[] = ["draft", "in_review", "changes_requested", "approved", "published", "retired"];
export const STAFF_ROLES: Role[] = ["content_editor", "medical_reviewer", "admin", "super_admin"];

/** Legacy statuses from phase 2 map onto the new workflow. */
export function normalizeStatus(s: string | null | undefined): WorkflowStatus {
  if (s === "pending_review") return "in_review";
  if (s === "reviewed") return "approved";
  return (WORKFLOW as string[]).includes(s ?? "") ? (s as WorkflowStatus) : "draft";
}

const has = (roles: Role[], any: Role[]) => roles.some((r) => any.includes(r));
export const isStaff = (roles: Role[]) => has(roles, STAFF_ROLES);
export const canEditContent = (roles: Role[]) => has(roles, ["content_editor", "admin", "super_admin"]);
export const canManageRoles = (roles: Role[]) => has(roles, ["admin", "super_admin"]);

export function canTransition(roles: Role[], fromRaw: string, to: WorkflowStatus): boolean {
  const from = normalizeStatus(fromRaw);
  if (from === to) return true;
  if (roles.includes("super_admin")) return true;
  if (to === "in_review" && (from === "draft" || from === "changes_requested")) return has(roles, ["content_editor", "admin"]);
  if ((to === "approved" || to === "changes_requested") && from === "in_review") return has(roles, ["medical_reviewer", "admin"]);
  if (to === "published" && from === "approved") return has(roles, ["admin"]);
  if (to === "retired") return has(roles, ["admin"]);
  if (to === "draft" && (from === "retired" || from === "changes_requested")) return has(roles, ["admin", "content_editor"]);
  return false;
}

export interface TransitionCheck { ok: boolean; reason?: "DENIED" | "DEMO_NOT_APPROVABLE" | "SEPARATION_OF_DUTIES" }
export function checkTransition(p: {
  roles: Role[]; from: string; to: WorkflowStatus; isDemo: boolean; actorId: string; createdBy?: string | null; requireDistinctReviewer?: boolean;
}): TransitionCheck {
  if (!canTransition(p.roles, p.from, p.to)) return { ok: false, reason: "DENIED" };
  if (p.isDemo && (p.to === "approved" || p.to === "published")) return { ok: false, reason: "DEMO_NOT_APPROVABLE" };
  if (p.to === "approved" && p.requireDistinctReviewer && p.createdBy && p.createdBy === p.actorId) return { ok: false, reason: "SEPARATION_OF_DUTIES" };
  return { ok: true };
}

/** Next transitions the actor may perform (for action buttons). */
export function availableTransitions(roles: Role[], from: string): WorkflowStatus[] {
  return WORKFLOW.filter((to) => to !== normalizeStatus(from) && canTransition(roles, from, to));
}

export function auditActionFor(from: string, to: string): string {
  if (to === "in_review") return "submit_review";
  if (to === "changes_requested") return "request_changes";
  if (to === "approved") return "approve";
  if (to === "published") return "publish";
  if (to === "retired") return "retire";
  if (to === "draft" && from === "retired") return "restore";
  return "update";
}

/** Published content is never edited in place: edits become a new draft version. */
export function editStrategy(status: string): "update_in_place" | "new_draft_version" {
  return normalizeStatus(status) === "published" ? "new_draft_version" : "update_in_place";
}
export function nextVersionNumber(publishedVersions: number[]): number {
  return (publishedVersions.length ? Math.max(...publishedVersions) : 0) + 1;
}

/** What the public may see. Mirrors public.content_visible(). */
export function isPubliclyVisible(status: string | null | undefined, isDemo: boolean, mode: "development" | "production"): boolean {
  if (status === "published") return true;
  return mode === "development" && isDemo;
}

/** Roles an actor may grant to someone else. Nobody edits their own roles. */
export function grantableRoles(actorRoles: Role[], actorId: string, targetId: string): Role[] {
  if (actorId === targetId) return [];
  if (actorRoles.includes("super_admin")) return ["content_editor", "medical_reviewer", "admin", "super_admin"];
  if (actorRoles.includes("admin")) return ["content_editor", "medical_reviewer"];
  return [];
}
