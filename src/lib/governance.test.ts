import { describe, expect, it } from "vitest";
import {
  availableTransitions,
  checkTransition,
  editStrategy,
  grantableRoles,
  isPubliclyVisible,
  nextVersionNumber,
} from "./governance";

describe("medical content governance", () => {
  it("prevents demo content from being medically approved or published", () => {
    expect(checkTransition({
      roles: ["medical_reviewer"],
      from: "in_review",
      to: "approved",
      isDemo: true,
      actorId: "reviewer",
      createdBy: "editor",
    })).toEqual({ ok: false, reason: "DEMO_NOT_APPROVABLE" });
  });

  it("supports optional separation of duties for medical review", () => {
    expect(checkTransition({
      roles: ["medical_reviewer"],
      from: "in_review",
      to: "approved",
      isDemo: false,
      actorId: "same-user",
      createdBy: "same-user",
      requireDistinctReviewer: true,
    })).toEqual({ ok: false, reason: "SEPARATION_OF_DUTIES" });
  });

  it("lets a reviewer approve submitted non-demo content but not publish it", () => {
    expect(availableTransitions(["medical_reviewer"], "in_review")).toContain("approved");
    expect(availableTransitions(["medical_reviewer"], "approved")).not.toContain("published");
  });

  it("locks published entities into a new draft version", () => {
    expect(editStrategy("published")).toBe("new_draft_version");
    expect(editStrategy("draft")).toBe("update_in_place");
    expect(nextVersionNumber([1, 2, 4])).toBe(5);
  });

  it("keeps draft content out of production public visibility", () => {
    expect(isPubliclyVisible("draft", false, "production")).toBe(false);
    expect(isPubliclyVisible("published", false, "production")).toBe(true);
    expect(isPubliclyVisible("draft", true, "development")).toBe(true);
  });

  it("prevents users from editing their own roles", () => {
    expect(grantableRoles(["super_admin"], "u1", "u1")).toEqual([]);
    expect(grantableRoles(["admin"], "admin", "other")).toEqual(["content_editor", "medical_reviewer"]);
  });
});
