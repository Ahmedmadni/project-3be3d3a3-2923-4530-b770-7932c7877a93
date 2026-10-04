import { supabase } from "@/integrations/supabase/client";

export type PushReminderStatus =
  | "enabled"
  | "unsupported"
  | "permission_denied"
  | "not_configured";

function urlBase64ToUint8Array(value: string): Uint8Array {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

function bufferToBase64Url(buffer: ArrayBuffer | null): string | null {
  if (!buffer) return null;
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return window
    .btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function backgroundPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function enableBackgroundMedicationReminders(): Promise<PushReminderStatus> {
  if (!backgroundPushSupported()) return "unsupported";

  const vapidPublicKey = import.meta.env["VITE_VAPID_PUBLIC_KEY"]?.trim();
  if (!vapidPublicKey) return "not_configured";

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") return "permission_denied";

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }

  const p256dh = bufferToBase64Url(subscription.getKey("p256dh"));
  const authSecret = bufferToBase64Url(subscription.getKey("auth"));

  if (!p256dh || !authSecret) {
    throw new Error("PUSH_KEYS_UNAVAILABLE");
  }

  const { error } = await supabase.rpc("claim_web_push_subscription", {
    p_endpoint: subscription.endpoint,
    p_p256dh: p256dh,
    p_auth_secret: authSecret,
    p_expiration_time: subscription.expirationTime,
    p_user_agent: navigator.userAgent || null,
  });

  if (error) throw error;
  return "enabled";
}

export async function disableBackgroundMedicationReminders(): Promise<void> {
  if (!backgroundPushSupported()) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();

  const { error } = await supabase
    .from("web_push_subscriptions")
    .update({ is_active: false })
    .eq("endpoint", endpoint);

  if (error) throw error;
}
