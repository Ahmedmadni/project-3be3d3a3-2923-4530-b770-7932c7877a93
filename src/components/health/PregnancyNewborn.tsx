import { Link } from "@tanstack/react-router";
import { Baby, CircleAlert, ExternalLink, HeartPulse, PhoneCall, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { appConfig } from "@/config/app";
import { useI18n } from "@/i18n";
import {
  newbornBasics, newbornLabels, newbornSources, newbornWarnings,
  type NewbornArticle, type NewbornLocale,
} from "@/data/pregnancy-newborn";

function NewbornSources({ item }: { item: NewbornArticle }) {
  return <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2">
    {item.sources.map((id) => <a
      key={id} href={newbornSources[id].url} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-2"
    >
      <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />{newbornSources[id].title}
    </a>)}
  </div>;
}

function WarningGroup({ lang, severity }: { lang: NewbornLocale; severity: "ambulance" | "urgentAssessment" }) {
  const c = newbornLabels[lang];
  const emergency = severity === "ambulance";
  const list = newbornWarnings.filter((item) => item.urgency === severity);
  return <section aria-label={emergency ? c.emergencyHeading : c.assessmentHeading} className="space-y-3">
    <h4 className={"flex items-start gap-2 font-extrabold leading-7 " + (emergency ? "text-destructive" : "text-foreground")}>
      {emergency
        ? <PhoneCall className="mt-1 size-5 shrink-0" aria-hidden="true" />
        : <ShieldAlert className="mt-1 size-5 shrink-0 text-warning" aria-hidden="true" />}
      {emergency ? c.emergencyHeading : c.assessmentHeading}
    </h4>
    <div className="grid gap-3 md:grid-cols-2">
      {list.map((item) => <article
        key={item.id}
        className={"min-w-0 space-y-2 rounded-xl border p-4 sm:p-5 " + (emergency ? "border-destructive bg-destructive-soft/40" : "border-warning/40 bg-warning-soft/30")}
      >
        <h5 className="font-bold leading-7">{item.title[lang]}</h5>
        <p className="text-sm leading-7">{item.body[lang]}</p>
        <NewbornSources item={item} />
      </article>)}
    </div>
  </section>;
}

export function PregnancyNewborn() {
  const { lang } = useI18n();
  const c = newbornLabels[lang];
  return <section className="min-w-0 space-y-6" aria-label={c.title}>
    <header>
      <h3 className="flex items-center gap-2 text-lg font-extrabold">
        <Baby className="size-5 text-primary" aria-hidden="true" />{c.title}
      </h3>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">{c.subtitle}</p>
    </header>
    <div className="space-y-3 rounded-xl border-s-4 border-destructive bg-destructive-soft/40 p-4 sm:p-5">
      <p className="flex items-start gap-2 font-bold leading-7 text-destructive">
        <CircleAlert className="mt-1 size-5 shrink-0" aria-hidden="true" />{c.emergencyNotice}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button asChild variant="destructive" className="h-auto min-h-12 whitespace-normal py-2">
          <a href={"tel:" + appConfig.emergencyFallback.ambulance.number}>
            <PhoneCall className="size-4 shrink-0" aria-hidden="true" />
            {c.call} ({appConfig.emergencyFallback.ambulance.number})
          </a>
        </Button>
        <Button asChild variant="outline" className="min-h-12"><Link to="/emergency">{c.emergencyPage}</Link></Button>
      </div>
      <p className="text-xs leading-6 text-muted-foreground">{c.local}</p>
    </div>
    <WarningGroup lang={lang} severity="ambulance" />
    <WarningGroup lang={lang} severity="urgentAssessment" />
    <section className="space-y-3" aria-label={c.actions}>
      <h4 className="flex items-center gap-2 text-base font-extrabold">
        <HeartPulse className="size-5 text-primary" aria-hidden="true" />{c.actions}
      </h4>
      <div className="grid gap-3 md:grid-cols-2">
        {newbornBasics.map((item) => <article key={item.id} className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
          <h5 className="font-bold leading-7">{item.title[lang]}</h5>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.body[lang]}</p>
          <NewbornSources item={item} />
        </article>)}
      </div>
    </section>
    <p className="border-s-2 border-primary ps-3 text-xs leading-6 text-muted-foreground">{c.review}</p>
  </section>;
}
