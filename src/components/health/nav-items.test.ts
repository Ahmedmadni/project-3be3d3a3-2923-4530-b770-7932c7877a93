import { describe, expect, it } from "vitest";
import { mobileNavItems, navItems } from "./nav-items";

describe("navigation items", () => {
  it("keeps the mobile navigation focused on four primary destinations", () => {
    expect(mobileNavItems.map((item) => item.to)).toEqual([
      "/",
      "/symptom-checker",
      "/first-aid",
      "/account",
    ]);
  });

  it("keeps the health library available in desktop navigation", () => {
    expect(navItems.some((item) => item.to === "/library")).toBe(true);
    expect(mobileNavItems.some((item) => (item.to as string) === "/library")).toBe(false);
  });
});
