import type { PregnancyGuidanceCategory, PregnancyGuidanceItem } from "@/types/medical";

export function guidanceForStage(items: PregnancyGuidanceItem[], stage: number, category: PregnancyGuidanceCategory | "all" = "all") {
  return items.filter((item) => (item.scope === "throughout" || item.stages.includes(stage)) && (category === "all" || item.category === category));
}