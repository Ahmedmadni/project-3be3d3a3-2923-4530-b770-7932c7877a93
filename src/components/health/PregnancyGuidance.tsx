import { useEffect, useState } from "react";
import { Check, CircleAlert, Leaf, ShieldCheck, Utensils, Footprints, HeartPulse, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { pregnancyGuidanceLabels } from "@/data/pregnancy-guidance-labels";
import { guidanceForStage } from "@/lib/pregnancy-guidance";
import type { PregnancyGuidanceCategory, PregnancyGuidanceItem, PregnancyGuidanceStatus } from "@/types/medical";

type Props = { currentStage?: number; items: PregnancyGuidanceItem[]; sourceUrls: Record<string, { title: string; url: string }> };
const categories = ["all", "food", "activity", "care"] as const;
const statusIcons = { avoid: CircleAlert, conditional: ShieldCheck, recommended: Check };
const statusStyles = { avoid: "border-warning/40 bg-warning-soft/30", conditional: "border-accent/30 bg-accent/5", recommended: "border-primary/30 bg-primary-soft/30" };
const statusHeading = { avoid: "text-foreground", conditional: "text-accent", recommended: "text-primary" };
const categoryIcons = { all: Leaf, food: Utensils, activity: Footprints, care: HeartPulse };
const statuses: PregnancyGuidanceStatus[] = ["avoid", "conditional", "recommended"];

export function PregnancyGuidance({ currentStage, items, sourceUrls }: Props) {
  const { lang } = useI18n();
  const c = pregnancyGuidanceLabels[lang];
  const [stage, setStage] = useState(currentStage ?? 0);
  const [category, setCategory] = useState<PregnancyGuidanceCategory | "all">("all");
  useEffect(() => { if (currentStage !== undefined) setStage(currentStage); }, [currentStage]);
  const visible = guidanceForStage(items, stage, category);
  return <section className="space-y-5 border-t border-border pt-6" aria-label={c.title}>
    <div><h2 className="text-xl font-extrabold">{c.title}</h2><p className="mt-2 text-sm leading-7 text-muted-foreground">{c.subtitle}</p></div>
    <div className="grid grid-cols-3 gap-2" role="group" aria-label={c.stage}>
      {c.stages.map((label, i) => <Button key={label} variant={stage === i ? "default" : "outline"} aria-pressed={stage === i} onClick={() => setStage(i)} className="h-auto min-h-16 flex-col gap-1 whitespace-normal px-2 py-3 text-center">
        <span className="text-sm font-bold">{label}</span><span className="text-[10px] leading-4 opacity-90 sm:text-xs">{currentStage === i ? c.current : c.ranges[i]}</span>
      </Button>)}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{c.stages[stage]} · {c.ranges[stage]}</p>{currentStage !== undefined && currentStage !== stage && <Button variant="link" className="px-0" onClick={() => setStage(currentStage)}>{c.returnCurrent}</Button>}</div>
    <p className="text-xs leading-6 text-muted-foreground">{c.monthNote} {currentStage === undefined ? c.noDating : ""}</p>
    <div className="flex flex-wrap gap-2" role="group" aria-label={c.title}>{categories.map((value) => { const Icon = categoryIcons[value]; return <Button key={value} variant={category === value ? "secondary" : "ghost"} aria-pressed={category === value} className="h-auto min-h-9 whitespace-normal py-2" onClick={() => setCategory(value)}><Icon />{c[value]}</Button>; })}</div>
    <p className="border-s-2 border-accent ps-3 text-xs leading-6 text-muted-foreground">{c.personalized}</p>
    <div className="grid gap-6 lg:grid-cols-3">
      {statuses.map((status) => { const Icon = statusIcons[status]; const list = visible.filter((item) => item.status === status); return <section key={status} className="min-w-0" aria-label={c[status]}>
        <h3 className={`mb-3 flex items-center gap-2 text-base font-bold ${statusHeading[status]}`}><Icon className="size-5" />{c[status]} <span className="text-xs font-normal text-muted-foreground">({list.length})</span></h3>
        <div className="space-y-3">{!list.length ? <p className="text-sm text-muted-foreground">{c.empty}</p> : list.map((item) => <article key={item.id} className={`rounded-lg border p-4 ${statusStyles[status]}`}>
          <p className="mb-2 text-[10px] font-semibold text-muted-foreground">{c[item.category]} · {item.scope === "throughout" ? c.throughout : c.stageOnly}{item.fromWeek !== undefined ? ` · ${c.fromWeek} ${item.fromWeek}` : ""}</p>
          <h4 className="text-sm font-bold leading-6">{item.title[lang]}</h4><p className="mt-2 text-sm leading-7 text-muted-foreground">{item.body[lang]}</p>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">{item.sources.map((id) => { const source = sourceUrls[id]; return source ? <a key={id} href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-medium text-primary underline" aria-label={`${c.source}: ${source.title}`}><ExternalLink className="size-3" />{source.title}</a> : null; })}</div>
        </article>)}</div>
      </section>; })}
    </div>
    <p className="text-xs leading-6 text-muted-foreground">{c.review}</p>
  </section>;
}