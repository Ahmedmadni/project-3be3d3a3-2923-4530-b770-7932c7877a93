import type { Condition, PossibleConditionResult } from "@/types/medical";

export const conditions: Condition[] = [
  { id: "anemia", name: "نقص الحديد / الأنيميا", summary: "انخفاض في مستوى الهيموغلوبين قد يسبب التعب والدوخة.", specialty: "طب الأسرة / الباطنية", whenToSeeDoctor: "إذا استمر التعب أو الدوخة لأكثر من أسبوعين أو لاحظت شحوبًا واضحًا.", careLevel: "routine" },
  { id: "orthostatic", name: "انخفاض الضغط الانتصابي", summary: "هبوط مؤقت في الضغط عند الوقوف بسرعة.", specialty: "الباطنية", whenToSeeDoctor: "إذا تكررت الدوخة أو حدث إغماء.", careLevel: "routine" },
  { id: "dehydration", name: "الجفاف", summary: "نقص السوائل في الجسم قد يسبب الدوخة والعطش.", specialty: "طب الأسرة", whenToSeeDoctor: "إذا لم تتحسن بعد شرب السوائل أو ظهر ارتباك.", careLevel: "self-care" },
  { id: "viral", name: "عدوى فيروسية", summary: "عدوى شائعة قد تسبب الحرارة والإرهاق.", specialty: "طب الأسرة", whenToSeeDoctor: "إذا استمرت الحرارة أكثر من ثلاثة أيام.", careLevel: "self-care" },
];

// Mock output — replaced later by the analysis engine.
export const mockResults: PossibleConditionResult[] = [
  { condition: conditions[0]!, compatibility: "high", matchedSymptoms: ["دوخة", "إرهاق", "شحوب"], reason: "ظهرت هذه الحالة ضمن النتائج بسبب وجود بعض الأعراض المتوافقة معها." },
  { condition: conditions[1]!, compatibility: "medium", matchedSymptoms: ["دوخة عند الوقوف"], reason: "قد تكون الأعراض مرتبطة بتغير الضغط عند تغيير الوضعية." },
  { condition: conditions[2]!, compatibility: "medium", matchedSymptoms: ["دوخة", "تعب"], reason: "بعض الأعراض قد تتوافق مع نقص السوائل." },
  { condition: conditions[3]!, compatibility: "low", matchedSymptoms: ["إرهاق"], reason: "توافق محدود مع الأعراض المدخلة." },
];
