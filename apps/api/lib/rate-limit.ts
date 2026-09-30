import type { Store } from "./store";

export interface RateLimitRule {
  /** Requests allowed per window. */
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Fixed window per install id: one counter per (bucket, id, window). Simple and
 * cheap; a burst at a window edge can reach twice the limit, which is fine here.
 */
export async function rateLimit(
  store: Store,
  bucket: string,
  installId: string,
  rule: RateLimitRule,
  now: number = Date.now()
): Promise<RateLimitResult> {
  const windowMs = rule.windowSeconds * 1000;
  const windowIndex = Math.floor(now / windowMs);
  const count = await store.incr(
    `ratelimit:${bucket}:${installId}:${windowIndex}`,
    rule.windowSeconds
  );
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil(((windowIndex + 1) * windowMs - now) / 1000)
  );
  return {
    ok: count <= rule.limit,
    remaining: Math.max(0, rule.limit - count),
    retryAfterSeconds,
  };
}
