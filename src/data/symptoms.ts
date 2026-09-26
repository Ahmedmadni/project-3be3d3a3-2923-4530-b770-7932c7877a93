import type { Symptom } from "@/types/legacy-ui";

export const symptoms: Symptom[] = [
  { id: "headache", name: "صداع" },
  { id: "dizziness", name: "دوخة" },
  { id: "fatigue", name: "تعب وإرهاق" },
  { id: "fever", name: "ارتفاع حرارة" },
  { id: "cough", name: "كحة" },
  { id: "dyspnea", name: "ضيق تنفس", isRedFlag: true },
  { id: "chest-pain", name: "ألم صدر", isRedFlag: true },
  { id: "abdominal-pain", name: "ألم بطن" },
  { id: "nausea", name: "غثيان" },
  { id: "vomiting", name: "قيء" },
  { id: "diarrhea", name: "إسهال" },
  { id: "constipation", name: "إمساك" },
  { id: "palpitations", name: "خفقان" },
  { id: "thirst", name: "عطش زائد" },
  { id: "polyuria", name: "كثرة التبول" },
  { id: "back-pain", name: "ألم ظهر" },
  { id: "joint-pain", name: "ألم مفاصل" },
];

export const symptomName = (id: string) => symptoms.find((s) => s.id === id)?.name ?? id;
