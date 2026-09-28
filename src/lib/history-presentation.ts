import type { CareLevel } from "@/types/medical";

export type HistoryTone = "danger" | "warning" | "primary" | "success";

export function historyTone(level: CareLevel | null): HistoryTone {
  if (level === "emergency") return "danger";
  if (level === "urgent") return "warning";
  if (level === "self_care") return "success";
  return "primary";
}

export function isEmergencyHistorySession(
  status: string,
  level: CareLevel | null,
): boolean {
  return status === "emergency_redirected" || level === "emergency";
}

export function historyPreviewNames(names: string[], limit = 3): string[] {
  return names.filter(Boolean).slice(0, Math.max(1, limit));
}
