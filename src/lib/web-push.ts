import { supabase } from "@/integrations/supabase/client";

export type BackgroundPushStatus =
  | "unsupported"
  | "not_configured"
  | "denied"
  | "disabled"
  | "enabled";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function vapidPublicKey(): string | null {
  const value = import.meta.env["VITE_VAPID_PUBLIC_KEY"];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function getBackgroundPushStatus(): Promise<BackgroundPushStatus> {
  if (!pushSupported()) return "unsupported";
  if (!vapidPublicKey()) return "not_configured";
  if (Notification.permission === "denied") return "denied";

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  return subscription ? "enabled" : "disabled";
}

export async function enableBackgroundPush(): Promise<BackgroundPushStatus> {
  if (!pushSupported()) return "unsupported";

  const publicKey = vapidPublicKey();
  if (!publicKey) return "not_configured";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return permission === "denied" ? "denied" : "disabled";
  }

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const authSecret = json.keys?.auth;

  if (!p256dh || !authSecret) {
    throw new Error("PUSH_KEYS_UNAVAILABLE");
  }

  const { error } = await supabase.rpc("claim_web_push_subscription", {
    p_endpoint: subscription.endpoint,
    p_p256dh: p256dh,
    p_auth_secret: authSecret,
    p_expiration_time: subscription.expirationTime ?? null,
    p_user_agent: navigator.userAgent,
  });

  if (error) throw error;

  return "enabled";
}

export async function disableBackgroundPush(): Promise<BackgroundPushStatus> {
  if (!pushSupported()) return "unsupported";

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) return "disabled";

  const { error } = await supabase
    .from("web_push_subscriptions")
    .update({ is_active: false })
    .eq("endpoint", subscription.endpoint);

  if (error) throw error;

  await subscription.unsubscribe();
  return "disabled";
}
