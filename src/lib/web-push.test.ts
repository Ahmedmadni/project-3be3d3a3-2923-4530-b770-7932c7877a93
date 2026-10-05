import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const helper = readFileSync(
  new URL("./web-push.ts", import.meta.url),
  "utf8",
);

describe("background push client", () => {
  it("requires the public VAPID key and browser push support", () => {
    expect(helper).toContain("VITE_VAPID_PUBLIC_KEY");
    expect(helper).toContain('"PushManager" in window');
    expect(helper).toContain('"serviceWorker" in navigator');
  });

  it("claims the endpoint through the current authenticated user RPC", () => {
    expect(helper).toContain('supabase.rpc("claim_web_push_subscription"');
    expect(helper).toContain("p_endpoint: subscription.endpoint");
  });

  it("supports explicit opt-out and browser unsubscribe", () => {
    expect(helper).toContain('.update({ is_active: false })');
    expect(helper).toContain("subscription.unsubscribe()");
  });

  it("does not include medication names or doses in the push subscription layer", () => {
    expect(helper).not.toContain("medication.name");
    expect(helper).not.toContain("dose_text");
  });
});
