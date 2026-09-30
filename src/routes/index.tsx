import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  History,
  ShieldCheck,
  Siren,
  Stethoscope,
} from "lucide-react";
import { MedicalDisclaimer } from "@/components/health/MedicalDisclaimer";
import { ProfessionalBadge } from "@/components/health/badges";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import homeHero from "@/assets/health-home-hero.jpg";
import symptomSticker from "@/assets/sticker-symptom-check.png";
import firstAidSticker from "@/assets/sticker-first-aid.png";
import librarySticker from "@/assets/sticker-health-library.png";
import safeCareSticker from "@/assets/sticker-safe-care.png";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "مؤشر صحي — افهم أعراضك واتخذ الخطوة المناسبة" },
      { name: "description", content: "مساعد صحي عربي لفحص الأعراض والطوارئ والإسعافات الأولية والمعلومات الصحية." },
      { property: "og:title", content: "مؤشر صحي — افهم أعراضك" },
      { property: "og:description", content: "فحص أعراض استرشادي، مسار طوارئ، إسعافات أولية ومعلومات صحية مبسطة." },
    ],
  }),
  component: Home,
});

const primaryEntries = [
  {
    to: "/symptom-checker",
    icon: Stethoscope,
    title: "home.entry.symptoms.title",
    desc: "home.entry.symptoms.desc",
    action: "home.entry.symptoms.action",
    iconClass: "bg-primary-soft text-primary",
    cardClass: "hover:ring-primary/30",
    sticker: symptomSticker,
  },
  {
    to: "/emergency",
    icon: Siren,
    title: "home.entry.emergency.title",
    desc: "home.entry.emergency.desc",
    action: "home.entry.emergency.action",
    iconClass: "bg-destructive-soft text-destructive",
    cardClass: "ring-destructive/20 hover:ring-destructive/40",
    sticker: safeCareSticker,
  },
  {
    to: "/library",
    icon: BookOpen,
    title: "home.entry.info.title",
    desc: "home.entry.info.desc",
    action: "home.entry.info.action",
    iconClass: "bg-accent/10 text-accent",
    cardClass: "hover:ring-accent/30",
    sticker: librarySticker,
  },
] as const;

function Home() {
  const { t, dir } = useI18n();

  return (
    <div className="space-y-6">
      <section className="glass relative min-h-[34rem] overflow-hidden rounded-[2rem] animate-rise sm:min-h-[31rem] md:min-h-[34rem]">
        <img src={homeHero} alt="استخدام مؤشر صحي بهدوء في المنزل" width={1600} height={1104} fetchPriority="high" className="absolute inset-0 size-full object-cover object-left" />
        <div className="absolute inset-0 bg-gradient-to-l from-background via-background/90 to-background/10" />
        <div className="relative z-10 flex min-h-[34rem] max-w-3xl flex-col justify-center p-6 sm:min-h-[31rem] sm:p-9 md:min-h-[34rem] md:p-12">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
          <ShieldCheck className="size-3.5" /> {t("home.safeInfo")}
        </span>
        <h1 className="mt-4 max-w-2xl text-3xl leading-tight font-extrabold text-balance md:text-5xl">
          {t("home.heroTitle")}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
          {t("home.heroDescription")}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/symptom-checker"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-6 py-3.5 font-semibold text-primary-foreground shadow-glow"
          >
            {t("home.startCheck")} <ArrowLeft className={cn("size-4", dir === "ltr" && "rotate-180")} />
          </Link>
          <Link
            to="/emergency"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-destructive px-6 py-3.5 font-semibold text-destructive-foreground shadow-danger"
          >
            <Siren className="size-4" /> {t("home.entry.emergency.action")}
          </Link>
        </div>
        <MedicalDisclaimer className="mt-6 max-w-2xl" />
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-xl font-extrabold">{t("home.choosePath")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("home.choosePathHint")}</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {primaryEntries.map(({ to, icon: Icon, title, desc, action, iconClass, cardClass, sticker }, index) => (
            <Link
              key={title}
              to={to}
              style={{ animationDelay: `${index * 70}ms` }}
              className={cn(
                "glass group relative flex min-h-60 flex-col overflow-hidden rounded-3xl p-5 ring-1 ring-border transition hover:-translate-y-0.5 hover:shadow-lg animate-rise md:p-6",
                cardClass,
              )}
            >
              <span className={cn("grid size-12 place-items-center rounded-2xl", iconClass)}>
                <Icon className="size-6" strokeWidth={1.9} />
              </span>
              <img src={sticker} alt="" width={816} height={816} loading="lazy" className="pointer-events-none absolute end-3 top-3 size-20 object-contain opacity-80 transition-transform group-hover:scale-105" />
              <h3 className="mt-5 text-lg font-extrabold">{t(title)}</h3>
              <p className="mt-2 flex-1 text-sm leading-7 text-muted-foreground">{t(desc)}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary">
                {t(action)}
                <ArrowLeft className={cn("size-4 transition-transform group-hover:-translate-x-0.5", dir === "ltr" && "rotate-180 group-hover:translate-x-0.5")} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-extrabold">{t("home.quickTitle")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link to="/first-aid" className="glass flex items-center gap-4 rounded-3xl p-4 transition hover:-translate-y-0.5">
            <img src={firstAidSticker} alt="" width={816} height={816} loading="lazy" className="size-16 shrink-0 object-contain" />
            <div className="min-w-0">
              <h3 className="font-bold">{t("home.quickFirstAid")}</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("home.quickFirstAidDesc")}</p>
            </div>
          </Link>
          <Link to="/history" className="glass flex items-center gap-4 rounded-3xl p-4 transition hover:-translate-y-0.5">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
              <History className="size-5" />
            </span>
            <div className="min-w-0">
              <h3 className="font-bold">{t("home.quickHistory")}</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("home.quickHistoryDesc")}</p>
            </div>
          </Link>
        </div>
      </section>

      <Link
        to="/professional"
        className="glass flex items-center justify-between gap-4 rounded-3xl border border-primary/10 p-5 transition hover:-translate-y-0.5 hover:border-primary/30"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-extrabold">{t("home.professionalQuestion")}</h2>
            <ProfessionalBadge />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t("home.professionalHint")}</p>
          <p className="mt-3 text-sm font-bold text-primary">{t("home.professionalAction")}</p>
        </div>
        <ChevronLeft className={cn("size-5 shrink-0 text-muted-foreground", dir === "ltr" && "rotate-180")} />
      </Link>
    </div>
  );
}
