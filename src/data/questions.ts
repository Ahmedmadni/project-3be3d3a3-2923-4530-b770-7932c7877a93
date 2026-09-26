import type { Question } from "@/types/medical";

const ynu = [
  { value: "yes", label: "نعم" },
  { value: "no", label: "لا" },
  { value: "unsure", label: "غير متأكد" },
];
const yn = ynu.slice(0, 2);

// Mock follow-up questions — will come from the database.
export const questions: Question[] = [
  { id: "dz-standing", symptomId: "dizziness", text: "هل تحدث الدوخة عند الوقوف بسرعة؟", type: "yes_no_unsure", options: ynu },
  { id: "dz-faint", symptomId: "dizziness", text: "هل حدث إغماء أو فقدان وعي؟", type: "yes_no", options: yn },
  { id: "cp-exertion", symptomId: "chest-pain", text: "هل يمتد الألم إلى الذراع أو الفك أو الظهر؟", type: "yes_no_unsure", options: ynu },
  { id: "dy-rest", symptomId: "dyspnea", text: "هل تشعر بصعوبة شديدة في التنفس أثناء الراحة؟", type: "yes_no", options: yn },
  { id: "fv-days", symptomId: "fever", text: "هل استمرت الحرارة أكثر من ثلاثة أيام؟", type: "yes_no_unsure", options: ynu },
  { id: "hd-worst", symptomId: "headache", text: "هل هذا أسوأ صداع شعرت به في حياتك وبدأ فجأة؟", type: "yes_no_unsure", options: ynu },
];

export const genericQuestions: Question[] = [
  { id: "gen-worse", text: "هل تزداد الأعراض سوءًا مع الوقت؟", type: "yes_no_unsure", options: ynu },
];

export const questionsFor = (symptomIds: string[]) => {
  const list = questions.filter((q) => q.symptomId && symptomIds.includes(q.symptomId));
  return list.length ? list : genericQuestions;
};
