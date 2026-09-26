import { Link } from "@tanstack/react-router";
import { icons, ChevronLeft, AlertTriangle, Phone } from "lucide-react";
import type { FirstAidTopic, PossibleConditionResult } from "@/types/medical";
import { CompatibilityBadge } from "./badges";
import { appConfig } from "@/config/app";
import { cn } from "@/lib/utils";

export function FirstAidCard({ topic }: { topic: FirstAidTopic }) {
  const Icon = icons[topic.icon as keyof typeof icons] ?? icons.Cross;
  return (
    <div className="glass flex flex-col rounded-3xl p-5 transition-transform hover:-translate-y-0.5">
      <span className="grid size-12 place-items-center rounded-2xl bg-destructive-soft text-destructive">
        <Icon className="size-6" strokeWidth={1.9} />
      </span>
      <h3 className="mt-4 text-base font-bold">{topic.title}</h3>
      <p className="mt-1 flex-1 text-sm text-muted-foreground">{topic.summary}</p>
      <Link to="/first-aid/$slug" params={{ slug: topic.slug }}
        className="mt-4 inline-flex items-center justify-between rounded-xl bg-card px-4 py-2.5 text-sm font-semibold text-destructive ring-1 ring-border hover:bg-destructive-soft">
        ماذا أفعل؟ <ChevronLeft className="size-4" />
      </Link>
    </div>
  );
}

export function ResultCard({ result }: { result: PossibleConditionResult }) {
  const { condition: c } = result;
  return (
    <article className="glass rounded-3xl p-5 animate-rise">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold">{c.name}</h3>
        <CompatibilityBadge level={result.compatibility} />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{result.reason}</p>
      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">الأعراض المتوافقة</p>
        <div className="flex flex-wrap gap-1.5">
          {result.matchedSymptoms.map((s) => <span key={s} className="rounded-full bg-primary-soft px-3 py-1 text-xs text-primary">{s}</span>)}
        </div>
      </div>
      <dl className="mt-4 space-y-3 text-sm">
        <div><dt className="font-semibold">لماذا ظهرت هذه النتيجة؟</dt><dd className="text-muted-foreground">{c.summary}</dd></div>
        <div><dt className="font-semibold">متى تحتاج إلى مراجعة الطبيب؟</dt><dd className="text-muted-foreground">{c.whenToSeeDoctor}</dd></div>
        <div><dt className="font-semibold">التخصص المناسب</dt><dd className="text-muted-foreground">{c.specialty}</dd></div>
      </dl>
      <button type="button" className="mt-5 w-full rounded-xl bg-card py-2.5 text-sm font-semibold text-primary ring-1 ring-border hover:bg-primary-soft">
        عرض التفاصيل
      </button>
    </article>
  );
}

export function EmergencyAlert({ className }: { className?: string }) {
  const { ambulance } = appConfig.emergency;
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl bg-destructive-soft p-4 text-sm", className)}>
      <AlertTriangle className="size-5 shrink-0 text-destructive" />
      <p className="flex-1">في حالة الخطر اتصل فورًا بـ{ambulance.label}.</p>
      <a href={`tel:${ambulance.number}`} className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-3 py-1.5 font-semibold text-destructive-foreground">
        <Phone className="size-3.5" /> {ambulance.number}
      </a>
    </div>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 animate-rise">
      <h1 className="text-2xl font-extrabold md:text-3xl">{title}</h1>
      {subtitle && <p className="mt-2 text-sm text-muted-foreground md:text-base">{subtitle}</p>}
      {children}
    </div>
  );
}
