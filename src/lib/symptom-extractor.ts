import { symptoms } from "@/data/symptoms";

/**
 * Placeholder for future AI extraction from free text.
 * Currently a naive keyword match.
 */
export async function extractSymptoms(text: string): Promise<string[]> {
  return symptoms.filter((s) => text.includes(s.name.split(" ")[0] ?? s.name)).map((s) => s.id);
}
