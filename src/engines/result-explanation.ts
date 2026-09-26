import type { PossibleConditionResult, Symptom } from "@/types/medical";

/**
 * ResultExplanationService — turns engine reason codes into user-facing text.
 * Only uses data present in the engine result; never invents reasons.
 */
export const ResultExplanationService = {
  explain(result: PossibleConditionResult, symptoms: Pick<Symptom, "id" | "name_ar">[]): string[] {
    const name = (id?: string) => symptoms.find((s) => s.id === id)?.name_ar ?? "";
    const primary = result.reasonCodes.filter((r) => r.code === "MATCHED_PRIMARY_SYMPTOM").map((r) => name(r.symptomId));
    const secondary = result.reasonCodes.filter((r) => r.code === "MATCHED_SECONDARY_SYMPTOM").map((r) => name(r.symptomId));
    const contra = result.reasonCodes.filter((r) => r.code === "CONTRADICTING_FINDING").map((r) => name(r.symptomId));
    const lines: string[] = [];
    if (primary.length) lines.push(`أعراض أساسية متوافقة: ${primary.join("، ")}.`);
    if (secondary.length) lines.push(`أعراض مساندة متوافقة: ${secondary.join("، ")}.`);
    if (contra.length) lines.push(`أعراض لا تتوافق عادةً مع هذه الحالة: ${contra.join("، ")}.`);
    if (!lines.length) lines.push("ظهرت هذه الحالة بسبب وجود بعض الأعراض المتوافقة معها.");
    return lines;
  },
};
