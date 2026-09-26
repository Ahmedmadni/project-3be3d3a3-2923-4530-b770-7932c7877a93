// Central app config. Later loaded from Settings/Database.
export const appConfig = {
  name: "مؤشر صحي",
  locale: "ar" as const,
  dir: "rtl" as const,
  emergency: {
    ambulance: { label: "الإسعاف", number: "997" },
    general: { label: "الطوارئ", number: "911" },
  },
};
export type AppConfig = typeof appConfig;
