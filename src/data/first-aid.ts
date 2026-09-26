import type { FirstAidTopic } from "@/types/medical";

// Content structure only — clinical protocols will be added after medical review.
export const firstAidTopics: FirstAidTopic[] = [
  { slug: "bleeding", title: "نزيف وجروح", summary: "التعامل الأولي مع الجروح والنزيف.", icon: "Droplet", critical: true },
  { slug: "burns", title: "حروق", summary: "خطوات أولية للحروق البسيطة والشديدة.", icon: "Flame" },
  { slug: "fainting", title: "إغماء", summary: "ما يجب فعله عند فقدان الوعي المؤقت.", icon: "PersonStanding" },
  { slug: "choking", title: "اختناق", summary: "التعامل مع انسداد مجرى الهواء.", icon: "Wind", critical: true },
  { slug: "seizures", title: "تشنجات", summary: "كيف تحمي الشخص أثناء النوبة.", icon: "Zap", critical: true },
  { slug: "head-injury", title: "إصابات الرأس", summary: "علامات يجب الانتباه لها بعد الإصابة.", icon: "Brain" },
  { slug: "fractures", title: "كسور", summary: "تثبيت الإصابة حتى وصول المساعدة.", icon: "Bone" },
  { slug: "poisoning", title: "تسمم", summary: "خطوات أولية عند الاشتباه بالتسمم.", icon: "FlaskConical", critical: true },
  { slug: "anaphylaxis", title: "حساسية شديدة", summary: "التعرف على الحساسية المفرطة.", icon: "ShieldAlert", critical: true },
  { slug: "chest-pain", title: "ألم الصدر", summary: "متى يكون ألم الصدر حالة طارئة.", icon: "HeartPulse", critical: true },
  { slug: "breathing", title: "ضيق التنفس", summary: "التعامل مع صعوبة التنفس المفاجئة.", icon: "Activity", critical: true },
  { slug: "eye-injury", title: "إصابات العين", summary: "حماية العين حتى التقييم الطبي.", icon: "Eye" },
];

export const firstAidSections = [
  { key: "whatIsHappening", title: "ما الذي يحدث؟" },
  { key: "whenToCall", title: "متى أتصل بالطوارئ؟" },
  { key: "doNow", title: "ماذا أفعل الآن؟" },
  { key: "dontDo", title: "ماذا لا أفعل؟" },
  { key: "whileWaiting", title: "أثناء انتظار الإسعاف" },
  { key: "sources", title: "المصادر الطبية" },
  { key: "lastReviewed", title: "تاريخ آخر مراجعة" },
] as const;

export const getFirstAid = (slug: string) => firstAidTopics.find((t) => t.slug === slug);
