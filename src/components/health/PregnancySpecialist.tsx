import { Link } from "@tanstack/react-router";
import { ExternalLink, HeartPulse, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { useI18n } from "@/i18n";
import { pregnancySpecialistLabels, pregnancySpecialistSources, pregnancySpecialistTopics } from "@/data/pregnancy-specialist";

export function PregnancySpecialist() {
  const { lang } = useI18n();
  const c = pregnancySpecialistLabels[lang];
  return <section className="min-w-0 space-y-5 pt-5" aria-label={c.title}>
    <h2 className="flex items-center gap-2 text-xl font-extrabold"><HeartPulse className="size-6 shrink-0 text-primary" />{c.title}</h2>
    <p className="border-s-2 border-accent ps-3 text-sm leading-7 text-muted-foreground">{c.note}</p>
    <Button asChild variant="destructive"><Link to="/emergency"><PhoneCall />{lang === "ar" ? "الطوارئ" : "Emergency"}</Link></Button>
    <Table className="min-w-[680px] table-fixed text-start" aria-label={c.title}>
      <TableHeader className="bg-muted/60"><TableRow><TableHead scope="col" className="w-[22%] text-start">{c.topic}</TableHead><TableHead scope="col" className="w-[44%] text-start">{c.followUp}</TableHead><TableHead scope="col" className="w-[34%] text-start">{c.urgent}</TableHead></TableRow></TableHeader>
      <TableBody>{pregnancySpecialistTopics.map((topic) => <TableRow key={topic.id}>
        <TableCell className="align-top py-4 font-bold leading-7">{topic.title[lang]}</TableCell>
        <TableCell className="align-top py-4"><p className="text-sm leading-7 text-muted-foreground">{topic.followUp[lang]}</p><div className="mt-3 flex flex-wrap gap-3">{topic.sources.map((id) => { const source = pregnancySpecialistSources[id]; return source ? <a key={id} href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary underline"><ExternalLink className="size-3" />{source.title}</a> : null; })}</div></TableCell>
        <TableCell className="align-top py-4"><p className="border-s-2 border-warning ps-3 text-sm leading-7">{topic.urgent[lang]}</p></TableCell>
      </TableRow>)}</TableBody>
    </Table>
    <p className="text-xs leading-6 text-muted-foreground">{c.review}</p>
  </section>;
}