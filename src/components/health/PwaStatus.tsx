import { Download, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/i18n";
import { pwaCopy } from "@/data/pwa-copy";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaStatus() {
  const { lang } = useI18n();
  const c = pwaCopy[lang];
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [online, setOnline] = useState(true);
  const [installed, setInstalled] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setOnline(navigator.onLine);
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    const onInstalled = () => { setInstalled(true); setInstallEvent(null); };
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("beforeinstallprompt", onInstall);
    window.addEventListener("appinstalled", onInstalled);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("[Push] Messaging worker registration failed", error);
      });
    }

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeinstallprompt", onInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!online) {
    return (
      <div className="fixed bottom-24 start-4 z-40 inline-flex items-center gap-2 rounded-full bg-card px-3 py-2 text-xs font-semibold shadow-lg ring-1 ring-border md:bottom-5">
        <WifiOff className="size-4 text-warning" />
        {c.offline}
      </div>
    );
  }

  if (installed) return null;

  return (
    <><Button
      type="button"
      onClick={async () => {
        if (!installEvent) { setOpen(true); return; }
        try {
          await installEvent.prompt();
          const choice = await installEvent.userChoice;
          setInstallEvent(null);
          if (choice.outcome !== "accepted") setOpen(true);
        } catch { setError(true); setInstallEvent(null); setOpen(true); }
      }}
      className="fixed bottom-24 start-4 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-glow md:bottom-5"
    >
      <Download className="size-4" />
      {c.install}
    </Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg" dir={lang === "ar" ? "rtl" : "ltr"}>
      <DialogTitle className="pe-6 leading-7">{c.title}</DialogTitle><DialogDescription className="leading-7">{c.description}</DialogDescription>
      <p className="text-sm leading-7">{c.ios}</p><p className="text-sm leading-7">{c.android}</p><p className="text-xs leading-6 text-muted-foreground">{c.note}</p>
      {error && <p role="alert" className="text-sm text-warning">{c.failed}</p>}
    </DialogContent></Dialog></>
  );
}
