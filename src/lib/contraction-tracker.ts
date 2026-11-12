/** A session-only log for describing contractions, never for clinical triage. */
export interface ContractionRecord {
  startedAt: number;
  endedAt: number;
}

export function contractionSeconds(record: ContractionRecord): number {
  if (!Number.isFinite(record.startedAt) || !Number.isFinite(record.endedAt)) return 0;
  return Math.max(0, Math.floor((record.endedAt - record.startedAt) / 1000));
}

export function intervalSincePrevious(
  records: ContractionRecord[],
  index: number,
): number | null {
  const current = records[index];
  const previous = records[index + 1]; // newest first
  if (!current || !previous || current.startedAt < previous.startedAt) return null;
  return Math.floor((current.startedAt - previous.startedAt) / 1000);
}

export function formatElapsed(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  return String(Math.floor(safe / 60)) + ":" + String(safe % 60).padStart(2, "0");
}
