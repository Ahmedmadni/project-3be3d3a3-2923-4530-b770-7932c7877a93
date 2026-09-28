import { describe, expect, it } from "vitest";
import {
  allowedFirstAidSectionStatuses,
  isPublicFirstAidTopicVisible,
} from "./public-content";

describe("public first-aid visibility", () => {
  it("shows active draft topics only in development", () => {
    const topic = { is_active: true, review_status: "draft" as const };
    expect(isPublicFirstAidTopicVisible(topic, "development")).toBe(true);
    expect(isPublicFirstAidTopicVisible(topic, "production")).toBe(false);
  });

  it("shows active published topics in production", () => {
    expect(isPublicFirstAidTopicVisible(
      { is_active: true, review_status: "published" },
      "production",
    )).toBe(true);
  });

  it("never shows inactive topics", () => {
    expect(isPublicFirstAidTopicVisible(
      { is_active: false, review_status: "published" },
      "development",
    )).toBe(false);
    expect(isPublicFirstAidTopicVisible(
      { is_active: false, review_status: "published" },
      "production",
    )).toBe(false);
  });

  it("limits production sections to published content", () => {
    expect(allowedFirstAidSectionStatuses("production")).toEqual(["published"]);
    expect(allowedFirstAidSectionStatuses("development")).toEqual(["reviewed", "published"]);
  });
});
