import { Link } from "@tanstack/react-router";
import { Activity, BookOpenCheck, FileQuestion, FlagTriangleRight, HeartPulse, LayoutDashboard, Network, ShieldCheck, Stethoscope, UsersRound, Wrench } from "lucide-react";
import type { ReactNode } from "react";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { useI18n } from "@/i18n";

const links = [
  { to: "/admin", key: "admin.home", icon: LayoutDashboard, exact: true },
  { to: "/admin/symptoms", key: "admin.symptoms", icon: Activity },
  { to: "/admin/conditions", key: "admin.conditions", icon: Stethoscope },
  { to: "/admin/questions", key: "admin.questions", icon: FileQuestion },
  { to: "/admin/red-flags", key: "admin.redFlags", icon: FlagTriangleRight },
  { to: "/admin/first-aid", key: "admin.firstAid", icon: HeartPulse },
  { to: "/admin/sources", key: "admin.sources", icon: BookOpenCheck },
  { to: "/admin/external-sources", key: "admin.externalSources", icon: Network },
  { to: "/admin/users", key: "admin.users", icon: UsersRound },
  { to: "/admin/releases", key: "admin.releases", icon: Wrench },
] as const;

export function AdminGate({ children }: { children: ReactNode }) {
  const access = useAdminAccess();
  const { t } = useI18n();
  if (access.loading) return <div className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">{t("common.loading")}</div>;
  if (!access.user || !access.isStaff) {
    return (
      <div className="glass mx-auto max-w-xl rounded-3xl p-8 text-center">
        <ShieldCheck className="mx-auto size-10 text-muted-foreground" />
        <h1 className="mt-4 text-xl font-bold">{t("admin.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("admin.denied")}</p>
      </div>
    );
  }
  return <>{children}</>;
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <AdminGate>
      <div className="space-y-5">
        <div className="rounded-3xl bg-warning-soft p-4 text-sm font-semibold text-warning">{t("admin.demoBanner")}</div>
        <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="glass h-fit rounded-3xl p-3">
            <h1 className="px-3 py-2 text-lg font-extrabold">{t("admin.title")}</h1>
            <nav className="mt-2 grid gap-1">
              {links.map(({ to, key, icon: Icon, ...rest }) => { const exact = "exact" in rest ? rest.exact : false; return (
                <Link
                  key={to}
                  to={to}
                  activeOptions={{ exact: !!exact }}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-primary-soft hover:text-primary"
                  activeProps={{ className: "bg-primary-soft !text-primary" }}
                >
                  <Icon className="size-4" /> {t(key)}
                </Link>
              ))}
            </nav>
          </aside>
          <section className="min-w-0">{children}</section>
        </div>
      </div>
    </AdminGate>
  );
}
