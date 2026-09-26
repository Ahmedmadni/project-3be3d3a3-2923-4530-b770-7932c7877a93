import type { CareLevel } from "@/types/medical";

const order: CareLevel[] = ["self_care", "routine", "urgent", "emergency"];

/** Returns the more serious of two care levels. */
export function maxCareLevel(a: CareLevel, b: CareLevel): CareLevel {
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
}

export const isEmergency = (l: CareLevel) => l === "emergency";

export const careLevelLabel: Record<CareLevel, string> = {
  emergency: "طوارئ",
  urgent: "رعاية عاجلة",
  routine: "مراجعة طبيب",
  self_care: "رعاية ذاتية",
};
