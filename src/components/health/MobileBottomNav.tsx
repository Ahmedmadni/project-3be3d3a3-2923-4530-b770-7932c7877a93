import { Link } from "@tanstack/react-router";
import { mobileNavItems } from "./nav-items";
import { useI18n } from "@/i18n";

export function MobileBottomNav() {
  const { t } = useI18n();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 px-3 md:hidden"
      aria-label={t("nav.main")}
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="glass mx-auto grid max-w-md grid-cols-5 rounded-3xl px-1.5 py-1.5">
        {mobileNavItems.map(({ to, labelKey, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className="group flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-muted-foreground transition-colors"
            activeProps={{
              className: "bg-primary-soft !text-primary",
              "aria-current": "page",
            }}
          >
            <Icon className="size-5" strokeWidth={1.9} />
            <span className="max-w-full truncate text-[10.5px] font-medium">{t(labelKey)}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
