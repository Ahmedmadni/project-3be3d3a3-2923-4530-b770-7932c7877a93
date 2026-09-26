import { BadgeCheck } from "lucide-react";
import type { CareLevel, Compatibility } from "@/types/medical";
import { cn } from "@/lib/utils";

const compat: Record<Compatibility, [string, string]> = {
  high: ["توافق مرتفع", "bg-primary-soft text-primary"],
  medium: ["توافق متوسط", "bg-warning-soft text-warning"],
  low: ["توافق منخفض", "bg-muted text-muted-foreground"],
};
export function CompatibilityBadge({ level }: { level: Compatibility }) {
  const [label, cls] = compat[level];
  return <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", cls)}>{label}</span>;
}

const care: Record<CareLevel, [string, string]> = {
  emergency: ["طوارئ", "bg-destructive-soft text-destructive"],
  urgent: ["رعاية عاجلة", "bg-warning-soft text-warning"],
  routine: ["مراجعة طبيب", "bg-primary-soft text-primary"],
  self_care: ["رعاية ذاتية", "bg-success-soft text-success"],
};
export function CareLevelBadge({ level }: { level: CareLevel }) {
  const [label, cls] = care[level];
  return <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", cls)}>{label}</span>;
}

export function ProfessionalBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground" dir="ltr">
      <BadgeCheck className="size-3.5" /> Professional
    </span>
  );
}
