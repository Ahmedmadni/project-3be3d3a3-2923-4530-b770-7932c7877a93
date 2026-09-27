import { Link } from "@tanstack/react-router";
import { navItems } from "./nav-items";
import { useI18n } from "@/i18n";

export function MobileBottomNav() {
  const { t } = useI18n();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 px-3 pb-3 md:hidden" aria-label={t("nav.main")}>
      <div className="glass mx-auto flex max-w-md items-stretch justify-between rounded-3xl px-1.5 py-1.5">
        {navItems.map(({ to, labelKey, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className="group flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-muted-foreground transition-colors"
            activeProps={{ className: "bg-primary-soft !text-primary" }}
          >
            <Icon className="size-5" strokeWidth={1.9} />
            <span className="text-[10.5px] font-medium">{t(labelKey)}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
