import { useEffect, useState } from "react";
import { CircleAlert, ExternalLink, PhoneCall, ShieldAlert } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { pregnancyJourneyLabels } from "@/data/pregnancy-journey-labels";
import { warningsForStage } from "@/lib/pregnancy-weeks";
import type { PregnancyWarningSign } from "@/types/medical";

type Props = { items: PregnancyWarningSign[]; sourceUrls: Record<string, { title: string; url: string }>; currentStage?: number };

export function PregnancyWarnings({ items, sourceUrls, currentStage }: Props) {
  const { lang } = useI18n();
  const c = pregnancyJourneyLabels[lang].warnings;
  const [stage, setStage] = useState(currentStage ?? 0);
  useEffect(() => { if (currentStage !== undefined) setStage(currentStage); }, [currentStage]);
  const visible = warningsForStage(items, stage);
  const groups = [
    { key: "emergency", heading: c.emergencyHeading, label: c.emergency, icon: PhoneCall, className: "border-destructive bg-destructive-soft/50", text: "text-destructive" },
    { key: "same_day", heading: c.sameDay, label: c.sameDay, icon: ShieldAlert, className: "border-warning/40 bg-warning-soft/50", text: "text-warning" },
  ] as const;
  return <section className="space-y-5" aria-label={c.title}>
    <div><h2 className="flex items-center gap-2 text-xl font-extrabold"><CircleAlert className="size-6 text-destructive" />{c.title}</h2><p className="mt-2 text-sm leading-7 text-muted-foreground">{c.subtitle}</p></div>
    <div className="grid grid-cols-3 gap-2" role="group" aria-label={c.stage}>
      {c.stages.map((label, i) => <Button key={label} variant={stage === i ? "default" : "outline"} aria-pressed={stage === i} onClick={() => setStage(i)} className="h-auto min-h-16 flex-col gap-1 whitespace-normal px-2 py-3 text-center">
        <span className="text-sm font-bold">{label}</span><span className="text-[10px] leading-4 opacity-90 sm:text-xs">{currentStage === i ? c.current : ""}</span>
      </Button>)}
    </div>
    {currentStage !== undefined && currentStage !== stage && <Button variant="link" className="px-0" onClick={() => setStage(currentStage)}>{c.returnCurrent}</Button>}
    <Button asChild variant="destructive"><Link to="/emergency">{c.emergencyCta}</Link></Button>
    {groups.map((group) => {
      const list = visible.filter((item) => item.severity === group.key);
      const Icon = group.icon;
      return <div key={group.key} className="space-y-3">
        <h3 className={`flex items-center gap-2 text-base font-bold ${group.text}`}><Icon className="size-5" />{group.heading} <span className="text-xs font-normal text-muted-foreground">({list.length})</span></h3>
        {!list.length ? <p className="text-sm text-muted-foreground">{c.empty}</p> : list.map((item) => <article key={item.id} className={`rounded-lg border p-4 ${group.className}`}>
          <p className="mb-2 text-[10px] font-semibold text-muted-foreground">{item.scope === "throughout" ? c.throughout : c.stageOnly}{item.stages.length === 1 && item.scope === "stage" ? ` · ${c.stages[item.stages[0]]}` : ""}</p>
          <h4 className="text-sm font-bold leading-6">{item.title[lang]}</h4><p className="mt-2 text-sm leading-7 text-muted-foreground">{item.body[lang]}</p>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">{item.sources.map((id) => { const source = sourceUrls[id]; return source ? <a key={id} href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-medium text-primary underline" aria-label={`${c.source}: ${source.title}`}><ExternalLink className="size-3" />{source.title}</a> : null; })}</div>
        </article>)}
      </div>;
    })}
    <p className="border-s-2 border-destructive ps-3 text-xs leading-6 text-muted-foreground">{c.note}</p>
    <p className="text-xs leading-6 text-muted-foreground">{c.review}</p>
  </section>;
}
