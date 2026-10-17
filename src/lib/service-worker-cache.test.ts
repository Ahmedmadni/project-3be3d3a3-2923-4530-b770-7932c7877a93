import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8");

function worker() {
  const handlers = new Map<string, (event: any) => void>();
  const deleted: string[] = [];
  runInNewContext(source, {
    URL,
    self: {
      location: { origin: "https://health.test" },
      addEventListener: (name: string, handler: (event: any) => void) => handlers.set(name, handler),
      clients: { claim: () => Promise.resolve() },
    },
    caches: {
      keys: async () => ["health-indicator-static-v3", "health-indicator-static-v4"],
      delete: async (key: string) => { deleted.push(key); return true; },
    },
  });
  return { handlers, deleted };
}

describe("service worker development module isolation", () => {
  it.each([
    "/node_modules/.vite/deps/react.js?v=old",
    "/node_modules/.vite/deps/react-dom_client.js?v=new",
    "/src/components/health/DailyHealthDashboardSection.tsx",
    "/@vite/client", "/@id/react", "/@fs/dev-server/module.js", "/@react-refresh",
  ])("leaves %s to the network instead of the static cache", (path) => {
    const { handlers } = worker();
    let intercepted = false;
    handlers.get("fetch")?.({
      request: { method: "GET", url: `https://health.test${path}`, destination: "script" },
      respondWith: () => { intercepted = true; },
    });
    expect(intercepted).toBe(false);
  });

  it("removes the old module cache on activation", async () => {
    const { handlers, deleted } = worker();
    let completion: Promise<unknown> | undefined;
    handlers.get("activate")?.({ waitUntil: (promise: Promise<unknown>) => { completion = promise; } });
    await completion;
    expect(deleted).toEqual(["health-indicator-static-v3"]);
  });
});