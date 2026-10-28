import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/i18n";
import { pregnancyJourneyLabels } from "@/data/pregnancy-journey-labels";
import { currentGestationalWeek, weekContent } from "@/lib/pregnancy-weeks";
import type { PregnancyWeek } from "@/types/medical";

type Props = { items: PregnancyWeek[]; sourceUrls: Record<string, { title: string; url: string }>; completedWeeks?: number };
const trimester = (week: number) => (week < 14 ? 0 : week < 28 ? 1 : 2);

export function PregnancyWeeks({ items, sourceUrls, completedWeeks }: Props) {
  const { lang } = useI18n();
  const c = pregnancyJourneyLabels[lang].weeks;
  const current = completedWeeks !== undefined ? currentGestationalWeek(completedWeeks) : undefined;
  const [week, setWeek] = useState(current ?? 4);
  useEffect(() => { if (current !== undefined) setWeek(current); }, [current]);
  const content = weekContent(items, week);
  const stage = trimester(week);
  return <section className="space-y-5" aria-label={c.title}>
    <div><h2 className="text-xl font-extrabold">{c.title}</h2><p className="mt-2 text-sm leading-7 text-muted-foreground">{c.subtitle}</p></div>
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="icon" aria-label={c.prev} disabled={week <= 1} onClick={() => setWeek((w) => Math.max(1, w - 1))}>
        {lang === "ar" ? <ChevronRight /> : <ChevronLeft />}
      </Button>
      <Select value={String(week)} onValueChange={(value) => setWeek(Number(value))}>
        <SelectTrigger className="w-44" aria-label={c.choose}><SelectValue /></SelectTrigger>
        <SelectContent>{items.map((item) => <SelectItem key={item.week} value={String(item.week)}>{c.week} {item.week}</SelectItem>)}</SelectContent>
      </Select>
      <Button variant="outline" size="icon" aria-label={c.next} disabled={week >= 40} onClick={() => setWeek((w) => Math.min(40, w + 1))}>
        {lang === "ar" ? <ChevronLeft /> : <ChevronRight />}
      </Button>
      {current !== undefined && week === current && <span className="text-sm font-semibold text-primary">{c.current}</span>}
    </div>
    {content && <article className="rounded-lg border border-primary/30 bg-primary-soft/30 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-bold" dir="ltr">{c.week} {content.week}</h3>
        <p className="text-xs font-semibold text-muted-foreground">{c.stageOf} · {c.trimesters[stage]}</p>
      </div>
      <div className="mt-4 space-y-4">
        <div><p className="text-sm font-bold">{c.baby}</p><p className="mt-1 text-sm leading-7 text-muted-foreground">{content.baby[lang]}</p></div>
        <div><p className="text-sm font-bold">{c.mother}</p><p className="mt-1 text-sm leading-7 text-muted-foreground">{content.mother[lang]}</p></div>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1">{content.sources.map((id) => { const source = sourceUrls[id]; return source ? <a key={id} href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-medium text-primary underline" aria-label={`${c.source}: ${source.title}`}><ExternalLink className="size-3" />{source.title}</a> : null; })}</div>
    </article>}
    <p className="text-xs leading-6 text-muted-foreground">{c.disclaimer}<br />{c.review}</p>
  </section>;
}
