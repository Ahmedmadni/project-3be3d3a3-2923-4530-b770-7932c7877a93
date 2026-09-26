import { Link } from "@tanstack/react-router";
import { Activity } from "lucide-react";
import { appConfig } from "@/config/app";
import { navItems } from "./nav-items";
import { EmergencyButton } from "./EmergencyButton";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-glass backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
            <Activity className="size-5" strokeWidth={2.2} />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-base font-extrabold">{appConfig.name}</span>
            <span className="block text-[11px] text-muted-foreground">مساعدك الصحي الاسترشادي</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="التنقل الرئيسي">
          {navItems.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="rounded-xl px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary"
              activeProps={{ className: "bg-primary-soft !text-primary" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <EmergencyButton compact />
      </div>
    </header>
  );
}
