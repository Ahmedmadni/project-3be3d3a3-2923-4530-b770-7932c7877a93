import { Download, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaStatus() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("beforeinstallprompt", onInstall);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("[PWA] Service worker registration failed", error);
      });
    }

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeinstallprompt", onInstall);
    };
  }, []);

  if (!online) {
    return (
      <div className="fixed bottom-24 start-4 z-40 inline-flex items-center gap-2 rounded-full bg-card px-3 py-2 text-xs font-semibold shadow-lg ring-1 ring-border md:bottom-5">
        <WifiOff className="size-4 text-warning" />
        وضع دون اتصال — البيانات الصحية الجديدة لن تُحفظ حتى عودة الشبكة
      </div>
    );
  }

  if (!installEvent) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        await installEvent.prompt();
        const choice = await installEvent.userChoice;
        if (choice.outcome === "accepted") setInstallEvent(null);
      }}
      className="fixed bottom-24 start-4 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-glow md:bottom-5"
    >
      <Download className="size-4" />
      تثبيت مؤشر صحي
    </button>
  );
}
