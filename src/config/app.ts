// Central app config. Emergency numbers here are only an offline fallback;
// the source of truth is the emergency_contacts table.
export const appConfig = {
  name: "مؤشر صحي",
  locale: "ar" as const,
  dir: "rtl" as const,
  defaultCountry: "SA",
  /** "development" allows demo (unreviewed) conditions; switch to "production" once content is reviewed. */
  contentMode: "development" as "development" | "production",
  /** "real" = server-side AI extraction; "mock" = deterministic keyword matcher (no API key needed). */
  symptomExtraction: "real" as "real" | "mock",
  supportedLanguages: ["ar", "en"] as const,
  emergencyFallback: {
    ambulance: { label: "الإسعاف", number: "997" },
    healthConsultation: { label: "وزارة الصحة", number: "937" },
  },
};
export type AppConfig = typeof appConfig;

export const firstAidSectionTypes = [
  { key: "what_is_happening", title: "ما الذي يحدث؟" },
  { key: "when_to_call", title: "متى أتصل بالطوارئ؟" },
  { key: "do_now", title: "ماذا أفعل الآن؟" },
  { key: "dont_do", title: "ماذا لا أفعل؟" },
  { key: "while_waiting", title: "أثناء انتظار الإسعاف" },
] as const;
