import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

describe("phone home-screen installation", () => {
  it("opens as a standalone app without changing the installed start URL", () => {
    const manifest = JSON.parse(readFileSync(new URL("../../public/manifest.webmanifest", import.meta.url), "utf8"));
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual(["192x192", "512x512"]);
  });
  it("keeps the messaging worker but never intercepts network requests", () => {
    const handlers = new Map();
    runInNewContext(readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8"), {
      self: { addEventListener: (name: string, handler: unknown) => handlers.set(name, handler) },
    });
    expect(handlers.has("push")).toBe(true);
    expect(handlers.has("notificationclick")).toBe(true);
    expect(handlers.has("fetch")).toBe(false);
  });
});