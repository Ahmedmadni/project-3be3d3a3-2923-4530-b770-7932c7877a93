import { Link } from "@tanstack/react-router";
import { icons, ChevronLeft, AlertTriangle, Phone } from "lucide-react";
import type { Condition, FirstAidTopic, PossibleConditionResult, Symptom } from "@/types/medical";
import { CompatibilityBadge } from "./badges";
import { appConfig } from "@/config/app";
import { ResultExplanationService } from "@/engines/result-explanation";
import { cn } from "@/lib/utils";
import { localized, useI18n } from "@/i18n";

export function FirstAidCard({ topic }: { topic: FirstAidTopic }) {
  const { lang, t } = useI18n();
  const Icon = icons[(topic.icon ?? "Cross") as keyof typeof icons] ?? icons.Cross;
  const title = localized(topic as unknown as Record<string, unknown>, "title", lang) ?? t("common.notTranslated");
  const summary = localized(topic as unknown as Record<string, unknown>, "summary", lang);
  return (
    <div className="glass flex flex-col rounded-3xl p-5 transition-transform hover:-translate-y-0.5">
      <span className="grid size-12 place-items-center rounded-2xl bg-destructive-soft text-destructive">
        <Icon className="size-6" strokeWidth={1.9} />
      </span>
      <h3 className="mt-4 text-base font-bold">{title}</h3>
      <p className="mt-1 flex-1 text-sm text-muted-foreground">{summary ?? t("common.notTranslated")}</p>
      <Link
        to="/first-aid/$slug"
        params={{ slug: topic.code }}
        className="mt-4 inline-flex items-center justify-between rounded-xl bg-card px-4 py-2.5 text-sm font-semibold text-destructive ring-1 ring-border hover:bg-destructive-soft"
      >
        {t("firstAid.action")} <ChevronLeft className={cn("size-4", lang === "en" && "rotate-180")} />
      </Link>
    </div>
  );
}

export function ResultCard({ result, condition, symptoms }: { result: PossibleConditionResult; condition: Condition; symptoms: Symptom[] }) {
  const { lang, t } = useI18n();
  const name = (id: string) => {
    const symptom = symptoms.find((s) => s.id === id);
    if (!symptom) return "";
    return localized(symptom as unknown as Record<string, unknown>, "name", lang) ?? t("common.notTranslated");
  };
  const conditionName = localized(condition as unknown as Record<string, unknown>, "name", lang) ?? t("common.notTranslated");
  const why = ResultExplanationService.explain(result, symptoms, lang);
  const seekCare = lang === "ar" ? condition.when_to_seek_care_ar : null;

  return (
    <article className="glass rounded-3xl p-5 animate-rise">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold">{conditionName}</h3>
        <CompatibilityBadge level={result.compatibilityLevel} />
      </div>
      {condition.is_demo && (
        <span className="mt-2 inline-block rounded-full bg-warning-soft px-2.5 py-0.5 text-[11px] font-semibold text-warning">
          {t("results.demo")}
        </span>
      )}
      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">{t("results.matched")}</p>
        <div className="flex flex-wrap gap-1.5">
          {result.matchedSymptoms.map((s) => (
            <span key={s} className="rounded-full bg-primary-soft px-3 py-1 text-xs text-primary">{name(s)}</span>
          ))}
        </div>
      </div>
      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="font-semibold">{t("results.why")}</dt>
          {why.map((w) => <dd key={w} className="text-muted-foreground">{w}</dd>)}
        </div>
        {result.contradictingSymptoms.length ? (
          <div>
            <dt className="font-semibold">{t("results.partial")}</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {result.contradictingSymptoms.map((s) => (
                <span key={s} className="rounded-full bg-warning-soft px-3 py-1 text-xs text-warning">{name(s)}</span>
              ))}
            </dd>
          </div>
        ) : null}
        {seekCare ? (
          <div>
            <dt className="font-semibold">{t("results.seekCare")}</dt>
            <dd className="text-muted-foreground">{seekCare}</dd>
          </div>
        ) : null}
        {condition.specialty ? (
          <div>
            <dt className="font-semibold">{t("results.specialty")}</dt>
            <dd className="text-muted-foreground">{condition.specialty}</dd>
          </div>
        ) : null}
      </dl>
      <Link
        to="/conditions/$conditionId"
        params={{ conditionId: condition.id }}
        className="mt-5 block w-full rounded-xl bg-card py-2.5 text-center text-sm font-semibold text-primary ring-1 ring-border hover:bg-primary-soft"
      >
        {t("results.details")}
      </Link>
    </article>
  );
}

export function EmergencyAlert({ className, number = appConfig.emergencyFallback.ambulance.number }: { className?: string; number?: string }) {
  const { t } = useI18n();
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl bg-destructive-soft p-4 text-sm", className)}>
      <AlertTriangle className="size-5 shrink-0 text-destructive" />
      <p className="flex-1">{t("emergency.callNow")}</p>
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
  const { t } = useI18n();
  return <div className="glass animate-pulse rounded-3xl p-8 text-center text-sm text-muted-foreground">{t("common.loading")}</div>;
}

export function ErrorState({ text }: { text?: string }) {
  const { t } = useI18n();
  return <div className="rounded-3xl bg-destructive-soft p-6 text-center text-sm text-destructive">{text ?? t("common.loadError")}</div>;
}
