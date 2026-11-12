import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlarmClock, Baby, BookOpen, CircleAlert, ExternalLink, HeartHandshake, PhoneCall, RotateCcw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { appConfig } from "@/config/app";
import {
  aftercare, birthPreparation, birthSources, labourWarnings, postpartumWarnings,
  type BirthArticle, type BirthLocale, type BirthWarning,
} from "@/data/pregnancy-birth";
import { pregnancyBirthLabels } from "@/data/pregnancy-birth-labels";
import { contractionSeconds, formatElapsed, intervalSincePrevious, type ContractionRecord } from "@/lib/contraction-tracker";
import { useI18n } from "@/i18n";
import { PregnancyNewborn } from "./PregnancyNewborn";

function Sources({ ids, lang }: { ids: BirthArticle["sources"]; lang: BirthLocale }) {
  const c = pregnancyBirthLabels[lang];
  return <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2">
    {ids.map((id) => <a key={id} href={birthSources[id].url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2">
      <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />{birthSources[id].title}
      <span className="sr-only">({c.sources})</span>
    </a>)}
  </div>;
}

function InformationalCards({ entries, lang }: { entries: BirthArticle[]; lang: BirthLocale }) {
  return <div className="grid gap-3 md:grid-cols-2">
    {entries.map((item) => <article key={item.id} className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
      <h4 className="font-bold leading-7">{item.title[lang]}</h4>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.body[lang]}</p>
      <Sources ids={item.sources} lang={lang} />
    </article>)}
  </div>;
}

function WarningCards({ entries, lang }: { entries: BirthWarning[]; lang: BirthLocale }) {
  const c = pregnancyBirthLabels[lang];
  const emergency = entries.filter((item) => item.severity === "emergency");
  const immediate = entries.filter((item) => item.severity === "immediate");
  return <div className="space-y-5">
    {([
      { items: emergency, heading: c.emergency, style: "border-destructive bg-destructive-soft/40", icon: PhoneCall },
      { items: immediate, heading: c.immediate, style: "border-warning/40 bg-warning-soft/30", icon: ShieldAlert },
    ] as const).map((group) => <section key={group.heading} className="space-y-3" aria-label={group.heading}>
      <h4 className="flex items-start gap-2 text-sm font-extrabold leading-6">
        <group.icon className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />{group.heading}
      </h4>
      <div className="grid gap-3 lg:grid-cols-2">
        {group.items.map((item) => <article key={item.id} className={"min-w-0 rounded-xl border p-4 sm:p-5 " + group.style}>
          <h5 className="font-bold leading-7">{item.title[lang]}</h5>
          <p className="mt-2 text-sm leading-7">{item.body[lang]}</p>
          <Sources ids={item.sources} lang={lang} />
        </article>)}
      </div>
    </section>)}
  </div>;
}

