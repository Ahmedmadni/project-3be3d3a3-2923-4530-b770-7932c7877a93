import type { PregnancyGuidanceCategory, PregnancyGuidanceItem } from "@/types/medical";

export function guidanceForStage(items: PregnancyGuidanceItem[], stage: number, category: PregnancyGuidanceCategory | "all" = "all") {
  return items.filter((item) => (item.scope === "throughout" || item.stages.includes(stage)) && (category === "all" || item.category === category));
}

export function searchPregnancyGuidance(items: PregnancyGuidanceItem[], query: string) {
  const normalize = (value: string) => value.normalize("NFKC").replace(/[\u064B-\u065F\u0670\u0640]/g, "").replace(/[أإآٱ]/g, "ا").toLocaleLowerCase();
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  return items.filter((item) => {
    const text = normalize(`${item.title.ar} ${item.title.en} ${item.body.ar} ${item.body.en}`);
    return terms.every((term) => text.includes(term));
  });
}