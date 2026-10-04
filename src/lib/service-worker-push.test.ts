import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const worker = readFileSync(
  new URL("../../public/sw.js", import.meta.url),
  "utf8",
);

describe("service worker push privacy", () => {
  it("handles push and notification click events", () => {
    expect(worker).toContain('addEventListener("push"');
    expect(worker).toContain('addEventListener("notificationclick"');
    expect(worker).toContain('openWindow("/journal")');
  });

  it("ignores incoming push payload content and displays a generic reminder", () => {
    expect(worker).toContain("Deliberately ignore push payload content");
    expect(worker).toContain("لديك تذكير صحي مسجل");
    expect(worker).not.toContain("event.data.json");
    expect(worker).not.toContain("medicationName");
    expect(worker).not.toContain("doseText");
  });

  it("continues to keep navigation and health API data out of the cache", () => {
    expect(worker).toContain('request.mode === "navigate"');
    expect(worker).toContain('url.pathname.startsWith("/api/")');
    expect(worker).toContain('url.pathname.includes("supabase")');
  });
});
