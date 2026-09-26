import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ar, type TKey } from "./ar";
import { en } from "./en";
import { supabase } from "@/integrations/supabase/client";

export type Lang = "ar" | "en";
const dicts = { ar, en };
const STORAGE_KEY = "mh.lang"; // non-sensitive guest preference

export const dirFor = (l: Lang) => (l === "ar" ? "rtl" : "ltr") as "rtl" | "ltr";
export function translate(lang: Lang, key: TKey, vars?: Record<string, string | number>): string {
  let s: string = dicts[lang][key] ?? ar[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}
/** Picks the stored preference: signed-in profile wins, then local guest preference, then default. */
export function resolveLanguage(profileLang: string | null | undefined, localLang: string | null | undefined, fallback: Lang = "ar"): Lang {
  const ok = (v: unknown): v is Lang => v === "ar" || v === "en";
  if (ok(profileLang)) return profileLang;
  if (ok(localLang)) return localLang;
  return fallback;
}
/** Localized medical field. Returns null when the English version is missing (no silent Arabic fallback). */
export function localized<T extends Record<string, unknown>>(row: T, base: string, lang: Lang): string | null {
  const v = row[`${base}_${lang}`];
  return typeof v === "string" && v.trim() ? v : null;
}

interface Ctx { lang: Lang; dir: "rtl" | "ltr"; setLang: (l: Lang) => void; t: (k: TKey, vars?: Record<string, string | number>) => string }
const I18nCtx = createContext<Ctx>({ lang: "ar", dir: "rtl", setLang: () => {}, t: (k) => translate("ar", k) });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");

  useEffect(() => {
    const local = localStorage.getItem(STORAGE_KEY);
    setLangState(resolveLanguage(null, local));
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase.from("profiles").select("preferred_language").eq("id", data.user.id).maybeSingle();
      setLangState(resolveLanguage(p?.preferred_language, local));
    });
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dirFor(lang);
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) supabase.from("profiles").update({ preferred_language: l }).eq("id", data.user.id).then(() => {});
    });
  }, []);

  const value = useMemo<Ctx>(() => ({ lang, dir: dirFor(lang), setLang, t: (k, v) => translate(lang, k, v) }), [lang, setLang]);
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export const useI18n = () => useContext(I18nCtx);
export type { TKey };
