import type { SymptomSession } from "@/types/legacy-ui";
import type { RedFlagOutput } from "./red-flag-engine";

// Temporary client storage — swap for database persistence later.
const KEY = "mh.session";
export interface StoredSession { session: SymptomSession; triage: RedFlagOutput }

export const sessionStore = {
  save(v: StoredSession) { sessionStorage.setItem(KEY, JSON.stringify(v)); },
  load(): StoredSession | null {
    try { const r = sessionStorage.getItem(KEY); return r ? JSON.parse(r) : null; } catch { return null; }
  },
};
