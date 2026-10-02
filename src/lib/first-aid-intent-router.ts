import { normalizeArabic } from "./arabic";

export type FirstAidIntentCode =
  | "bleeding"
  | "burns"
  | "fainting"
  | "choking"
  | "seizures"
  | "head_injury"
  | "fractures"
  | "poisoning"
  | "anaphylaxis"
  | "chest_pain"
  | "breathing"
  | "eye_injury";

export type FirstAidIntentMatch = {
  code: FirstAidIntentCode;
  score: number;
  matchedPhrases: string[];
};

const phrases: Record<FirstAidIntentCode, readonly string[]> = {
  bleeding: [
    "نزيف",
    "ينزف",
    "نزف",
    "جرح بينزف",
    "جرح ينزف",
    "دم كتير",
    "bleeding",
    "heavy bleeding",
    "wound bleeding",
  ],
  burns: [
    "حرق",
    "حروق",
    "محروق",
    "اتحرق",
    "ماء مغلي",
    "زيت ساخن",
    "burn",
    "burned",
    "scald",
  ],
  fainting: [
    "اغمي عليه",
    "اغمى عليه",
    "فقد الوعي",
    "وقع ومش واعي",
    "إغماء",
    "اغماء",
    "fainted",
    "fainting",
    "passed out",
  ],
  choking: [
    "اختناق",
    "يختنق",
    "شرق",
    "شرقان",
    "مش قادر يتكلم",
    "اكل وقف في حلقه",
    "حاجه في حلقه",
    "choking",
    "food stuck in throat",
  ],
  seizures: [
    "تشنج",
    "تشنجات",
    "نوبه تشنج",
    "نوبة تشنج",
    "صرع",
    "بيرتعش ومش واعي",
    "seizure",
    "convulsion",
  ],
  head_injury: [
    "خبط راسه",
    "ضربه في الراس",
    "ضربة في الرأس",
    "اصابه في الراس",
    "إصابة الرأس",
    "وقع على راسه",
    "head injury",
    "hit head",
  ],
  fractures: [
    "كسر",
    "اتكسر",
    "عظم مكسور",
    "ايده اتكسرت",
    "رجله اتكسرت",
    "تشوه بعد وقعه",
    "fracture",
    "broken bone",
  ],
  poisoning: [
    "تسمم",
    "سم",
    "شرب منظف",
    "بلع منظف",
    "ابتلع دواء",
    "جرعه زايده",
    "جرعة زائدة",
    "poisoning",
    "swallowed chemical",
    "overdose",
  ],
  anaphylaxis: [
    "حساسيه شديده",
    "حساسية شديدة",
    "تورم اللسان",
    "تورم الحلق",
    "حساسيه ومش قادر يتنفس",
    "حساسية ومش قادر يتنفس",
    "anaphylaxis",
    "severe allergic reaction",
    "throat swelling allergy",
  ],
  chest_pain: [
    "الم في الصدر",
    "ألم في الصدر",
    "وجع صدر",
    "ضغط في الصدر",
    "ثقل في الصدر",
    "chest pain",
    "chest pressure",
    "heart attack",
  ],
  breathing: [
    "ضيق نفس",
    "صعوبه تنفس",
    "صعوبة تنفس",
    "مش قادر يتنفس",
    "نفسه قصير",
    "يلهث",
    "shortness of breath",
    "difficulty breathing",
    "gasping",
  ],
  eye_injury: [
    "اصابه في العين",
    "إصابة العين",
    "ماده كيميائيه في العين",
    "مادة كيميائية في العين",
    "دخل حاجه في عينه",
    "دخل شيء في عينه",
    "ضربه في العين",
    "eye injury",
    "chemical in eye",
    "object in eye",
  ],
};

export function classifyFirstAidIntent(
  input: string,
  limit = 3,
): FirstAidIntentMatch[] {
  const normalizedInput = normalizeMixed(input);
  if (!normalizedInput) return [];

  const matches = (Object.entries(phrases) as Array<
    [FirstAidIntentCode, readonly string[]]
  >)
    .map(([code, candidates]) => {
      const matchedPhrases = candidates.filter((phrase) =>
        normalizedInput.includes(normalizeMixed(phrase)),
      );

      const score = matchedPhrases.reduce(
        (total, phrase) => total + phraseWeight(phrase),
        0,
      );

      return { code, score, matchedPhrases };
    })
    .filter((match) => match.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.matchedPhrases.length - a.matchedPhrases.length ||
        a.code.localeCompare(b.code),
    );

  return matches.slice(0, Math.max(1, limit));
}

export function matchesFirstAidIntent(
  input: string,
  code: string,
): boolean {
  return classifyFirstAidIntent(input, 12).some(
    (match) => match.code === code,
  );
}

function normalizeMixed(value: string): string {
  return normalizeArabic(value)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function phraseWeight(phrase: string): number {
  const words = normalizeMixed(phrase).split(" ").filter(Boolean).length;
  return words >= 3 ? 4 : words === 2 ? 3 : 1;
}
