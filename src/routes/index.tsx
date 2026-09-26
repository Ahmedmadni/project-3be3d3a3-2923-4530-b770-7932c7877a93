import { createFileRoute, Link } from "@tanstack/react-router";
import { Stethoscope, Cross, Hospital, BookOpen, ArrowLeft, ShieldCheck, ChevronLeft } from "lucide-react";
import { MedicalDisclaimer } from "@/components/health/MedicalDisclaimer";
import { ProfessionalBadge } from "@/components/health/badges";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "مؤشر صحي — افهم أعراضك واتخذ الخطوة المناسبة" },
      { name: "description", content: "مساعد صحي عربي لفحص الأعراض والإسعافات الأولية ومعرفة مستوى الرعاية المناسب." },
      { property: "og:title", content: "مؤشر صحي — افهم أعراضك" },
      { property: "og:description", content: "فحص أعراض استرشادي، إسعافات أولية، ومكتبة صحية مبسطة." },
    ],
  }),
  component: Home,
});

const features = [
  { to: "/symptom-checker", icon: Stethoscope, title: "فحص الأعراض", desc: "أدخل أعراضك واحصل على حالات محتملة مرتبطة بها.", tone: "bg-primary-soft text-primary" },
  { to: "/first-aid", icon: Cross, title: "الإسعافات الأولية", desc: "تعرف على الخطوات الأولية للتعامل مع الحالات الشائعة.", tone: "bg-destructive-soft text-destructive" },
  { to: "/symptom-checker", icon: Hospital, title: "متى أحتاج طبيبًا؟", desc: "ساعدني في تحديد مستوى الرعاية المناسب.", tone: "bg-primary-soft text-accent" },
  { to: "/library", icon: BookOpen, title: "معلومات صحية", desc: "مكتبة مبسطة لفهم الأمراض والأعراض.", tone: "bg-primary-soft text-primary" },
] as const;

function Home() {
  return (
    <div className="space-y-6">
      <section className="glass relative overflow-hidden rounded-[2rem] p-6 md:p-12 animate-rise">
        <div className="pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-primary/20 blur-3xl" />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
          <ShieldCheck className="size-3.5" /> معلومات استرشادية آمنة
        </span>
        <h1 className="mt-4 max-w-2xl text-3xl leading-tight font-extrabold text-balance md:text-5xl">
          افهم أعراضك واتخذ الخطوة المناسبة
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
          أجب عن بعض الأسئلة حول الأعراض التي تشعر بها للحصول على معلومات استرشادية تساعدك على معرفة الخطوة المناسبة للحصول على الرعاية.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link to="/symptom-checker" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-6 py-3.5 font-semibold text-primary-foreground shadow-glow">
            ابدأ فحص الأعراض <ArrowLeft className="size-4" />
          </Link>
          <Link to="/first-aid" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-card px-6 py-3.5 font-semibold ring-1 ring-border hover:bg-destructive-soft">
            <Cross className="size-4 text-destructive" /> الإسعافات الأولية
          </Link>
        </div>
        <MedicalDisclaimer className="mt-6 max-w-xl" />
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {features.map(({ to, icon: Icon, title, desc, tone }, i) => (
          <Link key={title} to={to} style={{ animationDelay: `${i * 60}ms` }}
            className="glass group rounded-3xl p-4 transition-transform hover:-translate-y-0.5 animate-rise md:p-5">
            <span className={`grid size-12 place-items-center rounded-2xl ${tone}`}>
              <Icon className="size-6" strokeWidth={1.9} />
            </span>
            <h2 className="mt-4 text-sm font-bold md:text-base">{title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground md:text-sm">{desc}</p>
          </Link>
        ))}
      </section>

      <Link to="/professional" className="glass flex items-center justify-between gap-4 rounded-3xl p-5">
        <div>
          <div className="flex items-center gap-2"><h2 className="font-bold">الوضع المهني</h2><ProfessionalBadge /></div>
          <p className="mt-1 text-sm text-muted-foreground">للأطباء والتمريض والمتخصصين الصحيين</p>
        </div>
        <ChevronLeft className="size-5 text-muted-foreground" />
      </Link>
    </div>
  );
}
