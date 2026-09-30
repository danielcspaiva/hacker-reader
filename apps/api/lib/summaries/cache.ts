import type { Store } from "../store";
import type { StorySummary } from "./output";

export const SUMMARY_TTL_SECONDS = 7 * 24 * 60 * 60;
export const LOCK_TTL_SECONDS = 60;
/** A summary younger than this is reused whatever the comment count did. */
export const MIN_FRESH_MS = 30 * 60 * 1000;
/** ...and an older one while the thread has grown by no more than this. */
export const MAX_COMMENT_GROWTH = 0.2;

export const summaryKey = (storyId: number) => `summary:story:${storyId}`;
export const lockKey = (storyId: number) => `summary:lock:${storyId}`;

/**
 * Reuse rule: younger than 30 minutes, or the story's current `descendants`
 * within +20% of the count at generation. `currentDescendants` is null when it
 * could not be looked up; an old summary is then kept (better than failing).
 */
export function isSummaryFresh(
  summary: Pick<StorySummary, "generatedAt" | "commentCountAtGeneration">,
  currentDescendants: number | null,
  now: number
): boolean {
  const generated = Date.parse(summary.generatedAt);
  if (Number.isNaN(generated)) return false;
  if (now - generated < MIN_FRESH_MS) return true;
  if (currentDescendants === null) return true;
  return (
    currentDescendants <=
    summary.commentCountAtGeneration * (1 + MAX_COMMENT_GROWTH)
  );
}

export async function readSummary(
  store: Store,
  storyId: number
): Promise<StorySummary | null> {
  return store.get<StorySummary>(summaryKey(storyId));
}

export async function writeSummary(
  store: Store,
  storyId: number,
  summary: StorySummary
): Promise<void> {
  await store.set(summaryKey(storyId), summary, {
    ttlSeconds: SUMMARY_TTL_SECONDS,
  });
}

/** True when this caller now owns generation for the story (SET NX, 60s). */
export function acquireLock(store: Store, storyId: number): Promise<boolean> {
  return store.setIfAbsent(lockKey(storyId), 1, LOCK_TTL_SECONDS);
}

export function releaseLock(store: Store, storyId: number): Promise<void> {
  return store.del(lockKey(storyId));
}

// ---- Token accounting (cost monitoring and the daily guard) ----

const COUNTER_TTL_SECONDS = 3 * 24 * 60 * 60;
/** Default global budget: about 125 summaries a day, roughly $12. */
export const DEFAULT_DAILY_TOKEN_BUDGET = 5_000_000;

const dayStamp = (now: number) => new Date(now).toISOString().slice(0, 10);
export const tokensKey = (
  now: number,
  kind: "total" | "in" | "out" = "total"
) => `summary:tokens:${dayStamp(now)}:${kind}`;

/** Adds one call's usage to today's counters (total, input, output). */
export async function recordTokenUsage(
  store: Store,
  usage: { inputTokens: number; outputTokens: number },
  now: number
): Promise<void> {
  await Promise.all([
    store.incrBy(
      tokensKey(now),
      usage.inputTokens + usage.outputTokens,
      COUNTER_TTL_SECONDS
    ),
    store.incrBy(tokensKey(now, "in"), usage.inputTokens, COUNTER_TTL_SECONDS),
    store.incrBy(
      tokensKey(now, "out"),
      usage.outputTokens,
      COUNTER_TTL_SECONDS
    ),
  ]);
}

/** True while today's total is under `budget` (UTC day). */
export async function withinDailyBudget(
  store: Store,
  budget: number,
  now: number
): Promise<boolean> {
  const used = await store.get<number>(tokensKey(now));
  return (used ?? 0) < budget;
}

export function parseBudget(raw: string | undefined): number {
  const value = Number(raw);
  return raw && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : DEFAULT_DAILY_TOKEN_BUDGET;
}
