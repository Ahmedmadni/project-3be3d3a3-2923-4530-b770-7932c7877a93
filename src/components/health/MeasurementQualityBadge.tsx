import { CheckCircle2, CircleHelp, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const styles = {
  good: {
    label: "جيدة",
    className: "bg-success-soft text-success",
    Icon: CheckCircle2,
  },
  questionable: {
    label: "تحتاج مراجعة",
    className: "bg-warning-soft text-warning",
    Icon: TriangleAlert,
  },
  unknown: {
    label: "غير مقيّمة",
    className: "bg-muted text-muted-foreground",
    Icon: CircleHelp,
  },
} as const;

export function MeasurementQualityBadge({
  quality,
  className,
}: {
  quality: keyof typeof styles;
  className?: string;
}) {
  const item = styles[quality];
  const Icon = item.Icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        item.className,
        className,
      )}
    >
      <Icon className="size-3.5" />
      {item.label}
    </span>
  );
}
