import type { Language } from ".";

export function localizedText(
  lang: Language,
  ar: string | null | undefined,
  en: string | null | undefined,
  missing: string,
): string {
  if (lang === "ar") return ar?.trim() || missing;
  return en?.trim() || missing;
}
