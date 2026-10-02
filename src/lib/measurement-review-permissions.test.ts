import { describe, expect, it } from "vitest";
import {
  canActOnMeasurementReviewItem,
  measurementReviewPermissions,
} from "./measurement-review-permissions";

describe("measurement review permissions", () => {
  it("lets a content editor submit drafts but not approve, publish, or activate", () => {
    const permissions = measurementReviewPermissions(
      ["content_editor"],
      "draft",
    );

    expect(permissions.transitions).toContain("in_review");
    expect(permissions.transitions).not.toContain("approved");
    expect(permissions.transitions).not.toContain("published");
    expect(permissions.canToggleActivation).toBe(false);
    expect(permissions.canEditClinicalContent).toBe(true);
  });

  it("lets a medical reviewer decide in-review content but not publish or activate", () => {
    const permissions = measurementReviewPermissions(
      ["medical_reviewer"],
      "in_review",
    );

    expect(permissions.transitions).toEqual(
      expect.arrayContaining(["approved", "changes_requested"]),
    );
    expect(permissions.transitions).not.toContain("published");
    expect(permissions.canReviewClinicalContent).toBe(true);
    expect(permissions.canToggleActivation).toBe(false);
  });

  it("lets an admin publish approved content", () => {
    const permissions = measurementReviewPermissions(
      ["admin"],
      "approved",
    );

    expect(permissions.transitions).toContain("published");
    expect(permissions.canPublish).toBe(true);
    expect(permissions.canToggleActivation).toBe(false);
  });

  it("only allows activation controls on published content for admins", () => {
    expect(
      measurementReviewPermissions(["admin"], "published")
        .canToggleActivation,
    ).toBe(true);
    expect(
      measurementReviewPermissions(["super_admin"], "published")
        .canToggleActivation,
    ).toBe(true);
    expect(
      measurementReviewPermissions(
        ["medical_reviewer"],
        "published",
      ).canToggleActivation,
    ).toBe(false);
    expect(
      measurementReviewPermissions(
        ["content_editor"],
        "published",
      ).canToggleActivation,
    ).toBe(false);
  });

  it("makes the queue role-aware", () => {
    expect(
      canActOnMeasurementReviewItem(["content_editor"], "draft"),
    ).toBe(true);
    expect(
      canActOnMeasurementReviewItem(
        ["content_editor"],
        "in_review",
      ),
    ).toBe(false);
    expect(
      canActOnMeasurementReviewItem(
        ["medical_reviewer"],
        "draft",
      ),
    ).toBe(false);
    expect(
      canActOnMeasurementReviewItem(
        ["medical_reviewer"],
        "in_review",
      ),
    ).toBe(true);
    expect(
      canActOnMeasurementReviewItem(["admin"], "approved"),
    ).toBe(true);
  });

  it("gives ordinary users no review actions", () => {
    const permissions = measurementReviewPermissions(["user"], "draft");

    expect(permissions.transitions).toEqual([]);
    expect(permissions.canToggleActivation).toBe(false);
    expect(permissions.canEditClinicalContent).toBe(false);
    expect(permissions.canReviewClinicalContent).toBe(false);
    expect(permissions.canPublish).toBe(false);
  });
});
