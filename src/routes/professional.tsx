import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  HeartHandshake,
  Siren,
  Stethoscope,
} from "lucide-react";
import { PageHeader } from "@/components/health/cards";
import { ProfessionalBadge } from "@/components/health/badges";
import { MedicalDisclaimer } from "@/components/health/MedicalDisclaimer";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/professional")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "الوضع المهني — مؤشر صحي" },
      { name: "description", content: "واجهة عملية للأطباء والتمريض والممارسين الصحيين." },
      { property: "og:title", content: "الوضع المهني — مؤشر صحي" },
      { property: "og:description", content: "أدوات عملية لتنظيم التقييم السريع والوصول للمراجع." },
    ],
  }),
  component: Professional,
});

const tools = [
  {
    to: "/emergency",
    icon: Siren,
    title: "professional.tool.emergency.title",
    desc: "professional.tool.emergency.desc",
    tone: "bg-destructive-soft text-destructive",
  },
  {
    to: "/symptom-checker",
    icon: Stethoscope,
    title: "professional.tool.assessment.title",
    desc: "professional.tool.assessment.desc",
    tone: "bg-primary-soft text-primary",
  },
  {
    to: "/first-aid",
    icon: HeartHandshake,
    title: "professional.tool.firstAid.title",
    desc: "professional.tool.firstAid.desc",
    tone: "bg-warning-soft text-warning",
  },
  {
    to: "/library",
    icon: BookOpen,
    title: "professional.tool.library.title",
    desc: "professional.tool.library.desc",
    tone: "bg-accent/10 text-accent",
  },
] as const;

function Professional() {
  const { t, dir } = useI18n();

  return (
    <div className="space-y-6">
      <PageHeader title={t("professional.title")} subtitle={t("professional.subtitle")}>
        <div className="mt-3"><ProfessionalBadge /></div>
      </PageHeader>

      <MedicalDisclaimer text={t("medical.professionalDisclaimer")} />

      <section className="glass rounded-3xl p-5 md:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
            <AlertTriangle className="size-5" />
          </span>
          <div>
            <h2 className="font-extrabold">{t("professional.practicalTitle")}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("professional.practicalHint")}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {tools.map(({ to, icon: Icon, title, desc, tone }) => (
          <Link
            key={title}
            to={to}
            className="glass group flex min-h-48 flex-col rounded-3xl p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <span className={cn("grid size-11 place-items-center rounded-2xl", tone)}>
              <Icon className="size-5" />
            </span>
            <h3 className="mt-4 font-extrabold">{t(title)}</h3>
            <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{t(desc)}</p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary">
              {t("professional.open")}
              <ArrowLeft className={cn("size-4", dir === "ltr" && "rotate-180")} />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
