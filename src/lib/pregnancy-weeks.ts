import type { PregnancyVisit, PregnancyWarningSign, PregnancyWeek } from "@/types/medical";

/** Gestational week the user is "in": 0 completed weeks = week 1, capped at 40. */
export function currentGestationalWeek(completedWeeks: number): number {
  return Math.min(40, Math.max(1, completedWeeks + 1));
}

export function weekContent(items: PregnancyWeek[], week: number): PregnancyWeek | undefined {
  return items.find((w) => w.week === week);
}

/** Warning signs for a trimester: throughout items plus the stage's own items; urgent items first. */
export function warningsForStage(items: PregnancyWarningSign[], stage: number): PregnancyWarningSign[] {
  const visible = items.filter((item) => item.scope === "throughout" || item.stages.includes(stage));
  const rank = (s: PregnancyWarningSign) => (s.severity === "emergency" ? 0 : 1);
  return [...visible].sort((a, b) => rank(a) - rank(b));
}

/** Visits/tests shown for a trimester, ordered by starting week. Items without a trimester list show everywhere. */
export function visitsForStage(items: PregnancyVisit[], stage: number): PregnancyVisit[] {
  return items
    .filter((item) => !item.trimesters || item.trimesters.includes(stage))
    .sort((a, b) => a.weeks[0] - b.weeks[0]);
}
