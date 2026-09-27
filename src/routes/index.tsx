import { createFileRoute, Link } from "@tanstack/react-router";
import { Stethoscope, Cross, Hospital, BookOpen, ArrowLeft, ShieldCheck, ChevronLeft } from "lucide-react";
import { MedicalDisclaimer } from "@/components/health/MedicalDisclaimer";
import { ProfessionalBadge } from "@/components/health/badges";
import { useI18n, type TKey } from "@/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "مؤشر صحي — افهم أعراضك واتخذ الخطوة المناسبة" },
      { name: "description", content: "مساعد صحي لفحص الأعراض والإسعافات الأولية ومعرفة مستوى الرعاية المناسب." },
    ],
  }),
  component: Home,
});

const features = [
  { to: "/symptom-checker", icon: Stethoscope, title: "home.feature.symptom.title", desc: "home.feature.symptom.desc", tone: "bg-primary-soft text-primary" },
  { to: "/first-aid", icon: Cross, title: "home.feature.firstAid.title", desc: "home.feature.firstAid.desc", tone: "bg-destructive-soft text-destructive" },
  { to: "/symptom-checker", icon: Hospital, title: "home.feature.doctor.title", desc: "home.feature.doctor.desc", tone: "bg-primary-soft text-accent" },
  { to: "/library", icon: BookOpen, title: "home.feature.library.title", desc: "home.feature.library.desc", tone: "bg-primary-soft text-primary" },
] as const satisfies readonly { to: string; icon: typeof Stethoscope; title: TKey; desc: TKey; tone: string }[];

function Home() {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <section className="glass relative overflow-hidden rounded-[2rem] p-6 md:p-12 animate-rise">
        <div className="pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-primary/20 blur-3xl" />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
          <ShieldCheck className="size-3.5" /> {t("home.safe")}
        </span>
        <h1 className="mt-4 max-w-2xl text-3xl leading-tight font-extrabold text-balance md:text-5xl">{t("home.title")}</h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">{t("home.desc")}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link to="/symptom-checker" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-6 py-3.5 font-semibold text-primary-foreground shadow-glow">
            {t("home.start")} <ArrowLeft className="size-4 rtl:rotate-0 ltr:rotate-180" />
          </Link>
          <Link to="/first-aid" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-card px-6 py-3.5 font-semibold ring-1 ring-border hover:bg-destructive-soft">
            <Cross className="size-4 text-destructive" /> {t("home.feature.firstAid.title")}
          </Link>
        </div>
        <MedicalDisclaimer className="mt-6 max-w-xl" />
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {features.map(({ to, icon: Icon, title, desc, tone }, i) => (
          <Link key={title} to={to} style={{ animationDelay: `${i * 60}ms` }}
            className="glass group rounded-3xl p-4 transition-transform hover:-translate-y-0.5 animate-rise md:p-5">
            <span className={`grid size-12 place-items-center rounded-2xl ${tone}`}><Icon className="size-6" strokeWidth={1.9} /></span>
            <h2 className="mt-4 text-sm font-bold md:text-base">{t(title)}</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground md:text-sm">{t(desc)}</p>
          </Link>
        ))}
      </section>

      <Link to="/professional" className="glass flex items-center justify-between gap-4 rounded-3xl p-5">
        <div>
          <div className="flex items-center gap-2"><h2 className="font-bold">{t("home.professional.title")}</h2><ProfessionalBadge /></div>
          <p className="mt-1 text-sm text-muted-foreground">{t("home.professional.desc")}</p>
        </div>
        <ChevronLeft className="size-5 text-muted-foreground rtl:rotate-0 ltr:rotate-180" />
      </Link>
    </div>
  );
}
