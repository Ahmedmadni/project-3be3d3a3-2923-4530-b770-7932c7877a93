import { useEffect, useState } from "react";
import { Check, CircleAlert, Leaf, ShieldCheck, Utensils, Footprints, HeartPulse, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Pill } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n";
import { pregnancyGuidanceLabels } from "@/data/pregnancy-guidance-labels";
import { guidanceForStage, searchPregnancyGuidance } from "@/lib/pregnancy-guidance";
import type { PregnancyGuidanceCategory, PregnancyGuidanceItem, PregnancyGuidanceStatus } from "@/types/medical";

type Props = { currentStage?: number; items: PregnancyGuidanceItem[]; sourceUrls: Record<string, { title: string; url: string }> };
const categories = ["all", "food", "medicine", "activity", "care"] as const;
const statusIcons = { avoid: CircleAlert, conditional: ShieldCheck, recommended: Check };
const statusStyles = { avoid: "border-warning/40 bg-warning-soft/30", conditional: "border-accent/30 bg-accent/5", recommended: "border-primary/30 bg-primary-soft/30" };
const statusHeading = { avoid: "text-foreground", conditional: "text-accent", recommended: "text-primary" };
const categoryIcons = { all: Leaf, food: Utensils, medicine: Pill, activity: Footprints, care: HeartPulse };
const statuses: PregnancyGuidanceStatus[] = ["avoid", "conditional", "recommended"];

export function PregnancyGuidance({ currentStage, items, sourceUrls }: Props) {
  const { lang } = useI18n();
  const c = pregnancyGuidanceLabels[lang];
  const [stage, setStage] = useState(currentStage ?? 0);
  const [category, setCategory] = useState<PregnancyGuidanceCategory | "all">("all");
  const [query, setQuery] = useState("");
  useEffect(() => { if (currentStage !== undefined) setStage(currentStage); }, [currentStage]);
  const visible = searchPregnancyGuidance(guidanceForStage(items, stage, category), query);
  return <section className="space-y-5 border-t border-border pt-6" aria-label={c.title}>
    <div><h2 className="text-xl font-extrabold">{c.title}</h2><p className="mt-2 text-sm leading-7 text-muted-foreground">{c.subtitle}</p></div>
    <div className="grid grid-cols-3 gap-2" role="group" aria-label={c.stage}>
      {c.stages.map((label, i) => <Button key={label} variant={stage === i ? "default" : "outline"} aria-pressed={stage === i} onClick={() => setStage(i)} className="h-auto min-h-16 flex-col gap-1 whitespace-normal px-2 py-3 text-center">
        <span className="text-sm font-bold">{label}</span><span className="text-[10px] leading-4 opacity-90 sm:text-xs">{currentStage === i ? c.current : c.ranges[i]}</span>
      </Button>)}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{c.stages[stage]} · {c.ranges[stage]}</p>{currentStage !== undefined && currentStage !== stage && <Button variant="link" className="px-0" onClick={() => setStage(currentStage)}>{c.returnCurrent}</Button>}</div>
    <p className="text-xs leading-6 text-muted-foreground">{c.monthNote} {currentStage === undefined ? c.noDating : ""}</p>
    <div className="flex items-center gap-2"><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={c.search} aria-label={c.searchLabel} className="min-w-0" />{query && <Button variant="ghost" onClick={() => setQuery("")}>{c.clear}</Button>}</div>
    <div className="flex flex-wrap gap-2" role="group" aria-label={c.title}>{categories.map((value) => { const Icon = categoryIcons[value]; return <Button key={value} variant={category === value ? "secondary" : "ghost"} aria-pressed={category === value} className="h-auto min-h-9 whitespace-normal py-2" onClick={() => setCategory(value)}><Icon />{c[value]}</Button>; })}</div>
    <p className="border-s-2 border-accent ps-3 text-xs leading-6 text-muted-foreground">{c.personalized}</p>
    {(category === "all" || category === "medicine") && <p className="border-s-2 border-warning bg-warning-soft/30 p-3 text-sm leading-7">{c.medicineNote}</p>}
    <div className="space-y-8">
      {categories.filter((value) => value !== "all" && (category === "all" || category === value)).map((value) => {
        const list = visible.filter((item) => item.category === value).sort((a, b) => statuses.indexOf(a.status) - statuses.indexOf(b.status));
        const CategoryIcon = categoryIcons[value];
        return <section key={value} className="min-w-0 space-y-3" aria-label={c[value]}>
          <h3 className="flex items-center gap-2 font-bold"><CategoryIcon className="size-5 text-primary" />{c[value]} <span className="text-xs text-muted-foreground">({list.length})</span></h3>
          {!list.length ? <p className="text-sm text-muted-foreground">{c.empty}</p> : <Table className="min-w-[620px] table-fixed text-start" aria-label={c[value]}>
            <TableHeader className="bg-muted/60"><TableRow><TableHead scope="col" className="w-[23%] text-start">{c.subject}</TableHead><TableHead scope="col" className="w-[19%] text-start">{c.status}</TableHead><TableHead scope="col" className="w-[42%] text-start">{c.advice}</TableHead><TableHead scope="col" className="w-[16%] text-start">{c.period}</TableHead></TableRow></TableHeader>
            <TableBody>{list.map((item) => { const Icon = statusIcons[item.status]; return <TableRow key={item.id}>
              <TableCell className="align-top py-4 font-bold leading-7">{item.title[lang]}</TableCell>
              <TableCell className="align-top py-4"><span className={`inline-flex items-start gap-1.5 border-s-2 px-2 py-1 text-xs font-bold leading-5 ${statusStyles[item.status]} ${statusHeading[item.status]}`}><Icon className="mt-0.5 size-4 shrink-0" />{item.category === "medicine" && item.status === "conditional" ? c.medicineConditional : c[item.status]}</span></TableCell>
              <TableCell className="align-top py-4"><p className="text-sm leading-7 text-muted-foreground">{item.body[lang]}</p><div className="mt-2 flex flex-wrap gap-3">{item.sources.map((id) => { const source = sourceUrls[id]; return source ? <a key={id} href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary underline" aria-label={`${c.source}: ${source.title}`}><ExternalLink className="size-3" />{source.title}</a> : null; })}</div></TableCell>
              <TableCell className="align-top py-4 text-xs leading-6 text-muted-foreground">{item.scope === "throughout" ? c.throughout : c.stageOnly}{item.fromWeek !== undefined && <p>{c.fromWeek} {item.fromWeek}</p>}</TableCell>
            </TableRow>; })}</TableBody>
          </Table>}
        </section>;
      })}
    </div>
    <p className="text-xs leading-6 text-muted-foreground">{c.review}</p>
  </section>;
}