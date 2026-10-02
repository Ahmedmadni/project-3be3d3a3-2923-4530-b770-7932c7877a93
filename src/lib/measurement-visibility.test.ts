import { describe, expect, it } from "vitest";
import {
  isMeasurementTypeVisible,
  selectVisibleMeasurementTypes,
} from "./measurement-visibility";

describe("measurement public visibility", () => {
  const draft = {
    review_status: "draft",
    is_active: false,
    is_demo: false,
  };
  const published = {
    review_status: "published",
    is_active: true,
    is_demo: false,
  };
  const inactivePublished = {
    review_status: "published",
    is_active: false,
    is_demo: false,
  };
  const demoPublished = {
    review_status: "published",
    is_active: true,
    is_demo: true,
  };
  const retired = {
    review_status: "retired",
    is_active: false,
    is_demo: false,
  };

  it("allows internal draft preview in development", () => {
    expect(isMeasurementTypeVisible(draft, "development")).toBe(true);
  });

  it("only exposes published active non-demo types in production", () => {
    expect(isMeasurementTypeVisible(published, "production")).toBe(true);
    expect(isMeasurementTypeVisible(draft, "production")).toBe(false);
    expect(isMeasurementTypeVisible(inactivePublished, "production")).toBe(false);
    expect(isMeasurementTypeVisible(demoPublished, "production")).toBe(false);
    expect(isMeasurementTypeVisible(retired, "production")).toBe(false);
  });

  it("always hides retired types", () => {
    expect(isMeasurementTypeVisible(retired, "development")).toBe(false);
  });

  it("filters collections consistently", () => {
    const rows = [
      { id: "draft", ...draft },
      { id: "published", ...published },
      { id: "demo", ...demoPublished },
    ];

    expect(
      selectVisibleMeasurementTypes(rows, "production").map((row) => row.id),
    ).toEqual(["published"]);
  });
});
