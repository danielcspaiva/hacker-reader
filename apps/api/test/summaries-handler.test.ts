import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { isJsonObject, type JsonObject, type JsonValue } from "../lib/json";
import { tokensKey } from "../lib/summaries/cache";
import {
  DAILY_INSTALL_CAP,
  handleStorySummary,
  parseStoryId,
} from "../lib/summaries/handler";
import type { LlmRequest, LlmResult, SummaryLlm } from "../lib/summaries/model";
import type { StorySummary } from "../lib/summaries/output";
import { fakeFetch, readFixture } from "./helpers";
import { MemoryStore } from "./memory-store";

const ID = "3f2b8f3e-6f6e-4a52-9a7e-0f1e1c2d3a4b";
const NOW = Date.parse("2026-09-30T12:00:00Z");
const STORY = 4242;
const MINUTE = 60_000;

const articleHtml = readFileSync(
  new URL("./fixtures/article-page.html", import.meta.url),
  "utf8"
);

interface World {
  pro: boolean;
  descendants: number | null;
  algoliaStatus: number;
  story: JsonValue;
  clock: { now: number };
}

function setup(overrides: Partial<World> = {}) {
  const world: World = {
    pro: true,
    descendants: 7,
    algoliaStatus: 200,
    story: readFixture("algolia-story.json"),
    clock: { now: NOW },
    ...overrides,
  };
  const store = new MemoryStore();
  const urls: string[] = [];

  const fetchImpl = fakeFetch((url) => {
    urls.push(url);
    if (url.includes("api.revenuecat.com")) {
      return Response.json(
        world.pro
          ? readFixture("subscriber-pro.json")
          : { subscriber: { entitlements: {} } }
      );
    }
    if (url.startsWith("https://hn.algolia.com/")) {
      return world.algoliaStatus === 200
        ? Response.json(world.story)
        : new Response("missing", { status: world.algoliaStatus });
    }
    if (url.startsWith("https://hacker-news.firebaseio.com/")) {
      return world.descendants === null
        ? new Response("err", { status: 500 })
        : Response.json({ id: STORY, descendants: world.descendants });
    }
    if (url === "https://blog.example.com/static") {
      return new Response(articleHtml, {
        headers: { "content-type": "text/html" },
      });
    }
    return new Response("unexpected", { status: 500 });
  });

  const requests: LlmRequest[] = [];
  const llm: SummaryLlm & { reply: (req: LlmRequest) => Promise<LlmResult> } = {
    reply: async () => ({
      text: JSON.stringify({
        articleTldr: "Static sites are fast.",
        discussion: {
          summary: "Commenters like them.",
          themes: [
            { title: "Speed", summary: "Fast.", commentIds: [1, 999, 21] },
          ],
        },
      }),
      inputTokens: 30_000,
      outputTokens: 900,
      stopReason: "end_turn",
    }),
    async complete(request) {
      requests.push(request);
      return llm.reply(request);
    },
  };

  const call = (
    options: {
      id?: string;
      auth?: string | null;
      deps?: Partial<Parameters<typeof handleStorySummary>[2]>;
    } = {}
  ) => {
    const auth = options.auth === undefined ? `Bearer ${ID}` : options.auth;
    const headers: Record<string, string> = {
      "x-forwarded-for": "203.0.113.7",
    };
    if (auth) headers.Authorization = auth;
    return handleStorySummary(
      new Request(`https://x.test/api/v1/summaries/story/${STORY}`, {
        headers,
      }),
      options.id ?? String(STORY),
      {
        store,
        llm,
        fetch: fetchImpl,
        now: () => world.clock.now,
        sleep: async () => {},
        secretKey: "sk",
        ...options.deps,
      }
    );
  };

  return { world, store, urls, requests, llm, call };
}

interface ResponseBody {
  status?: string;
  summary?: StorySummary;
  error?: { code?: string };
}

const bodyOf = async (response: Response): Promise<ResponseBody> =>
  response.json();

const errorCode = (body: ResponseBody) => body.error?.code;

function summaryOf(body: ResponseBody): StorySummary {
  assert.ok(body.summary);
  return body.summary;
}

function storyFixture(patch: JsonObject): JsonObject {
  const base = readFixture("algolia-story.json");
  assert.ok(isJsonObject(base));
  return { ...base, ...patch };
}

const stale = (count: number, minutesAgo: number): StorySummary => ({
  generatedAt: new Date(NOW - minutesAgo * MINUTE).toISOString(),
  commentCountAtGeneration: count,
  model: "old-model",
  discussion: { summary: "cached", themes: [] },
});

describe("parseStoryId", () => {
  it("accepts positive integers only", () => {
    assert.equal(parseStoryId("4242"), 4242);
    for (const bad of [
      "0",
      "-1",
      "1.5",
      "abc",
      "",
      "12345678901",
      "4242/../x",
    ]) {
      assert.equal(parseStoryId(bad), null, bad);
    }
  });
});

