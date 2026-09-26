import type { PossibleConditionResult, TriageResult } from "@/types/medical";

// Tab-scoped only (sessionStorage) — cleared when the tab closes. Never localStorage.
const KEY = "mh.lastResult";
const GUEST = "mh.guestId";

export interface StoredResult { sessionId: string | null; triage: TriageResult; results: PossibleConditionResult[]; symptomIds: string[] }

export const resultStore = {
  save(v: StoredResult) { sessionStorage.setItem(KEY, JSON.stringify(v)); },
  load(): StoredResult | null {
    try { const r = sessionStorage.getItem(KEY); return r ? (JSON.parse(r) as StoredResult) : null; } catch { return null; }
  },
};

/** Random, per-tab guest identifier (crypto UUID). */
export function guestId(): string {
  let id = sessionStorage.getItem(GUEST);
  if (!id) { id = crypto.randomUUID(); sessionStorage.setItem(GUEST, id); }
  return id;
}
