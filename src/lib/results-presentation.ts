import type { CareLevel } from "@/types/medical";
import type { TKey } from "@/i18n";

export interface CarePresentation {
  titleKey: TKey;
  descriptionKey: TKey;
  tone: "danger" | "warning" | "primary" | "success";
  href?: "/emergency";
  actionKey?: TKey;
}

const presentations: Record<CareLevel, CarePresentation> = {
  emergency: {
    titleKey: "results.next.emergency.title",
    descriptionKey: "results.next.emergency.desc",
    tone: "danger",
    href: "/emergency",
    actionKey: "results.next.emergency.action",
  },
  urgent: {
    titleKey: "results.next.urgent.title",
    descriptionKey: "results.next.urgent.desc",
    tone: "warning",
  },
  routine: {
    titleKey: "results.next.routine.title",
    descriptionKey: "results.next.routine.desc",
    tone: "primary",
  },
  self_care: {
    titleKey: "results.next.self_care.title",
    descriptionKey: "results.next.self_care.desc",
    tone: "success",
  },
};

export function resultCarePresentation(level: CareLevel): CarePresentation {
  return presentations[level];
}
