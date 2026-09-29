import { Link } from "@tanstack/react-router";
import { icons, ChevronLeft, AlertTriangle, Phone, CheckCircle2, CircleDot, MinusCircle, Info } from "lucide-react";
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
  const unpublished = appConfig.contentMode === "development" && topic.review_status !== "published";

  return (
    <div className="glass flex flex-col rounded-3xl p-5 transition-transform hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-destructive-soft text-destructive">
          <Icon className="size-6" strokeWidth={1.9} />
        </span>
        <div className="flex flex-col items-end gap-1.5">
          {topic.is_critical ? (
            <span className="rounded-full bg-destructive-soft px-2.5 py-1 text-[11px] font-semibold text-destructive">
              {t("firstAid.critical")}
            </span>
          ) : null}
          {unpublished ? (
            <span className="rounded-full bg-warning-soft px-2.5 py-1 text-[11px] font-semibold text-warning">
              {t("firstAid.pendingReview")}
            </span>
          ) : null}
        </div>
      </div>
      <h3 className="mt-4 text-base font-bold">{title}</h3>
      <p className="mt-1 flex-1 text-sm leading-6 text-muted-foreground">{summary ?? t("common.notTranslated")}</p>
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

export function ResultCard({ result, condition, symptoms, meta }: { result: PossibleConditionResult; condition: Condition; symptoms: Symptom[]; meta?: { conditionVersion?: number | undefined; release: string | null; engine?: string | undefined } | undefined }) {
  const { lang, t } = useI18n();
  const name = (id: string) => {
    const symptom = symptoms.find((s) => s.id === id);
    if (!symptom) return "";
    return localized(symptom as unknown as Record<string, unknown>, "name", lang) ?? t("common.notTranslated");
  };
  const conditionName = localized(condition as unknown as Record<string, unknown>, "name", lang) ?? t("common.notTranslated");
  const conditionSummary = localized(condition as unknown as Record<string, unknown>, "summary", lang);
  const why = ResultExplanationService.explain(result, symptoms, lang);
  const seekCare = lang === "ar" ? condition.when_to_seek_care_ar : null;

  return (
    <article className="glass rounded-3xl p-5 animate-rise md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-extrabold md:text-xl">{conditionName}</h3>
          {condition.is_demo ? (
            <span className="mt-2 inline-block rounded-full bg-warning-soft px-2.5 py-0.5 text-[11px] font-semibold text-warning">
              {t("results.demo")}
            </span>
          ) : null}
        </div>
        <CompatibilityBadge level={result.compatibilityLevel} />
      </div>

      {conditionSummary ? (
        <div className="mt-4">
          <p className="text-xs font-bold text-muted-foreground">{t("results.cardSummary")}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{conditionSummary}</p>
        </div>
      ) : null}

      <div className="mt-5">
        <p className="mb-2 text-xs font-bold text-muted-foreground">{t("results.matched")}</p>
        <div className="flex flex-wrap gap-1.5">
          {result.matchedSymptoms.map((s) => (
            <span key={s} className="rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">{name(s)}</span>
          ))}
        </div>
      </div>

      <WhySection result={result} name={name} fallback={why} meta={meta} />

      {(seekCare || condition.specialty) ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {seekCare ? (
            <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
              <p className="text-xs font-bold text-muted-foreground">{t("results.conditionStep")}</p>
              <p className="mt-1 text-sm leading-6">{seekCare}</p>
            </div>
          ) : null}
          {condition.specialty ? (
            <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
              <p className="text-xs font-bold text-muted-foreground">{t("results.specialtyHint")}</p>
              <p className="mt-1 text-sm font-semibold">{condition.specialty}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {result.contradictingSymptoms.length ? (
        <details className="mt-5 rounded-2xl bg-card p-4 ring-1 ring-border">
          <summary className="cursor-pointer text-sm font-semibold">{t("results.moreInfo")}</summary>
          <div className="mt-3">
            <p className="text-xs font-semibold text-muted-foreground">{t("results.partial")}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {result.contradictingSymptoms.map((s) => (
                <span key={s} className="rounded-full bg-warning-soft px-3 py-1 text-xs text-warning">{name(s)}</span>
              ))}
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{t("results.partialHint")}</p>
          </div>
        </details>
      ) : null}

      <Link
        to="/conditions/$conditionId"
        params={{ conditionId: condition.id }}
        className="mt-5 flex w-full items-center justify-between rounded-xl bg-card px-4 py-3 text-sm font-semibold text-primary ring-1 ring-border hover:bg-primary-soft"
      >
        {t("results.viewCondition")}
        <ChevronLeft className={cn("size-4", lang === "en" && "rotate-180")} />
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

function WhySection({ result, name, fallback, meta }: {
  result: PossibleConditionResult; name: (id: string) => string; fallback: string[];
  meta?: { conditionVersion?: number | undefined; release: string | null; engine?: string | undefined } | undefined;
}) {
  const { t } = useI18n();
  const ids = (code: string) => [...new Set(result.reasonCodes.filter((r) => r.code === code && r.symptomId).map((r) => r.symptomId!))];
  const groups = [
    { key: "results.why.core" as const, items: ids("MATCHED_PRIMARY_SYMPTOM"), Icon: CheckCircle2, tone: "bg-primary-soft text-primary" },
    { key: "results.why.support" as const, items: ids("MATCHED_SECONDARY_SYMPTOM"), Icon: CircleDot, tone: "bg-success-soft text-success" },
    { key: "results.why.against" as const, items: ids("CONTRADICTING_FINDING"), Icon: MinusCircle, tone: "bg-warning-soft text-warning" },
  ].filter((g) => g.items.length);
  const levelText = t(`results.why.level.${result.compatibilityLevel}` as never);

  return (
    <section className="mt-5 rounded-2xl bg-card/60 p-4 ring-1 ring-border">
      <div className="flex items-center gap-2">
        <Info className="size-4 text-primary" />
        <p className="text-sm font-bold">{t("results.why")}</p>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{levelText}</p>
      {groups.length ? (
        <div className="mt-3 space-y-3">
          {groups.map(({ key, items, Icon, tone }) => (
            <div key={key}>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold"><Icon className="size-3.5" />{t(key)}</p>
              <div className="flex flex-wrap gap-1.5">
                {items.map((id) => <span key={id} className={cn("rounded-full px-3 py-1 text-xs font-medium", tone)}>{name(id)}</span>)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">{fallback.map((f) => <li key={f}>{f}</li>)}</ul>
      )}
      <p className="mt-3 text-[11px] leading-5 text-muted-foreground">{t("results.why.note")}</p>
      {meta && (meta.release || meta.conditionVersion) ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {meta.release ? `${t("results.release")}: ${meta.release}` : ""}
          {meta.conditionVersion ? ` · ${t("results.conditionVersion")}: v${meta.conditionVersion}` : ""}
        </p>
      ) : null}
    </section>
  );
}
