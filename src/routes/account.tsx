import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookHeart,
  ChevronLeft,
  HeartHandshake,
  History,
  LogOut,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, LoadingState } from "@/components/health/cards";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/account")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "حسابي — مؤشر صحي" },
      { name: "description", content: "إدارة حسابك وسجل الفحوصات." },
      { property: "og:title", content: "حسابي — مؤشر صحي" },
      { property: "og:description", content: "حسابك الشخصي في مؤشر صحي." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Account,
});

function Account() {
  const { user, loading } = useAuth();
  const { t, lang, dir } = useI18n();
  const qc = useQueryClient();
  const nav = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (
        await supabase
          .from("profiles")
          .select("display_name, preferred_language, country_code")
          .eq("id", user!.id)
          .maybeSingle()
      ).data,
  });

  if (loading) return <LoadingState />;

  if (!user) {
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader title={t("account.title")} />
        <div className="glass rounded-3xl p-8 text-center">
          <UserRound className="mx-auto size-12 text-primary" />
          <p className="mt-4 text-sm leading-6 text-muted-foreground">{t("account.guestHint")}</p>
          <Link
            to="/auth"
            className="mt-5 inline-block rounded-xl bg-gradient-primary px-6 py-3 font-semibold text-primary-foreground shadow-glow"
          >
            {t("account.loginCreate")}
          </Link>
        </div>
      </div>
    );
  }

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/", replace: true });
  };

  const languageLabel =
    profile?.preferred_language === "ar"
      ? t("lang.ar")
      : profile?.preferred_language === "en"
        ? t("lang.en")
        : profile?.preferred_language ?? "—";

  const countryLabel =
    profile?.country_code === "SA"
      ? lang === "ar"
        ? "المملكة العربية السعودية"
        : "Saudi Arabia"
      : profile?.country_code ?? "—";

  const displayName = profile?.display_name?.trim() || user.email || t("account.title");

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title={t("account.title")} />

      <section className="glass rounded-3xl p-5 md:p-6">
        <div className="flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
            <UserRound className="size-7" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-extrabold">{displayName}</h2>
            <p className="truncate text-sm text-muted-foreground">{user.email ?? "—"}</p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-primary-soft/60 p-4">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-xs leading-5 text-muted-foreground">{t("account.privacyHint")}</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-extrabold">{t("account.quickActions")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            to="/history"
            icon={History}
            label={t("account.history")}
            dir={dir}
          />
          <QuickAction
            to="/symptom-checker"
            icon={Stethoscope}
            label={t("account.startCheck")}
            dir={dir}
          />
          <QuickAction
            to="/first-aid"
            icon={HeartHandshake}
            label={t("account.firstAid")}
            dir={dir}
          />
          <QuickAction
            to="/journal"
            icon={BookHeart}
            label={t("nav.journal")}
            dir={dir}
          />
        </div>
      </section>

      <section className="glass rounded-3xl p-5 md:p-6">
        <h2 className="font-extrabold">{t("account.profileSummary")}</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <Row k={t("account.name")} v={profile?.display_name ?? "—"} />
          <Row k={t("account.email")} v={user.email ?? "—"} />
          <Row k={t("account.language")} v={languageLabel} />
          <Row k={t("account.country")} v={countryLabel} />
        </dl>
      </section>

      <button
        type="button"
        onClick={signOut}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-card py-3 text-sm font-semibold text-destructive ring-1 ring-border"
      >
        <LogOut className="size-4" />
        {t("account.logout")}
      </button>
    </div>
  );
}

function QuickAction({
  to,
  icon: Icon,
  label,
  dir,
}: {
  to: "/history" | "/symptom-checker" | "/first-aid" | "/journal";
  icon: typeof History;
  label: string;
  dir: "rtl" | "ltr";
}) {
  return (
    <Link
      to={to}
      className="glass group flex min-h-32 flex-col justify-between rounded-3xl p-4 transition hover:-translate-y-0.5"
    >
      <span className="grid size-10 place-items-center rounded-2xl bg-primary-soft text-primary">
        <Icon className="size-5" />
      </span>
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-sm font-bold">{label}</span>
        <ChevronLeft
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5",
            dir === "ltr" && "rotate-180 group-hover:translate-x-0.5",
          )}
        />
      </div>
    </Link>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/70 pb-3 last:border-0 last:pb-0">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-end font-medium">{v}</dd>
    </div>
  );
}
