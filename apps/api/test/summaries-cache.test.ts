import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_DAILY_TOKEN_BUDGET,
  LOCK_TTL_SECONDS,
  SUMMARY_TTL_SECONDS,
  acquireLock,
  isSummaryFresh,
  lockKey,
  parseBudget,
  readSummary,
  recordTokenUsage,
  releaseLock,
  summaryKey,
  tokensKey,
  withinDailyBudget,
  writeSummary,
} from "../lib/summaries/cache";
import { MemoryStore } from "./memory-store";

const NOW = Date.parse("2026-09-30T12:00:00Z");
const MINUTE = 60_000;
const at = (minutesAgo: number, count: number) => ({
  generatedAt: new Date(NOW - minutesAgo * MINUTE).toISOString(),
  commentCountAtGeneration: count,
});

describe("isSummaryFresh", () => {
  it("reuses anything younger than 30 minutes, whatever the growth", () => {
    assert.equal(isSummaryFresh(at(29, 100), 500, NOW), true);
  });

  it("reuses an older summary while growth is within 20%", () => {
    assert.equal(isSummaryFresh(at(31, 100), 120, NOW), true);
    assert.equal(isSummaryFresh(at(600, 100), 100, NOW), true);
    assert.equal(isSummaryFresh(at(600, 100), 90, NOW), true);
  });

  it("regenerates an older summary once the thread grew by more than 20%", () => {
    assert.equal(isSummaryFresh(at(31, 100), 121, NOW), false);
    assert.equal(isSummaryFresh(at(31, 0), 1, NOW), false);
  });

  it("keeps an old summary when the current count is unknown", () => {
    assert.equal(isSummaryFresh(at(600, 100), null, NOW), true);
  });

  it("treats an unreadable timestamp as stale", () => {
    assert.equal(
      isSummaryFresh({ generatedAt: "x", commentCountAtGeneration: 1 }, 1, NOW),
      false
    );
  });
});

describe("summary storage", () => {
  it("stores summaries for 7 days under summary:story:<id>", async () => {
    const store = new MemoryStore();
    const summary = {
      ...at(0, 5),
      model: "m",
      discussion: { summary: "s", themes: [] },
    };
    await writeSummary(store, 42, summary);
    assert.equal(store.ttls.get("summary:story:42"), SUMMARY_TTL_SECONDS);
    assert.equal(SUMMARY_TTL_SECONDS, 7 * 86400);
    assert.deepEqual(await readSummary(store, 42), summary);
    assert.equal(await readSummary(store, 43), null);
    assert.equal(summaryKey(42), "summary:story:42");
  });
});

describe("generation lock", () => {
  it("is exclusive, expires after 60 seconds and can be released", async () => {
    const store = new MemoryStore();
    assert.equal(await acquireLock(store, 7), true);
    assert.equal(store.ttls.get(lockKey(7)), LOCK_TTL_SECONDS);
    assert.equal(LOCK_TTL_SECONDS, 60);
    assert.equal(await acquireLock(store, 7), false);
    assert.equal(await acquireLock(store, 8), true);
    await releaseLock(store, 7);
    assert.equal(await acquireLock(store, 7), true);
  });
});

describe("token accounting", () => {
  it("adds usage to per-day total, input and output counters", async () => {
    const store = new MemoryStore();
    await recordTokenUsage(
      store,
      { inputTokens: 1000, outputTokens: 200 },
      NOW
    );
    await recordTokenUsage(store, { inputTokens: 500, outputTokens: 100 }, NOW);
    assert.equal(await store.get(tokensKey(NOW)), 1800);
    assert.equal(await store.get(tokensKey(NOW, "in")), 1500);
    assert.equal(await store.get(tokensKey(NOW, "out")), 300);
    assert.equal(tokensKey(NOW), "summary:tokens:2026-09-30:total");
    // A new UTC day starts from zero.
    assert.equal(await store.get(tokensKey(NOW + 86_400_000)), null);
  });

  it("enforces the daily budget", async () => {
    const store = new MemoryStore();
    assert.equal(await withinDailyBudget(store, 1000, NOW), true);
    await recordTokenUsage(store, { inputTokens: 900, outputTokens: 100 }, NOW);
    assert.equal(await withinDailyBudget(store, 1000, NOW), false);
    assert.equal(await withinDailyBudget(store, 1001, NOW), true);
  });

  it("parses the budget env with a default", () => {
    assert.equal(parseBudget("250000"), 250000);
    assert.equal(parseBudget("0"), 0);
    assert.equal(parseBudget(undefined), DEFAULT_DAILY_TOKEN_BUDGET);
    assert.equal(parseBudget("lots"), DEFAULT_DAILY_TOKEN_BUDGET);
    assert.equal(parseBudget("-5"), DEFAULT_DAILY_TOKEN_BUDGET);
  });
});
