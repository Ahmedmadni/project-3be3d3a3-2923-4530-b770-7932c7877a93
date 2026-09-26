import { parseExtractionOutput, type CatalogItem, type ExtractionResult, type SymptomExtractionService } from "./symptom-extraction";

export type ExtractCaller = (payload: { text: string; catalog: { code: string; name_ar: string; name_en: string | null }[] }) =>
  Promise<{ ok: true; raw: string } | { ok: false; error: string }>;

/** Calls the server-side AI endpoint; output is validated against the catalog before use. */
export class RealSymptomExtractionService implements SymptomExtractionService {
  constructor(private call: ExtractCaller) {}
  async extract(text: string, catalog: CatalogItem[]): Promise<ExtractionResult> {
    const r = await this.call({ text, catalog: catalog.map((c) => ({ code: c.code, name_ar: c.name_ar, name_en: c.name_en })) });
    if (!r.ok) throw new Error(r.error);
    return parseExtractionOutput(JSON.parse(r.raw), catalog, "ai");
  }
}
