import { Link } from "@tanstack/react-router";
import { Siren } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmergencyButton({ compact, className }: { compact?: boolean; className?: string }) {
  return (
    <Link
      to="/emergency"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full bg-destructive font-semibold text-destructive-foreground shadow-danger transition-transform active:scale-95",
        compact ? "px-3.5 py-2 text-[13px]" : "px-5 py-3 text-sm",
        className,
      )}
    >
      <Siren className="size-4" />
      حالة طارئة
    </Link>
  );
}
