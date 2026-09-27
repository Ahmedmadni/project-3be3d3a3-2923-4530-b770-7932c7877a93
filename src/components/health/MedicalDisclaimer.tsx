import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

export function MedicalDisclaimer({
  text,
  className,
}: { text?: string; className?: string }) {
  const { t } = useI18n();
  return (
    <p className={cn("flex items-start gap-2 rounded-2xl bg-primary-soft/60 px-4 py-3 text-xs leading-relaxed text-muted-foreground", className)}>
      <Info className="mt-0.5 size-4 shrink-0 text-primary" />
      <span>{text ?? t("medical.disclaimer")}</span>
    </p>
  );
}
