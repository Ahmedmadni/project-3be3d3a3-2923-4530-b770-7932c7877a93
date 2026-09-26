import { z } from "zod";
import type { Symptom } from "@/types/medical";
import { normalizeArabic } from "@/lib/arabic";

/**
 * AI-assisted extraction: Text → candidate symptoms from the existing catalog ONLY.
 * Never diagnoses, never ranks conditions, never sets a care level. Candidates are
 * suggestions until the user confirms them.
 */
export interface ExtractionCandidate {
  symptomId: string;
  symptomCode: string;
  /** internal only — never shown to users */
  confidence: number;
  evidenceText: string;
  negated: boolean;
}
export interface ExtractionResult { candidates: ExtractionCandidate[]; unresolvedTerms: string[]; source: "ai" | "mock" }
export type CatalogItem = Pick<Symptom, "id" | "code" | "name_ar" | "name_en">;

export interface SymptomExtractionService {
  extract(text: string, catalog: CatalogItem[]): Promise<ExtractionResult>;
}

export const MAX_EXTRACTION_CHARS = 2000;

/** Raw model output schema (strict). */
export const rawExtractionSchema = z.object({
  candidates: z.array(z.object({
    symptomCode: z.string().max(80),
    confidence: z.number().min(0).max(1),
    evidenceText: z.string().max(300),
    negated: z.boolean(),
  })).max(30),
  unresolvedTerms: z.array(z.string().max(80)).max(20),
});

/**
 * Validates untrusted model output against the catalog. Unknown codes never become
 * symptoms — they are moved to unresolvedTerms. Duplicates are merged.
 */
export function parseExtractionOutput(raw: unknown, catalog: CatalogItem[], source: ExtractionResult["source"] = "ai"): ExtractionResult {
  const parsed = rawExtractionSchema.safeParse(raw);
  if (!parsed.success) throw new Error("INVALID_EXTRACTION_OUTPUT");
  const byCode = new Map(catalog.map((c) => [c.code, c]));
  const seen = new Set<string>();
  const unresolved = new Set(parsed.data.unresolvedTerms.map((t) => t.trim()).filter(Boolean));
  const candidates: ExtractionCandidate[] = [];
  for (const c of parsed.data.candidates) {
    const hit = byCode.get(c.symptomCode);
    if (!hit) { if (c.evidenceText.trim()) unresolved.add(c.evidenceText.trim()); continue; }
    if (seen.has(hit.id)) continue;
    seen.add(hit.id);
    candidates.push({ symptomId: hit.id, symptomCode: hit.code, confidence: c.confidence, evidenceText: c.evidenceText, negated: c.negated });
  }
  return { candidates, unresolvedTerms: [...unresolved].slice(0, 20), source };
}

/** Only non-negated candidates can be pre-selected for the user to confirm. */
export function selectableCandidates(r: ExtractionResult): ExtractionCandidate[] {
  return r.candidates.filter((c) => !c.negated);
}

const NEGATIONS = ["ما عندي", "ما عنديش", "ماعندي", "ليس عندي", "لا يوجد", "لا اعاني", "لا أعاني", "بدون", "مافي", "ما في", "لا أشعر", "لا اشعر", "no ", "not ", "without", "don't have", "dont have"];

/** Deterministic keyword matcher with basic negation detection. No AI. */
export class MockSymptomExtractionService implements SymptomExtractionService {
  async extract(text: string, catalog: CatalogItem[]): Promise<ExtractionResult> {
    const t = normalizeArabic(text.slice(0, MAX_EXTRACTION_CHARS));
    if (!t) return { candidates: [], unresolvedTerms: [], source: "mock" };
    const clauses = t.split(/[.،,؛;!?\n]|\sو(?=\S)/).map((c) => c.trim()).filter(Boolean);
    const negs = NEGATIONS.map(normalizeArabic);
    const out: ExtractionCandidate[] = [];
    for (const s of catalog) {
      const keys = [s.name_ar.split(" ")[0] ?? s.name_ar, s.name_en ?? ""].map(normalizeArabic).filter((k) => k.length >= 3);
      const clause = clauses.find((c) => keys.some((k) => c.includes(k)));
      if (!clause) continue;
      out.push({ symptomId: s.id, symptomCode: s.code, confidence: 0.4, evidenceText: clause, negated: negs.some((n) => clause.includes(n)) });
    }
    return { candidates: out, unresolvedTerms: [], source: "mock" };
  }
}

/** Wraps any service: on failure/timeout returns null so the UI falls back to manual selection. */
export async function extractWithFallback(svc: SymptomExtractionService, text: string, catalog: CatalogItem[], timeoutMs = 25_000): Promise<ExtractionResult | null> {
  try {
    return await Promise.race([
      svc.extract(text, catalog),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("TIMEOUT")), timeoutMs)),
    ]);
  } catch {
    return null;
  }
}

export const mockExtractor: SymptomExtractionService = new MockSymptomExtractionService();