/** Intentionally ephemeral. A timer must never gate access to emergency care. */
function ContractionLog({ lang }: { lang: BirthLocale }) {
  const c = pregnancyBirthLabels[lang];
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [clock, setClock] = useState(0);
  const [records, setRecords] = useState<ContractionRecord[]>([]);
  useEffect(() => {
    if (startedAt === null) return;
    const tick = () => setClock(Date.now());
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  function start() {
    const now = Date.now();
    setClock(now);
    setStartedAt(now);
  }
  function stop() {
    if (startedAt === null) return;
    const end = Date.now();
    if (end >= startedAt) setRecords((current) => [{ startedAt, endedAt: end }, ...current].slice(0, 8));
    setStartedAt(null);
  }
  function clear() {
    setStartedAt(null);
    setRecords([]);
    setClock(0);
  }
  return <section className="space-y-4 rounded-xl border border-border bg-muted/30 p-4 sm:p-6" aria-label={c.timerTitle}>
    <h4 className="flex items-center gap-2 font-bold"><AlarmClock className="size-5 text-primary" aria-hidden="true" />{c.timerTitle}</h4>
    <p className="text-sm leading-7 text-muted-foreground">{c.timerIntro}</p>
    <p className="border-s-4 border-destructive bg-destructive-soft/40 p-3 text-sm font-semibold leading-7">{c.timerSafety}</p>
    <div className="flex flex-wrap items-center gap-3">
      {startedAt === null
        ? <Button type="button" className="min-h-12" onClick={start}>{c.start}</Button>
        : <Button type="button" variant="destructive" className="min-h-12" onClick={stop}>{c.stop}</Button>}
      {startedAt !== null && <output className="min-w-16 text-center text-2xl font-extrabold tabular-nums" aria-label={c.running} dir="ltr">{formatElapsed(Math.floor(Math.max(0, clock - startedAt) / 1000))}</output>}
      <Button type="button" variant="outline" className="min-h-12" onClick={clear} disabled={startedAt === null && records.length === 0}>
        <RotateCcw className="size-4" aria-hidden="true" />{c.clear}
      </Button>
    </div>
    <h5 className="text-sm font-bold">{c.record}</h5>
    {records.length === 0
      ? <p className="text-sm text-muted-foreground">{c.empty}</p>
      : <ol className="grid gap-2 sm:grid-cols-2">
        {records.map((record, index) => {
          const interval = intervalSincePrevious(records, index);
          return <li key={record.startedAt} className="rounded-lg border border-border bg-card p-3 text-sm">
            <span className="block font-semibold">{new Intl.DateTimeFormat(lang === "ar" ? "ar-SA" : "en-GB", { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(new Date(record.startedAt))}</span>
            <span className="mt-1 block">{c.duration}: <b dir="ltr">{formatElapsed(contractionSeconds(record))}</b></span>
            <span className="block">{c.interval}: {interval === null ? c.noInterval : <b dir="ltr">{formatElapsed(interval)}</b>}</span>
          </li>;
        })}
      </ol>}
    <p className="text-xs leading-6 text-muted-foreground">{c.transient}</p>
  </section>;
}

export function PregnancyBirth() {
  const { lang } = useI18n();
  const c = pregnancyBirthLabels[lang];
  return <section className="space-y-5" aria-label={c.title}>
    <header className="space-y-2">
      <h2 className="flex items-center gap-2 text-xl font-extrabold"><Baby className="size-6 text-primary" aria-hidden="true" />{c.title}</h2>
      <p className="text-sm leading-7 text-muted-foreground">{c.subtitle}</p>
    </header>
    <section className="rounded-xl border-s-4 border-destructive bg-destructive-soft/40 p-4 sm:p-5">
      <h3 className="flex items-center gap-2 font-extrabold text-destructive"><CircleAlert className="size-5 shrink-0" aria-hidden="true" />{c.emergencyTitle}</h3>
      <p className="mt-2 text-sm leading-7">{c.emergencyBody}</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button asChild variant="destructive" className="min-h-12">
          <a href={"tel:" + appConfig.emergencyFallback.ambulance.number}>
            <PhoneCall className="size-4" aria-hidden="true" />{c.ambulance} ({appConfig.emergencyFallback.ambulance.number})
          </a>
        </Button>
        <Button asChild variant="outline" className="min-h-12"><Link to="/emergency">{c.emergencyPage}</Link></Button>
      </div>
      <p className="mt-2 text-xs leading-6 text-muted-foreground">{c.saOnly}</p>
    </section>
    <Tabs defaultValue="labour" dir={lang === "ar" ? "rtl" : "ltr"}>
      <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-muted/50 p-1 sm:grid-cols-4">
        <TabsTrigger value="preparation" className="min-h-12 whitespace-normal px-1 py-2 text-center text-xs sm:text-sm"><BookOpen className="me-1 size-4 shrink-0" />{c.preparation}</TabsTrigger>
        <TabsTrigger value="labour" className="min-h-12 whitespace-normal px-1 py-2 text-center text-xs sm:text-sm"><AlarmClock className="me-1 size-4 shrink-0" />{c.labour}</TabsTrigger>
        <TabsTrigger value="postpartum" className="min-h-12 whitespace-normal px-1 py-2 text-center text-xs sm:text-sm"><HeartHandshake className="me-1 size-4 shrink-0" />{c.postpartum}</TabsTrigger>
        <TabsTrigger value="newborn" className="min-h-12 whitespace-normal px-1 py-2 text-center text-xs sm:text-sm"><Baby className="me-1 size-4 shrink-0" />{c.newborn}</TabsTrigger>
      </TabsList>
      <TabsContent value="preparation" className="space-y-4 pt-5">
        <h3 className="font-extrabold">{c.preparationTitle}</h3>
        <p className="text-sm leading-7 text-muted-foreground">{c.preparationIntro}</p>
        <InformationalCards entries={birthPreparation} lang={lang} />
      </TabsContent>
      <TabsContent value="labour" className="space-y-6 pt-5">
        <div><h3 className="font-extrabold">{c.labourTitle}</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">{c.labourIntro}</p></div>
        <WarningCards entries={labourWarnings} lang={lang} />
        <ContractionLog lang={lang} />
      </TabsContent>
      <TabsContent value="postpartum" className="space-y-6 pt-5">
        <div><h3 className="font-extrabold">{c.postpartumTitle}</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">{c.postpartumIntro}</p></div>
        <WarningCards entries={postpartumWarnings} lang={lang} />
        <div><h3 className="mb-3 font-extrabold">{c.followup}</h3><InformationalCards entries={aftercare} lang={lang} /></div>
      </TabsContent>
      <TabsContent value="newborn" className="space-y-5 pt-5"><PregnancyNewborn /></TabsContent>
    </Tabs>
    <p className="border-s-2 border-primary ps-3 text-xs leading-6 text-muted-foreground">{c.clinicalReview}</p>
  </section>;
}
