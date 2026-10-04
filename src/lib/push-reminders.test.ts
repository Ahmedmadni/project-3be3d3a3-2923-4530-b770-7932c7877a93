import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const helper = readFileSync(
  new URL("./push-reminders.ts", import.meta.url),
  "utf8",
);

describe("background medication push reminders", () => {
  it("uses a public VAPID key only in the browser", () => {
    expect(helper).toContain('VITE_VAPID_PUBLIC_KEY');
    expect(helper).not.toContain("VAPID_PRIVATE_KEY");
  });

  it("claims the endpoint through the authenticated RPC", () => {
    expect(helper).toContain('rpc("claim_web_push_subscription"');
    expect(helper).toContain("p_endpoint: subscription.endpoint");
    expect(helper).toContain('subscription.getKey("p256dh")');
    expect(helper).toContain('subscription.getKey("auth")');
  });

  it("supports explicit user disable and deactivates the stored endpoint", () => {
    expect(helper).toContain("subscription.unsubscribe()");
    expect(helper).toContain(".update({ is_active: false })");
  });
});
