import { BadgeCheck } from "lucide-react";
import type { CareLevel, Compatibility } from "@/types/medical";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

const compatClass: Record<Compatibility, string> = {
  high: "bg-primary-soft text-primary",
  medium: "bg-warning-soft text-warning",
  low: "bg-muted text-muted-foreground",
};

export function CompatibilityBadge({ level }: { level: Compatibility }) {
  const { t } = useI18n();
  return (
    <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", compatClass[level])}>
      {t(`compat.${level}` as never)}
    </span>
  );
}

const careClass: Record<CareLevel, string> = {
  emergency: "bg-destructive-soft text-destructive",
  urgent: "bg-warning-soft text-warning",
  routine: "bg-primary-soft text-primary",
  self_care: "bg-success-soft text-success",
};

export function CareLevelBadge({ level }: { level: CareLevel }) {
  const { t } = useI18n();
  return (
    <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", careClass[level])}>
      {t(`care.${level}` as never)}
    </span>
  );
}

export function ProfessionalBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground" dir="ltr">
      <BadgeCheck className="size-3.5" /> Professional
    </span>
  );
}
