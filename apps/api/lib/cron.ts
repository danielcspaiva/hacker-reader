import { timingSafeEqual } from "node:crypto";

import { errorResponse } from "./http";

/** Constant-time string comparison (length differences leak, which is fine). */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export type CronResult = { ok: true } | { ok: false; response: Response };

/**
 * Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`. Fails closed when
 * the secret is not configured.
 */
export function requireCron(
  req: Request,
  secret: string | undefined = process.env.CRON_SECRET
): CronResult {
  const header = req.headers.get("authorization");
  if (!secret || !header || !safeEqual(header, `Bearer ${secret}`)) {
    return {
      ok: false,
      response: errorResponse(401, "unauthorized", "Invalid cron credentials"),
    };
  }
  return { ok: true };
}
