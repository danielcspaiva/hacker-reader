import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { handleDigestBuildCron, runDigestBuild } from "../lib/digest/build";
import { digestKey, digestLockKey, type Digest } from "../lib/digest/store";
import type { JsonValue } from "../lib/json";
import { recordTokenUsage, tokensKey } from "../lib/summaries/cache";
import type { LlmRequest, LlmResult, SummaryLlm } from "../lib/summaries/model";
import { fakeFetch } from "./helpers";
import { MemoryStore } from "./memory-store";

const NOW = Date.parse("2026-09-30T05:00:00Z");

const hits = Array.from({ length: 12 }, (_, i) => ({
  objectID: String(100 + i),
  title: `Story ${i}`,
  url: `https://site${i}.example/p`,
  points: 100 + i * 10,
  num_comments: i,
}));

function setup(options: { algolia?: JsonValue; status?: number } = {}) {
  const store = new MemoryStore();
  const urls: string[] = [];
  const requests: LlmRequest[] = [];
  const llm: SummaryLlm & { reply: (r: LlmRequest) => Promise<LlmResult> } = {
    reply: async (request) => {
      const ids = [...request.user.matchAll(/<story id="(\d+)"/g)].map((m) =>
        Number(m[1])
      );
      return {
        text: JSON.stringify({
          blurbs: ids.map((id) => ({ id, blurb: `Blurb ${id}.` })),
        }),
        inputTokens: 900,
        outputTokens: 200,
        stopReason: "end_turn",
      };
    },
    async complete(request) {
      requests.push(request);
      return llm.reply(request);
    },
  };
  const fetchImpl = fakeFetch((url) => {
    urls.push(url);
    if (options.status && options.status !== 200) {
      return new Response("err", { status: options.status });
    }
    return Response.json(options.algolia ?? { hits });
  });
  const deps = { store, llm, fetch: fetchImpl, now: () => NOW };
  return { store, urls, requests, llm, deps };
}

describe("runDigestBuild", () => {
  it("stores the top 8 stories with blurbs and a 7 day TTL", async () => {
    const { store, deps, requests, urls } = setup();
    const summary = await runDigestBuild(deps);
    assert.deepEqual(summary, {
      status: "built",
      date: "2026-09-30",
      stories: 8,
    });

    const digest = await store.get<Digest>(digestKey("2026-09-30"));
    assert.ok(digest);
    assert.equal(digest.date, "2026-09-30");
    assert.equal(digest.generatedAt, "2026-09-30T05:00:00.000Z");
    assert.deepEqual(
      digest.stories.map((s) => s.id),
      [111, 110, 109, 108, 107, 106, 105, 104]
    );
    assert.deepEqual(digest.stories[0], {
      id: 111,
      title: "Story 11",
      url: "https://site11.example/p",
      domain: "site11.example",
      points: 210,
      comments: 11,
      blurb: "Blurb 111.",
    });
    assert.equal(store.ttls.get(digestKey("2026-09-30")), 7 * 24 * 60 * 60);

    // One model call, only the selected stories, and a 24h Algolia window.
    assert.equal(requests.length, 1);
    assert.equal(requests[0]?.user.match(/<story /g)?.length, 8);
    assert.ok(urls[0]?.includes(`created_at_i%3E${NOW / 1000 - 86400}`));
    // Tokens are accounted in the shared daily counter; the lock is released.
    assert.equal(await store.get(tokensKey(NOW)), 1100);
    assert.equal(store.values.has(digestLockKey("2026-09-30")), false);
  });

  it("is idempotent: a second run neither fetches nor calls the model", async () => {
    const { deps, requests, urls } = setup();
    await runDigestBuild(deps);
    const again = await runDigestBuild(deps);
    assert.equal(again.status, "exists");
    assert.equal(requests.length, 1);
    assert.equal(urls.length, 1);
  });

  it("does nothing while another run holds the lock", async () => {
    const { store, deps, requests } = setup();
    await store.set(digestLockKey("2026-09-30"), 1);
    assert.equal((await runDigestBuild(deps)).status, "locked");
    assert.equal(requests.length, 0);
  });

  it("skips the model when the daily token budget is spent", async () => {
    const { store, deps, requests } = setup();
    await recordTokenUsage(store, { inputTokens: 600, outputTokens: 500 }, NOW);
    const summary = await runDigestBuild({ ...deps, dailyTokenBudget: 1000 });
    assert.equal(summary.status, "over_budget");
    assert.equal(requests.length, 0);
    assert.equal(await store.get(digestKey("2026-09-30")), null);
  });

  it("stores nothing without a model key", async () => {
    const { store, deps } = setup();
    const summary = await runDigestBuild({ ...deps, llm: undefined });
    assert.equal(summary.status, "no_llm");
    assert.equal(await store.get(digestKey("2026-09-30")), null);
  });

  it("stores nothing for a quiet day", async () => {
    const { store, deps, requests } = setup({
      algolia: { hits: hits.slice(0, 2) },
    });
    assert.equal((await runDigestBuild(deps)).status, "no_stories");
    assert.equal(requests.length, 0);
    assert.equal(await store.get(digestKey("2026-09-30")), null);
  });

  it("fails without storing when Algolia is down, and can retry", async () => {
    const down = setup({ status: 500 });
    assert.equal((await runDigestBuild(down.deps)).status, "failed");
    assert.equal(await down.store.get(digestKey("2026-09-30")), null);
    assert.equal(down.store.values.has(digestLockKey("2026-09-30")), false);
    // Same store, Algolia back: the retry builds.
    const retry = await runDigestBuild({
      ...down.deps,
      fetch: fakeFetch(() => Response.json({ hits })),
    });
    assert.equal(retry.status, "built");
  });

  it("fails without storing on a refusal or unusable output", async () => {
    const refused = setup();
    refused.llm.reply = async () => ({
      text: "",
      inputTokens: 10,
      outputTokens: 0,
      stopReason: "refusal",
    });
    assert.equal((await runDigestBuild(refused.deps)).status, "failed");
    assert.equal(await refused.store.get(digestKey("2026-09-30")), null);

    const junk = setup();
    junk.llm.reply = async () => ({
      text: JSON.stringify({ blurbs: [{ id: 1, blurb: "unknown id" }] }),
      inputTokens: 10,
      outputTokens: 10,
      stopReason: "end_turn",
    });
    assert.equal((await runDigestBuild(junk.deps)).status, "failed");
    // The spent tokens still count.
    assert.equal(await junk.store.get(tokensKey(NOW)), 20);
  });
});

describe("handleDigestBuildCron", () => {
  it("requires the cron secret", async () => {
    const { deps } = setup();
    const denied = await handleDigestBuildCron(
      new Request("https://x.test/api/cron/digest-build"),
      { ...deps, secret: "s" }
    );
    assert.equal(denied.status, 401);

    const ok = await handleDigestBuildCron(
      new Request("https://x.test/api/cron/digest-build", {
        headers: { Authorization: "Bearer s" },
      }),
      { ...deps, secret: "s" }
    );
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).status, "built");
  });

  it("answers 503 when the build failed", async () => {
    const { deps } = setup({ status: 500 });
    const response = await handleDigestBuildCron(
      new Request("https://x.test/api/cron/digest-build", {
        headers: { Authorization: "Bearer s" },
      }),
      { ...deps, secret: "s" }
    );
    assert.equal(response.status, 503);
  });
});
