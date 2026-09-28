import { Link } from "@tanstack/react-router";
import { Activity, Languages, ShieldCheck } from "lucide-react";
import { navItems } from "./nav-items";
import { EmergencyButton } from "./EmergencyButton";
import { useI18n } from "@/i18n";
import { useAdminAccess } from "@/hooks/use-admin-access";

export function AppHeader() {
  const { lang, setLang, t } = useI18n();
  const admin = useAdminAccess();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-glass backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-5">
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
            <Activity className="size-5" strokeWidth={2.2} />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-display text-base font-extrabold">{t("app.name")}</span>
            <span className="hidden truncate text-[11px] text-muted-foreground sm:block">{t("app.tagline")}</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label={t("nav.main")}>
          {navItems.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="rounded-xl px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary"
              activeProps={{ className: "bg-primary-soft !text-primary" }}
            >
              {t(n.labelKey)}
            </Link>
          ))}
          {admin.isStaff ? (
            <Link to="/admin" className="inline-flex items-center gap-1 rounded-xl px-3.5 py-2 text-sm font-medium text-muted-foreground hover:bg-primary-soft hover:text-primary">
              <ShieldCheck className="size-4" /> {t("nav.admin")}
            </Link>
          ) : null}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="inline-flex size-10 items-center justify-center rounded-xl bg-card text-muted-foreground ring-1 ring-border hover:text-primary"
            aria-label={t("lang.switch")}
            title={lang === "ar" ? "English" : "العربية"}
          >
            <Languages className="size-4" />
          </button>
          <EmergencyButton compact />
        </div>
      </div>
    </header>
  );
}
