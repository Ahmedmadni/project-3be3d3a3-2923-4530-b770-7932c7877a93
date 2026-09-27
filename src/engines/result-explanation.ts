import type { PossibleConditionResult, Symptom } from "@/types/medical";
import type { Language } from "@/i18n";
import { localizedText } from "@/i18n/localized";

/**
 * Turns engine reason codes into user-facing text using only data in the result.
 * It never invents additional clinical reasons.
 */
export const ResultExplanationService = {
  explain(
    result: PossibleConditionResult,
    symptoms: Pick<Symptom, "id" | "name_ar" | "name_en">[],
    lang: Language = "ar",
    missing = "",
  ): string[] {
    const name = (id?: string) => {
      const symptom = symptoms.find((s) => s.id === id);
      return symptom ? localizedText(lang, symptom.name_ar, symptom.name_en, missing) : "";
    };
    const primary = result.reasonCodes.filter((r) => r.code === "MATCHED_PRIMARY_SYMPTOM").map((r) => name(r.symptomId)).filter(Boolean);
    const secondary = result.reasonCodes.filter((r) => r.code === "MATCHED_SECONDARY_SYMPTOM").map((r) => name(r.symptomId)).filter(Boolean);
    const contra = result.reasonCodes.filter((r) => r.code === "CONTRADICTING_FINDING").map((r) => name(r.symptomId)).filter(Boolean);
    const lines: string[] = [];
    if (lang === "ar") {
      if (primary.length) lines.push(`أعراض أساسية متوافقة: ${primary.join("، ")}.`);
      if (secondary.length) lines.push(`أعراض مساندة متوافقة: ${secondary.join("، ")}.`);
      if (contra.length) lines.push(`أعراض لا تتوافق عادةً مع هذه الحالة: ${contra.join("، ")}.`);
      if (!lines.length) lines.push("ظهرت هذه الحالة بسبب وجود بعض الأعراض المتوافقة معها.");
    } else {
      if (primary.length) lines.push(`Core matching symptoms: ${primary.join(", ")}.`);
      if (secondary.length) lines.push(`Supporting matching symptoms: ${secondary.join(", ")}.`);
      if (contra.length) lines.push(`Symptoms that do not usually match this condition: ${contra.join(", ")}.`);
      if (!lines.length) lines.push("This condition appeared because some of the entered symptoms match it.");
    }
    return lines;
  },
};
