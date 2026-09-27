import type { PossibleConditionResult, Symptom } from "@/types/medical";
import type { Lang } from "@/i18n";

/**
 * ResultExplanationService — turns engine reason codes into user-facing text.
 * Only uses data present in the engine result; never invents reasons.
 */
export const ResultExplanationService = {
  explain(
    result: PossibleConditionResult,
    symptoms: Pick<Symptom, "id" | "name_ar" | "name_en">[],
    lang: Lang = "ar",
  ): string[] {
    const name = (id?: string) => {
      const symptom = symptoms.find((s) => s.id === id);
      if (!symptom) return "";
      if (lang === "en") return symptom.name_en?.trim() ?? "";
      return symptom.name_ar;
    };
    const values = (code: PossibleConditionResult["reasonCodes"][number]["code"]) =>
      result.reasonCodes.filter((r) => r.code === code).map((r) => name(r.symptomId)).filter(Boolean);

    const primary = values("MATCHED_PRIMARY_SYMPTOM");
    const secondary = values("MATCHED_SECONDARY_SYMPTOM");
    const contra = values("CONTRADICTING_FINDING");
    const lines: string[] = [];

    if (lang === "en") {
      if (primary.length) lines.push(`Matching core symptoms: ${primary.join(", ")}.`);
      if (secondary.length) lines.push(`Matching supporting symptoms: ${secondary.join(", ")}.`);
      if (contra.length) lines.push(`Findings that are not usually consistent with this condition: ${contra.join(", ")}.`);
      if (!lines.length) lines.push("This condition appeared because some of the confirmed symptoms were consistent with its configured rules.");
      return lines;
    }

    if (primary.length) lines.push(`أعراض أساسية متوافقة: ${primary.join("، ")}.`);
    if (secondary.length) lines.push(`أعراض مساندة متوافقة: ${secondary.join("، ")}.`);
    if (contra.length) lines.push(`أعراض لا تتوافق عادةً مع هذه الحالة: ${contra.join("، ")}.`);
    if (!lines.length) lines.push("ظهرت هذه الحالة بسبب وجود بعض الأعراض المتوافقة معها.");
    return lines;
  },
};
