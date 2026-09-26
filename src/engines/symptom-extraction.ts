import type { Symptom } from "@/types/medical";

export interface CandidateSymptom { symptomId: string; confidence: "low" | "medium" | "high" }

/** Contract for extracting symptoms from free text. Swap the implementation later (AI) without UI changes. */
export interface SymptomExtractionService {
  extract(text: string, catalog: Pick<Symptom, "id" | "name_ar">[]): Promise<CandidateSymptom[]>;
}

/** Mock: naive keyword match on the Arabic name. Not AI. */
export class MockSymptomExtractionService implements SymptomExtractionService {
  async extract(text: string, catalog: Pick<Symptom, "id" | "name_ar">[]) {
    const t = text.trim();
    if (!t) return [];
    return catalog
      .filter((s) => { const w = s.name_ar.split(" ")[0] ?? s.name_ar; return t.includes(w); })
      .map((s) => ({ symptomId: s.id, confidence: "low" as const }));
  }
}

export const symptomExtractor: SymptomExtractionService = new MockSymptomExtractionService();
