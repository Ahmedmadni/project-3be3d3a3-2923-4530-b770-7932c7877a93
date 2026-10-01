import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppHeader } from "@/components/health/AppHeader";
import { MobileBottomNav } from "@/components/health/MobileBottomNav";
import { MedicalDisclaimer } from "@/components/health/MedicalDisclaimer";
import { PwaStatus } from "@/components/health/PwaStatus";
import { appConfig } from "@/config/app";
import { I18nProvider, useI18n } from "@/i18n";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="glass max-w-md rounded-3xl p-8 text-center">
        <h1 className="text-6xl font-extrabold text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">الصفحة غير موجودة</h2>
        <p className="mt-2 text-sm text-muted-foreground">قد تكون الصفحة نُقلت أو لم تعد متاحة.</p>
        <Link to="/" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: import("@tanstack/react-router").ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="glass max-w-md rounded-3xl p-8 text-center">
        <h1 className="text-xl font-semibold">تعذر تحميل الصفحة</h1>
        <p className="mt-2 text-sm text-muted-foreground">حدث خطأ غير متوقع. حاول مرة أخرى.</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "مؤشر صحي — مساعدك الصحي الاسترشادي" },
      { name: "description", content: "افهم أعراضك، تعرّف على الإسعافات الأولية، واعرف نوع الرعاية المناسبة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#0ea5a4" },
      { name: "application-name", content: "مؤشر صحي" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "مؤشر صحي" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/pwa-192.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Almarai:wght@400;700;800&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang={appConfig.locale} dir={appConfig.dir}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AppChrome() {
  const { t } = useI18n();

  return (
    <>
      <a
        href="#main-content"
        className="fixed start-4 top-2 z-50 -translate-y-20 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition-transform focus:translate-y-0"
      >
        {t("a11y.skipToContent")}
      </a>
      <AppHeader />
      <div className="mx-auto w-full max-w-6xl px-4 pt-3 sm:px-5">
        <MedicalDisclaimer
          text={t("medical.globalDisclaimer")}
          className="border border-primary/10 bg-primary-soft/40"
        />
      </div>
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-6xl px-4 pt-5 pb-32 sm:px-5 sm:pt-6 md:pb-16">
        <Outlet />
        <footer className="mt-8 border-t border-border/70 pt-5 text-center text-[11px] leading-5 text-muted-foreground">
          {t("medical.footerDisclaimer")}
        </footer>
      </main>
      <MobileBottomNav />
      <PwaStatus />
    </>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AppChrome />
      </I18nProvider>
    </QueryClientProvider>
  );
}