describe("handleStorySummary: access", () => {
  it("answers 401 without an install id and 402 without Pro, before any work", async () => {
    const anon = setup();
    assert.equal((await anon.call({ auth: null })).status, 401);

    const free = setup({ pro: false });
    const response = await free.call();
    assert.equal(response.status, 402);
    assert.equal(free.requests.length, 0);
    assert.equal(
      free.urls.some((url) => url.includes("algolia")),
      false
    );
  });

  it("rejects a bad id with 400 without spending the daily cap", async () => {
    const t = setup();
    const response = await t.call({ id: "abc" });
    assert.equal(response.status, 400);
    assert.equal(
      [...t.store.values.keys()].some((k) => k.includes("summary-daily")),
      false
    );
  });

  it("limits each install to 60 requests a day", async () => {
    const t = setup();
    t.store.values.set(
      `ratelimit:summary-daily:${ID}:${Math.floor(NOW / 86_400_000)}`,
      String(DAILY_INSTALL_CAP)
    );
    const response = await t.call();
    assert.equal(response.status, 429);
    assert.equal(errorCode(await bodyOf(response)), "daily_limit");
    assert.ok(Number(response.headers.get("retry-after")) > 0);
    assert.equal(t.requests.length, 0);
  });
});

describe("handleStorySummary: generation", () => {
  it("generates, validates, caches and accounts for a new summary", async () => {
    const t = setup();
    const response = await t.call();
    assert.equal(response.status, 200);
    const summary = summaryOf(await bodyOf(response));

    assert.equal(summary.model, "claude-sonnet-5-5");
    assert.equal(summary.generatedAt, new Date(NOW).toISOString());
    assert.equal(summary.commentCountAtGeneration, 7);
    assert.equal(summary.articleTldr, "Static sites are fast.");
    // 999 was never in the input.
    assert.deepEqual(summary.discussion.themes[0]?.commentIds, [1, 21]);

    // The model got the article and the comments, framed as data.
    const [request] = t.requests;
    assert.ok(request);
    assert.match(request.user, /Section 3 adds detail/);
    assert.match(request.user, /<comment id="111" reply_to="11">/);
    assert.match(request.system, /never instructions/);
    assert.equal(request.model, "claude-sonnet-5-5");

    assert.equal(t.store.ttls.get(`summary:story:${STORY}`), 7 * 86400);
    assert.equal(await t.store.get(tokensKey(NOW)), 30_900);
    assert.equal(t.store.values.has(`summary:lock:${STORY}`), false);
  });

  it("honours the model override", async () => {
    const t = setup();
    await t.call({ deps: { model: "claude-haiku-4-5" } });
    assert.equal(t.requests[0]?.model, "claude-haiku-4-5");
  });

  it("works for a story without a link (no article fetch)", async () => {
    const story = storyFixture({ url: null, text: "Ask body" });
    const t = setup({ story });
    assert.equal((await t.call()).status, 200);
    assert.equal(t.urls.includes("https://blog.example.com/static"), false);
    assert.match(t.requests[0]?.user ?? "", /<story_text>\nAsk body/);
  });

  it("still summarises the discussion when the article cannot be fetched", async () => {
    const t = setup();
    const original = t.world;
    original.story = storyFixture({ url: "http://10.0.0.1/x" });
    const response = await t.call();
    assert.equal(response.status, 200);
    assert.equal(t.requests[0]?.user.includes("<article"), false);
  });

  it("answers 404 for unknown stories and 422 when there is nothing to discuss", async () => {
    const missing = setup({ algoliaStatus: 404 });
    assert.equal((await missing.call()).status, 404);

    const empty = setup({
      story: {
        id: STORY,
        type: "story",
        title: "t",
        children: [{ id: 1, text: "only", children: [] }],
      },
    });
    const response = await empty.call();
    assert.equal(response.status, 422);
    assert.equal(errorCode(await bodyOf(response)), "not_enough_comments");
    assert.equal(empty.requests.length, 0);
  });

  it("answers 502 when Hacker News is down", async () => {
    const t = setup({ algoliaStatus: 500 });
    assert.equal((await t.call()).status, 502);
  });
});

describe("handleStorySummary: cache", () => {
  it("serves a cached summary without calling the model", async () => {
    const t = setup();
    assert.equal((await t.call()).status, 200);
    assert.equal((await t.call()).status, 200);
    assert.equal(t.requests.length, 1);
  });

  it("serves a summary under 30 minutes old without even looking at the thread", async () => {
    const t = setup();
    await t.store.set(`summary:story:${STORY}`, stale(10, 29));
    t.world.descendants = 500;
    const response = await t.call();
    assert.equal(summaryOf(await bodyOf(response)).model, "old-model");
    assert.equal(
      t.urls.some((url) => url.includes("firebaseio")),
      false
    );
  });

  it("reuses an old summary within +20% and regenerates beyond it", async () => {
    const within = setup({ descendants: 12 });
    await within.store.set(`summary:story:${STORY}`, stale(10, 120));
    assert.equal(
      summaryOf(await bodyOf(await within.call())).model,
      "old-model"
    );
    assert.equal(within.requests.length, 0);

    const grown = setup({ descendants: 13 });
    await grown.store.set(`summary:story:${STORY}`, stale(10, 120));
    const summary = summaryOf(await bodyOf(await grown.call()));
    assert.equal(summary.model, "claude-sonnet-5-5");
    assert.equal(grown.requests.length, 1);
  });

  it("keeps an old summary when the regeneration fails", async () => {
    const t = setup({ descendants: 50 });
    t.llm.reply = async () => {
      throw new Error("not a SummaryError");
    };
    await t.store.set(`summary:story:${STORY}`, stale(10, 120));
    const response = await t.call();
    assert.equal(response.status, 200);
    assert.equal(summaryOf(await bodyOf(response)).model, "old-model");
  });
});

