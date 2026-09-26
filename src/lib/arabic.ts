// Arabic normalisation for search/matching only. Never mutates the user's original text.
const DIACRITICS = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const TATWEEL = /\u0640/g;

export function normalizeArabic(input: string): string {
  return input
    .replace(DIACRITICS, "")
    .replace(TATWEEL, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة(?=\s|$)/g, "ه")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Loose "contains" used by symptom search boxes. */
export function arabicIncludes(haystack: string, needle: string): boolean {
  const n = normalizeArabic(needle);
  return !n || normalizeArabic(haystack).includes(n);
}
