import { useEffect, useState } from "react";
import { CalendarCheck, ExternalLink, FlaskConical, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { pregnancyJourneyLabels } from "@/data/pregnancy-journey-labels";
import { visitsForStage } from "@/lib/pregnancy-weeks";
import type { PregnancyVisit } from "@/types/medical";

type Props = { items: PregnancyVisit[]; questions: string[][]; sourceUrls: Record<string, { title: string; url: string }>; currentStage?: number };

export function PregnancyVisits({ items, questions, sourceUrls, currentStage }: Props) {
  const { lang } = useI18n();
  const c = pregnancyJourneyLabels[lang].visits;
  const [stage, setStage] = useState(currentStage ?? 0);
  useEffect(() => { if (currentStage !== undefined) setStage(currentStage); }, [currentStage]);
  const visible = visitsForStage(items, stage);
  return <section className="space-y-5" aria-label={c.title}>
    <div><h2 className="flex items-center gap-2 text-xl font-extrabold"><CalendarCheck className="size-6 text-primary" />{c.title}</h2><p className="mt-2 text-sm leading-7 text-muted-foreground">{c.subtitle}</p></div>
    <div className="grid grid-cols-3 gap-2" role="group" aria-label={c.stage}>
      {c.stages.map((label, i) => <Button key={label} variant={stage === i ? "default" : "outline"} aria-pressed={stage === i} onClick={() => setStage(i)} className="h-auto min-h-16 flex-col gap-1 whitespace-normal px-2 py-3 text-center">
        <span className="text-sm font-bold">{label}</span><span className="text-[10px] leading-4 opacity-90 sm:text-xs">{currentStage === i ? c.current : ""}</span>
      </Button>)}
    </div>
    {currentStage !== undefined && currentStage !== stage && <Button variant="link" className="px-0" onClick={() => setStage(currentStage)}>{c.returnCurrent}</Button>}
    <div className="space-y-3">
      {!visible.length ? <p className="text-sm text-muted-foreground">{c.empty}</p> : visible.map((item) => {
        const Icon = item.kind === "test" ? FlaskConical : CalendarCheck;
        return <article key={item.id} className="rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="inline-flex items-center gap-2 text-xs font-bold"><Icon className="size-4 text-primary" />{item.kind === "test" ? c.test : c.visit}</p>
            <p className="text-xs font-semibold text-muted-foreground" dir="ltr">{c.weeksLabel} {item.weeks[0]}–{item.weeks[1]}</p>
          </div>
          <h3 className="mt-2 text-sm font-bold leading-6">{item.title[lang]}</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">{item.body[lang]}</p>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">{item.sources.map((id) => { const source = sourceUrls[id]; return source ? <a key={id} href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-medium text-primary underline" aria-label={`${c.source}: ${source.title}`}><ExternalLink className="size-3" />{source.title}</a> : null; })}</div>
        </article>;
      })}
    </div>
    {questions[stage]?.length ? <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold"><HelpCircle className="size-4 text-accent" />{c.questionsTitle}</h3>
      <ul className="mt-3 list-disc space-y-2 ps-5 text-sm leading-7 text-muted-foreground">{questions[stage].map((question) => <li key={question}>{question}</li>)}</ul>
    </div> : null}
    <p className="text-xs leading-6 text-muted-foreground">{c.disclaimer}<br />{c.review}</p>
  </section>;
}