describe("handleStorySummary: lock", () => {
  it("lets concurrent requests generate once; the loser gets 202", async () => {
    const t = setup();
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const original = t.llm.reply;
    t.llm.reply = async (request) => {
      await gate;
      return original(request);
    };

    const winner = t.call();
    // Let the winner take the lock and reach the model.
    while (t.requests.length === 0) await new Promise((r) => setImmediate(r));

    const loser = await t.call({ deps: { pollAttempts: 2 } });
    assert.equal(loser.status, 202);
    assert.equal((await bodyOf(loser)).status, "generating");
    assert.ok(loser.headers.get("retry-after"));

    release();
    assert.equal((await winner).status, 200);
    assert.equal(t.requests.length, 1);
    assert.equal(t.store.values.has(`summary:lock:${STORY}`), false);
  });

  it("a waiting request returns the winner's result as soon as it lands", async () => {
    const t = setup();
    await t.store.set(`summary:lock:${STORY}`, 1);
    const sleep = async () => {
      await t.store.set(`summary:story:${STORY}`, stale(7, 0));
    };
    const response = await t.call({ deps: { sleep } });
    assert.equal(response.status, 200);
    assert.equal(t.requests.length, 0);
  });

  it("serves the old summary while someone else regenerates", async () => {
    const t = setup({ descendants: 50 });
    await t.store.set(`summary:story:${STORY}`, stale(10, 120));
    await t.store.set(`summary:lock:${STORY}`, 1);
    const response = await t.call();
    assert.equal(summaryOf(await bodyOf(response)).model, "old-model");
  });

  it("releases the lock when generation fails", async () => {
    const t = setup();
    t.llm.reply = async () => ({
      text: "not json",
      inputTokens: 10,
      outputTokens: 5,
      stopReason: "end_turn",
    });
    const response = await t.call();
    assert.equal(response.status, 502);
    assert.equal(t.store.values.has(`summary:lock:${STORY}`), false);
    assert.equal(t.store.values.has(`summary:story:${STORY}`), false);
    // Failed calls are still billed.
    assert.equal(await t.store.get(tokensKey(NOW)), 15);
  });
});

describe("handleStorySummary: model failures", () => {
  it("maps refusal, truncation and outages to friendly errors", async () => {
    const cases: Array<[Partial<LlmResult>, number, string]> = [
      [{ stopReason: "refusal", text: "" }, 422, "summary_refused"],
      [{ stopReason: "max_tokens", text: "{" }, 502, "summary_failed"],
      [{ text: JSON.stringify({ discussion: {} }) }, 502, "summary_failed"],
    ];
    for (const [patch, status, code] of cases) {
      const t = setup();
      t.llm.reply = async () => ({
        text: "",
        inputTokens: 1,
        outputTokens: 1,
        stopReason: "end_turn",
        ...patch,
      });
      const response = await t.call();
      assert.equal(response.status, status);
      assert.equal(errorCode(await bodyOf(response)), code);
    }
  });

  it("answers 503 when the API is unreachable or no key is configured", async () => {
    const { SummaryError } = await import("../lib/summaries/model");
    const down = setup();
    down.llm.reply = async () => {
      throw new SummaryError("unavailable", "overloaded");
    };
    assert.equal((await down.call()).status, 503);

    const keyless = setup();
    const response = await keyless.call({ deps: { llm: undefined } });
    assert.equal(response.status, 503);
    assert.equal(errorCode(await bodyOf(response)), "summaries_unavailable");
  });
});

describe("handleStorySummary: daily token budget", () => {
  it("answers 503 once the day's tokens are spent, without calling the model", async () => {
    const t = setup();
    await t.store.set(tokensKey(NOW), 1_000_000);
    const response = await t.call({ deps: { dailyTokenBudget: 1_000_000 } });
    assert.equal(response.status, 503);
    assert.equal(errorCode(await bodyOf(response)), "summaries_paused");
    assert.ok(Number(response.headers.get("retry-after")) > 0);
    assert.equal(t.requests.length, 0);
  });

  it("still serves cached summaries over budget", async () => {
    const t = setup();
    await t.store.set(`summary:story:${STORY}`, stale(7, 1));
    await t.store.set(tokensKey(NOW), 10);
    const response = await t.call({ deps: { dailyTokenBudget: 5 } });
    assert.equal(response.status, 200);
  });
});
