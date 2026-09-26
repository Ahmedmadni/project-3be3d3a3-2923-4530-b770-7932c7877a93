import { Link } from "@tanstack/react-router";
import { icons, ChevronLeft, AlertTriangle, Phone } from "lucide-react";
import type { Condition, FirstAidTopic, PossibleConditionResult, Symptom } from "@/types/medical";
import { CompatibilityBadge } from "./badges";
import { appConfig } from "@/config/app";
import { ResultExplanationService } from "@/engines/result-explanation";
import { cn } from "@/lib/utils";

export function FirstAidCard({ topic }: { topic: FirstAidTopic }) {
  const Icon = icons[(topic.icon ?? "Cross") as keyof typeof icons] ?? icons.Cross;
  return (
    <div className="glass flex flex-col rounded-3xl p-5 transition-transform hover:-translate-y-0.5">
      <span className="grid size-12 place-items-center rounded-2xl bg-destructive-soft text-destructive">
        <Icon className="size-6" strokeWidth={1.9} />
      </span>
      <h3 className="mt-4 text-base font-bold">{topic.title_ar}</h3>
      <p className="mt-1 flex-1 text-sm text-muted-foreground">{topic.summary_ar}</p>
      <Link to="/first-aid/$slug" params={{ slug: topic.code }}
        className="mt-4 inline-flex items-center justify-between rounded-xl bg-card px-4 py-2.5 text-sm font-semibold text-destructive ring-1 ring-border hover:bg-destructive-soft">
        ماذا أفعل؟ <ChevronLeft className="size-4" />
      </Link>
    </div>
  );
}

export function ResultCard({ result, condition, symptoms }: { result: PossibleConditionResult; condition: Condition; symptoms: Symptom[] }) {
  const name = (id: string) => symptoms.find((s) => s.id === id)?.name_ar ?? "";
  const why = ResultExplanationService.explain(result, symptoms);
  return (
    <article className="glass rounded-3xl p-5 animate-rise">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold">{condition.name_ar}</h3>
        <CompatibilityBadge level={result.compatibilityLevel} />
      </div>
      {condition.is_demo && <span className="mt-2 inline-block rounded-full bg-warning-soft px-2.5 py-0.5 text-[11px] font-semibold text-warning">بيانات تجريبية — غير معتمدة طبيًا</span>}
      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">الأعراض المتوافقة</p>
        <div className="flex flex-wrap gap-1.5">
          {result.matchedSymptoms.map((s) => <span key={s} className="rounded-full bg-primary-soft px-3 py-1 text-xs text-primary">{name(s)}</span>)}
        </div>
      </div>
      <dl className="mt-4 space-y-3 text-sm">
        <div><dt className="font-semibold">لماذا ظهرت هذه النتيجة؟</dt>{why.map((w) => <dd key={w} className="text-muted-foreground">{w}</dd>)}</div>
        {condition.when_to_seek_care_ar && <div><dt className="font-semibold">متى تحتاج إلى مراجعة الطبيب؟</dt><dd className="text-muted-foreground">{condition.when_to_seek_care_ar}</dd></div>}
        {condition.specialty && <div><dt className="font-semibold">التخصص المناسب</dt><dd className="text-muted-foreground">{condition.specialty}</dd></div>}
      </dl>
      <Link to="/conditions/$conditionId" params={{ conditionId: condition.id }} className="mt-5 block w-full rounded-xl bg-card py-2.5 text-center text-sm font-semibold text-primary ring-1 ring-border hover:bg-primary-soft">
        عرض التفاصيل
      </Link>
    </article>
  );
}

export function EmergencyAlert({ className, number = appConfig.emergencyFallback.ambulance.number }: { className?: string; number?: string }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl bg-destructive-soft p-4 text-sm", className)}>
      <AlertTriangle className="size-5 shrink-0 text-destructive" />
      <p className="flex-1">في حالة الخطر اتصل فورًا بالإسعاف.</p>
      <a href={`tel:${number}`} className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-3 py-1.5 font-semibold text-destructive-foreground">
        <Phone className="size-3.5" /> {number}
      </a>
    </div>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string | undefined; children?: React.ReactNode }) {
  return (
    <div className="mb-6 animate-rise">
      <h1 className="text-2xl font-extrabold md:text-3xl">{title}</h1>
      {subtitle && <p className="mt-2 text-sm text-muted-foreground md:text-base">{subtitle}</p>}
      {children}
    </div>
  );
}

export function LoadingState() {
  return <div className="glass animate-pulse rounded-3xl p-8 text-center text-sm text-muted-foreground">جارٍ التحميل...</div>;
}
export function ErrorState({ text = "تعذر تحميل البيانات. حاول مرة أخرى." }: { text?: string }) {
  return <div className="rounded-3xl bg-destructive-soft p-6 text-center text-sm text-destructive">{text}</div>;
}
