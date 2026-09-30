import { errorResponse } from "./http";
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

/** Caller IP: first `x-forwarded-for` entry, else `x-real-ip`, else "unknown". */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export const IP_RULE: RateLimitRule = { limit: 60, windowSeconds: 60 };

export function rateLimitedResponse(retryAfterSeconds: number): Response {
  return errorResponse(429, "rate_limited", "Too many requests", {
    "Retry-After": String(retryAfterSeconds),
  });
}

/**
 * Per-IP limit. Run it before anything that costs money (a RevenueCat lookup
 * creates a customer): per-install limits do not stop someone minting ids.
 * Returns a 429 response, or null when the request may continue.
 */
export async function limitByIp(
  store: Store,
  req: Request,
  bucket: string
): Promise<Response | null> {
  const result = await rateLimit(store, `ip:${bucket}`, clientIp(req), IP_RULE);
  return result.ok ? null : rateLimitedResponse(result.retryAfterSeconds);
}
