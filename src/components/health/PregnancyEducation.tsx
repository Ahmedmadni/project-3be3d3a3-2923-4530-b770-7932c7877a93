import { useI18n } from "@/i18n";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { pregnancyGuidance, pregnancyGuidanceSources } from "@/data/pregnancy-guidance";
import { pregnancyJourneySources, pregnancyWeeks, pregnancyWarningSigns, pregnancyVisits, pregnancyVisitQuestions } from "@/data/pregnancy-journey";
import { PregnancyGuidance } from "./PregnancyGuidance";
import { PregnancyWeeks } from "./PregnancyWeeks";
import { PregnancyWarnings } from "./PregnancyWarnings";
import { PregnancyVisits } from "./PregnancyVisits";
import { pregnancyEducationLabels } from "@/data/pregnancy-education-labels";

export function PregnancyEducation({ currentStage, completedWeeks }: { currentStage?: number; completedWeeks?: number }) {
  const { lang } = useI18n();
  const c = pregnancyEducationLabels[lang];
  return <Tabs defaultValue="guidance" dir={lang === "ar" ? "rtl" : "ltr"}>
    <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-muted/50 p-1 sm:grid-cols-4">
      {(["guidance", "weeks", "warnings", "visits"] as const).map((key) => <TabsTrigger key={key} value={key} className="h-auto min-h-11 whitespace-normal px-2 py-2 text-center text-xs leading-5 sm:text-sm">{c[key]}</TabsTrigger>)}
    </TabsList>
    <TabsContent value="guidance"><PregnancyGuidance currentStage={currentStage} items={pregnancyGuidance} sourceUrls={pregnancyGuidanceSources} /></TabsContent>
    <TabsContent value="weeks" className="pt-5"><PregnancyWeeks completedWeeks={completedWeeks} items={pregnancyWeeks} sourceUrls={pregnancyJourneySources} /></TabsContent>
    <TabsContent value="warnings" className="pt-5"><PregnancyWarnings currentStage={currentStage} items={pregnancyWarningSigns} sourceUrls={pregnancyJourneySources} /></TabsContent>
    <TabsContent value="visits" className="pt-5"><PregnancyVisits currentStage={currentStage} items={pregnancyVisits} questions={pregnancyVisitQuestions[lang]} sourceUrls={pregnancyJourneySources} /></TabsContent>
  </Tabs>;
}