/** Fixed-window limiter (same algorithm as public.consume_rate_limit). Used as a per-worker first line and in tests. */
export class FixedWindowLimiter {
  private hits = new Map<string, { window: number; count: number }>();
  constructor(private limit: number, private windowMs: number, private now: () => number = Date.now) {}
  consume(key: string): boolean {
    const w = Math.floor(this.now() / this.windowMs);
    const cur = this.hits.get(key);
    const count = cur && cur.window === w ? cur.count + 1 : 1;
    this.hits.set(key, { window: w, count });
    if (this.hits.size > 5000) this.hits.clear();
    return count <= this.limit;
  }
}

export const AI_LIMITS = { guestPerHour: 10, userPerHour: 30, ipPerHour: 40, windowSeconds: 3600 } as const;
