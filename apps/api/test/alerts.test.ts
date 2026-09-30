import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  fetchCandidates,
  findMatches,
  parseSent,
  planPushes,
  sentKey,
  updateSent,
  type Candidate,
} from "../lib/alerts";
import { handleAlertsCron, runAlerts } from "../lib/alerts-cron";
import {
  compileQuery,
  firstMatchingRule,
  parseAlerts,
  type AlertRule,
} from "../lib/alerts-match";
import { getDevice, parseDeviceInput, upsertDevice } from "../lib/devices";
import type { JsonValue } from "../lib/json";
import { fakeFetch } from "./helpers";
import { MemoryStore } from "./memory-store";

const ID_A = "3f2b8f3e-6f6e-4a52-9a7e-0f1e1c2d3a4b";
const ID_B = "7a1c9d2e-1b3f-4c5d-8e6f-0a1b2c3d4e5f";
const TOKEN_A = "ExponentPushToken[aaaaaaaaaaaaaaaaaaaa]";
const TOKEN_B = "ExponentPushToken[bbbbbbbbbbbbbbbbbbbb]";
const NOW = Date.parse("2026-09-30T12:00:00Z");
const NOW_S = Math.floor(NOW / 1000);

const rule = (query: string, minPoints = 10, id = query): AlertRule => ({
  id: id.replace(/[^\w-]/g, "_"),
  query,
  minPoints,
});
const title = (t: string) => ({ title: t });
const hit = (
  id: number,
  t: string,
  points: number,
  url?: string,
  age = 3600
) => ({
  objectID: String(id),
  title: t,
  points,
  url: url ?? null,
  created_at_i: NOW_S - age,
});
const candidate = (
  id: number,
  t: string,
  points: number,
  url?: string,
  age = 3600
): Candidate => {
  const c: Candidate = { id, title: t, points, createdAt: NOW_S - age };
  if (url) c.url = url;
  return c;
};

// Same cases as the app's mutes matcher (apps/mobile/test/hn/mutes.test.ts).
describe("keyword matching (same semantics as mutes)", () => {
  const match = (query: string, t: string) => compileQuery(query)(title(t));

  it("matches case-insensitively on word boundaries", () => {
    assert.equal(match("ai", "AI agents are here"), true);
    assert.equal(match("ai", "Show HN: my ai tool"), true);
    assert.equal(match("ai", "He said no"), false);
    assert.equal(match("ai", "Maintain your repo"), false);
  });
  it("treats punctuation as a boundary", () => {
    assert.equal(match("ai", "Is AI, really?"), true);
    assert.equal(match("ai", "(AI) winter"), true);
    assert.equal(match("ai", "AI-powered toaster"), true);
  });
  it("does not treat underscores or digits as boundaries", () => {
    assert.equal(match("ai", "ai_tools"), false);
    assert.equal(match("ai", "ai2 released"), false);
  });
  it("matches multi-word phrases across whitespace runs", () => {
    assert.equal(match("Open AI", "Open AI raises money"), true);
    assert.equal(match("open ai", "Open   AI raises money"), true);
    assert.equal(match("open ai", "Open source AI"), false);
    assert.equal(match("open ai", "Reopen AI"), false);
  });
  it("escapes regex metacharacters", () => {
    assert.equal(match("c++", "Learning C++ in 2026"), true);
    assert.equal(match("c++", "Learning C in 2026"), false);
    assert.equal(match("(beta)", "App (beta) out"), true);
    assert.equal(match("a.b", "axb"), false);
    assert.equal(match("a.b", "a.b test"), true);
  });
  it("handles non-ASCII letters as word characters", () => {
    assert.equal(match("cafe", "Café culture"), false);
    assert.equal(match("café", "Café culture"), true);
    assert.equal(match("café", "Cafés"), false);
  });
  it("does not match keywords against the URL", () => {
    assert.equal(
      compileQuery("medium")({ title: "Hello", url: "https://medium.com/x" }),
      false
    );
  });
  it("finds SQLite in a typical title", () => {
    assert.equal(match("SQLite", "SQLite 3.50 released"), true);
    assert.equal(match("SQLite", "Why I use sqlite for everything"), true);
    assert.equal(match("SQLite", "PostgreSQLite"), false);
  });
});

describe("site: matching", () => {
  const story = (url?: string) => ({ title: "t", url });
  const match = (query: string, url?: string) =>
    compileQuery(query)(story(url));

  it("matches the exact domain, ignoring www and case", () => {
    assert.equal(match("site:medium.com", "https://medium.com/a"), true);
    assert.equal(match("site:medium.com", "https://www.medium.com/a"), true);
    assert.equal(match("SITE:Medium.com", "https://medium.com/a"), true);
  });
  it("matches subdomains", () => {
    assert.equal(match("site:medium.com", "https://foo.medium.com/a"), true);
    assert.equal(match("site:medium.com", "https://a.b.medium.com/a"), true);
  });
  it("does not match look-alikes or parents", () => {
    assert.equal(match("site:medium.com", "https://notmedium.com/a"), false);
    assert.equal(
      match("site:medium.com", "https://medium.com.evil.io/a"),
      false
    );
    assert.equal(match("site:foo.medium.com", "https://medium.com/a"), false);
  });
  it("skips stories without a usable url and never matches titles", () => {
    assert.equal(match("site:medium.com", undefined), false);
    assert.equal(match("site:medium.com", "not a url"), false);
    assert.equal(
      compileQuery("site:medium.com")({ title: "medium.com news" }),
      false
    );
  });
  it("never matches an invalid host", () => {
    assert.equal(match("site:", "https://medium.com"), false);
    assert.equal(match("site:not a host", "https://medium.com"), false);
  });
});

describe("firstMatchingRule", () => {
  const story = { id: 1, title: "SQLite is great", points: 120 };

  it("requires the points and the text match", () => {
    assert.equal(
      firstMatchingRule([rule("sqlite", 100)], story)?.query,
      "sqlite"
    );
    assert.equal(firstMatchingRule([rule("sqlite", 250)], story), undefined);
    assert.equal(firstMatchingRule([rule("duckdb", 10)], story), undefined);
  });
  it("uses the first rule that matches", () => {
    const rules = [rule("duckdb"), rule("sqlite", 250), rule("great", 50)];
    assert.equal(firstMatchingRule(rules, story)?.query, "great");
  });
});

describe("parseAlerts", () => {
  const ok = { id: "a1", query: "sqlite", minPoints: 100 };

  it("accepts valid rules and drops unknown fields", () => {
    const parsed = parseAlerts([
      { ...ok, extra: 1 },
      { ...ok, id: "a2", query: "site:x.com", minPoints: 10 },
    ]);
    assert.ok(parsed.ok);
    assert.deepEqual(parsed.value[0], ok);
    assert.equal(parsed.value.length, 2);
  });
  it("accepts an empty list", () => {
    assert.deepEqual(parseAlerts([]), { ok: true, value: [] });
  });
  it("rejects more than 20 rules", () => {
    const many = Array.from({ length: 21 }, (_, i) => ({ ...ok, id: `a${i}` }));
    assert.equal(parseAlerts(many).ok, false);
    assert.equal(parseAlerts(many.slice(0, 20)).ok, true);
  });
  it("rejects bad shapes, lengths and points", () => {
    const bad: JsonValue[] = [
      "nope",
      [1],
      [{ ...ok, id: "" }],
      [{ ...ok, id: "has space" }],
      [{ ...ok, query: "" }],
      [{ ...ok, query: " padded " }],
      [{ ...ok, query: "x".repeat(61) }],
      [{ ...ok, query: "line\nbreak" }],
      [{ ...ok, query: "site:" }],
      [{ ...ok, query: "site:not a host" }],
      [{ ...ok, minPoints: 99 }],
      [{ ...ok, minPoints: "100" }],
      [{ id: "a", query: "x" }],
    ];
    for (const value of bad) {
      assert.equal(parseAlerts(value).ok, false, JSON.stringify(value));
    }
    assert.equal(parseAlerts([{ ...ok, query: "x".repeat(60) }]).ok, true);
  });
});

describe("device validation of prefs.alerts", () => {
  const base = { platform: "ios", appVersion: "1.0.0", timezone: "UTC" };
  const alerts = [{ id: "a1", query: "sqlite", minPoints: 100 }];

  it("keeps a valid alerts list next to other prefs", () => {
    const parsed = parseDeviceInput({
      ...base,
      prefs: { replies: true, alerts },
    });
    assert.ok(parsed.ok);
    assert.deepEqual(parsed.value.prefs, { replies: true, alerts });
  });
  it("rejects an invalid alerts list", () => {
    const parsed = parseDeviceInput({
      ...base,
      prefs: { alerts: [{ id: "a1", query: "sqlite", minPoints: 7 }] },
    });
    assert.equal(parsed.ok, false);
    assert.equal(
      parseDeviceInput({ ...base, prefs: { alerts: "x" } }).ok,
      false
    );
  });
  it("merges with stored prefs and replaces the list as a whole", async () => {
    const store = new MemoryStore();
    const input = {
      platform: "ios",
      appVersion: "1.0.0",
      timezone: "UTC",
    } as const;
    await upsertDevice(store, ID_A, { ...input, prefs: { replies: true } });
    await upsertDevice(store, ID_A, {
      ...input,
      prefs: { alerts: parseAlerts(alerts).ok ? alerts : [] },
    });
    await upsertDevice(store, ID_A, { ...input, prefs: { replies: false } });
    const device = await getDevice(store, ID_A);
    assert.deepEqual(device?.prefs, { replies: false, alerts });
    await upsertDevice(store, ID_A, { ...input, prefs: { alerts: [] } });
    assert.deepEqual((await getDevice(store, ID_A))?.prefs.alerts, []);
  });
});

describe("fetchCandidates", () => {
  const page = (hits: unknown[], nbPages: number) =>
    Response.json({ hits, nbPages });

  it("asks for the last 48 hours with 10+ points", async () => {
    const urls: string[] = [];
    const fetchImpl = fakeFetch((url) => {
      urls.push(url);
      return page([hit(1, "a", 20)], 1);
    });
    const result = await fetchCandidates({
      fetch: fetchImpl,
      nowSeconds: NOW_S,
    });
    assert.equal(result.length, 1);
    assert.equal(urls.length, 1);
    const parsed = new URL(urls[0]!);
    assert.equal(parsed.pathname, "/api/v1/search_by_date");
    assert.equal(parsed.searchParams.get("tags"), "story");
    assert.equal(parsed.searchParams.get("hitsPerPage"), "1000");
    assert.equal(
      parsed.searchParams.get("numericFilters"),
      `created_at_i>${NOW_S - 48 * 3600},points>=10`
    );
  });
  it("pages until nbPages, dropping duplicates and malformed hits", async () => {
    const pages: string[] = [];
    const fetchImpl = fakeFetch((url) => {
      const n = Number(new URL(url).searchParams.get("page"));
      pages.push(String(n));
      return n === 0
        ? page([hit(1, "a", 20), { objectID: "x" }, hit(2, "b", 30)], 2)
        : page([hit(2, "b", 31), hit(3, "c", 40)], 2);
    });
    const result = await fetchCandidates({
      fetch: fetchImpl,
      nowSeconds: NOW_S,
    });
    assert.deepEqual(pages, ["0", "1"]);
    assert.deepEqual(
      result.map((c) => c.id),
      [1, 2, 3]
    );
  });
  it("caps the number of pages", async () => {
    let calls = 0;
    const fetchImpl = fakeFetch(() => {
      calls++;
      return page([hit(calls, "s", 20)], 50);
    });
    const result = await fetchCandidates({
      fetch: fetchImpl,
      nowSeconds: NOW_S,
      maxPages: 3,
    });
    assert.equal(calls, 3);
    assert.equal(result.length, 3);
    calls = 0;
    await fetchCandidates({ fetch: fetchImpl, nowSeconds: NOW_S });
    assert.equal(calls, 4);
  });
  it("throws when the first page fails, keeps earlier pages otherwise", async () => {
    await assert.rejects(
      fetchCandidates({
        fetch: fakeFetch(() => new Response("no", { status: 500 })),
        nowSeconds: NOW_S,
      })
    );
    const result = await fetchCandidates({
      fetch: fakeFetch((url) =>
        new URL(url).searchParams.get("page") === "0"
          ? page([hit(1, "a", 20)], 3)
          : new Response("no", { status: 500 })
      ),
      nowSeconds: NOW_S,
    });
    assert.deepEqual(
      result.map((c) => c.id),
      [1]
    );
  });
});

describe("sent list, matches and pushes", () => {
  it("dedupes against the sent list and orders by points", () => {
    const candidates = [
      candidate(1, "SQLite one", 120),
      candidate(2, "SQLite two", 300),
      candidate(3, "SQLite low", 20),
      candidate(4, "Other", 500),
    ];
    const matches = findMatches([rule("sqlite", 100)], candidates, [
      { id: 1, t: NOW_S },
    ]);
    assert.deepEqual(
      matches.map((m) => m.story.id),
      [2]
    );
  });
  it("prunes old entries and keeps new ones once", () => {
    const old = { id: 9, t: NOW_S - 60 * 3600 };
    const recent = { id: 8, t: NOW_S - 3600 };
    const next = updateSent(
      [old, recent],
      [candidate(7, "x", 10), candidate(8, "x", 10)],
      NOW_S
    );
    assert.deepEqual(next.map((e) => e.id).sort(), [7, 8]);
    assert.deepEqual(parseSent("nope"), []);
    assert.deepEqual(parseSent([{ id: 1, t: 2 }, { id: "x" }]), [
      { id: 1, t: 2 },
    ]);
  });
  it("formats the push like the brief", () => {
    const [match] = findMatches(
      [rule("SQLite", 100)],
      [candidate(42, "SQLite 4 announced", 142)],
      []
    );
    const plan = planPushes([match!]);
    assert.deepEqual(plan.messages, [
      {
        title: "🔔 SQLite · 142 points",
        body: "SQLite 4 announced",
        sound: "default",
        threadId: "alerts",
        data: { url: "hnclient://story/42", kind: "alert" },
      },
    ]);
  });
  it("shows the host for a site: rule", () => {
    const [match] = findMatches(
      [rule("site:Example.com", 10)],
      [candidate(1, "t", 50, "https://example.com/x")],
      []
    );
    assert.equal(
      planPushes([match!]).messages[0]?.title,
      "🔔 example.com · 50 points"
    );
  });
  it("sends up to 3 individually, else 2 plus one collapsed push", () => {
    const make = (n: number) =>
      findMatches(
        [rule("rust")],
        Array.from({ length: n }, (_, i) =>
          candidate(i + 1, `Rust ${i}`, 100 + i)
        ),
        []
      );
    assert.equal(planPushes(make(3)).messages.length, 3);
    const plan = planPushes(make(6));
    assert.equal(plan.messages.length, 3);
    assert.equal(plan.covered.length, 6);
    assert.equal(plan.messages[2]?.body, "4 more stories match your alerts");
    assert.equal(plan.messages[2]?.data?.url, undefined);
    assert.equal(plan.messages[2]?.data?.kind, "alert");
    assert.deepEqual(
      plan.messages.slice(0, 2).map((m) => m.data?.url),
      ["hnclient://story/6", "hnclient://story/5"]
    );
  });
});

function world(initial: unknown[]) {
  const pushes: {
    to: string;
    title: string;
    body?: string;
    data?: JsonValue;
  }[] = [];
  let algoliaCalls = 0;
  let ticket = 0;
  const state = { hits: initial, sendOk: true };
  const fetchImpl = fakeFetch(async (url, init) => {
    if (url.includes("exp.host") && url.includes("/send")) {
      const batch = JSON.parse(String(init?.body));
      if (!state.sendOk) return new Response("down", { status: 500 });
      pushes.push(...batch);
      return Response.json({
        data: batch.map(() => ({ status: "ok", id: `t${ticket++}` })),
      });
    }
    if (url.includes("getReceipts")) return Response.json({ data: {} });
    if (url.includes("search_by_date")) {
      algoliaCalls++;
      return Response.json({ hits: state.hits, nbPages: 1 });
    }
    return new Response("nope", { status: 404 });
  });
  return { pushes, state, fetchImpl, calls: () => algoliaCalls };
}

async function enable(
  store: MemoryStore,
  installId: string,
  token: string,
  alerts: AlertRule[],
  pro = true
) {
  await upsertDevice(store, installId, {
    platform: "ios",
    appVersion: "1.0.0",
    timezone: "UTC",
    expoPushToken: token,
    prefs: { alerts },
  });
  await store.set(`entitlement:${installId}`, { pro });
}

function setup(hits: unknown[]) {
  const store = new MemoryStore();
  const w = world(hits);
  const deps = {
    store,
    fetch: w.fetchImpl,
    now: () => NOW,
    secretKey: "sk",
    secret: "cron-secret",
  };
  return { store, w, deps };
}

describe("runAlerts", () => {
  it("fetches candidates once for all installs and pushes matches once", async () => {
    const { store, w, deps } = setup([
      hit(1, "SQLite 4 announced", 142),
      hit(2, "Rust release", 80),
      hit(3, "SQLite tiny", 30),
    ]);
    await enable(store, ID_A, TOKEN_A, [rule("sqlite", 100)]);
    await enable(store, ID_B, TOKEN_B, [rule("rust", 50), rule("sqlite", 10)]);

    const first = await runAlerts(deps);
    assert.equal(w.calls(), 1);
    assert.equal(first.installs, 2);
    assert.equal(first.candidates, 3);
    assert.equal(first.sent, 4);
    const forA = w.pushes.filter((p) => p.to === TOKEN_A);
    assert.deepEqual(
      forA.map((p) => p.title),
      ["🔔 sqlite · 142 points"]
    );
    assert.equal(w.pushes.filter((p) => p.to === TOKEN_B).length, 3);

    const sent = await store.get<unknown[]>(sentKey(ID_A));
    assert.deepEqual(sent, [{ id: 1, t: NOW_S - 3600 }]);
    assert.equal(store.ttls.get(sentKey(ID_A)), 3 * 24 * 60 * 60);

    const before = w.pushes.length;
    const second = await runAlerts(deps);
    assert.equal(second.sent, 0);
    assert.equal(w.pushes.length, before);
  });

  it("sends a story again only when it is a different story", async () => {
    const { store, w, deps } = setup([hit(1, "SQLite one", 120)]);
    await enable(store, ID_A, TOKEN_A, [rule("sqlite", 100)]);
    await runAlerts(deps);
    w.state.hits = [hit(1, "SQLite one", 400), hit(2, "SQLite two", 150)];
    await runAlerts(deps);
    assert.deepEqual(
      w.pushes.map((p) => p.data),
      [
        { url: "hnclient://story/1", kind: "alert" },
        { url: "hnclient://story/2", kind: "alert" },
      ]
    );
  });

  it("caps pushes per install and run and collapses the rest", async () => {
    const hits = Array.from({ length: 8 }, (_, i) =>
      hit(i + 1, `Rust ${i}`, 100 + i)
    );
    const { store, w, deps } = setup(hits);
    await enable(store, ID_A, TOKEN_A, [rule("rust")]);
    const summary = await runAlerts(deps);
    assert.equal(summary.matched, 8);
    assert.equal(w.pushes.length, 3);
    assert.equal(w.pushes[2]?.body, "6 more stories match your alerts");
    // All eight are marked sent: nothing more next run.
    await runAlerts(deps);
    assert.equal(w.pushes.length, 3);
  });

  it("skips non-Pro, tokenless and alert-less installs, and does not fetch for nobody", async () => {
    const { store, w, deps } = setup([hit(1, "SQLite", 200)]);
    await enable(store, ID_A, TOKEN_A, [rule("sqlite")], false);
    await upsertDevice(store, ID_B, {
      platform: "ios",
      appVersion: "1.0.0",
      timezone: "UTC",
      prefs: { alerts: [rule("sqlite")] },
    });
    await store.set(`entitlement:${ID_B}`, { pro: true });
    const summary = await runAlerts(deps);
    assert.equal(summary.installs, 0);
    assert.equal(w.calls(), 0);
    assert.equal(w.pushes.length, 0);
  });

  it("keeps the sent list when Expo rejects every push, so the next run retries", async () => {
    const { store, w, deps } = setup([hit(1, "SQLite", 200)]);
    await enable(store, ID_A, TOKEN_A, [rule("sqlite")]);
    w.state.sendOk = false;
    const failed = await runAlerts(deps);
    assert.equal(failed.errors, 1);
    assert.equal(await store.get(sentKey(ID_A)), null);
    w.state.sendOk = true;
    const retried = await runAlerts(deps);
    assert.equal(retried.sent, 1);
  });

  it("reports an Algolia failure without pushing", async () => {
    const { store, deps } = setup([]);
    await enable(store, ID_A, TOKEN_A, [rule("sqlite")]);
    const summary = await runAlerts({
      ...deps,
      fetch: fakeFetch(() => new Response("down", { status: 503 })),
    });
    assert.equal(summary.errors, 1);
    assert.equal(summary.sent, 0);
  });

  it("stops at the time budget and continues after the cursor", async () => {
    const { store, w, deps } = setup([hit(1, "SQLite", 200)]);
    await enable(store, ID_A, TOKEN_A, [rule("sqlite")]);
    await enable(store, ID_B, TOKEN_B, [rule("sqlite")]);
    // Sending takes a minute of (fake) time, which uses up the budget.
    let clock = NOW;
    const timed = {
      ...deps,
      now: () => clock,
      fetch: fakeFetch((url, init) => {
        if (url.includes("/send")) clock += 60_000;
        return w.fetchImpl(url, init);
      }),
      budgetMs: 50_000,
      installsPerBatch: 1,
    };
    const first = await runAlerts(timed);
    assert.equal(first.partial, true);
    assert.equal(first.installs, 1);
    assert.equal(await store.get("alerts:cursor"), ID_A < ID_B ? ID_A : ID_B);
    const second = await runAlerts(timed);
    assert.equal(second.installs, 1);
    assert.equal(w.pushes.length, 2);
  });

  it("does not run twice at once", async () => {
    const { store, w, deps } = setup([hit(1, "SQLite", 200)]);
    await enable(store, ID_A, TOKEN_A, [rule("sqlite")]);
    await store.incr("alerts:lock", 120);
    const summary = await runAlerts(deps);
    assert.equal(summary.installs, 0);
    assert.equal(w.pushes.length, 0);
  });
});

describe("handleAlertsCron", () => {
  it("requires the cron secret", async () => {
    const { deps } = setup([]);
    const denied = await handleAlertsCron(
      new Request("https://x/api/cron/alerts"),
      deps
    );
    assert.equal(denied.status, 401);
    const wrong = await handleAlertsCron(
      new Request("https://x/api/cron/alerts", {
        headers: { authorization: "Bearer nope" },
      }),
      deps
    );
    assert.equal(wrong.status, 401);
  });
  it("answers the run summary", async () => {
    const { store, w, deps } = setup([hit(1, "SQLite", 200)]);
    await enable(store, ID_A, TOKEN_A, [rule("sqlite")]);
    const response = await handleAlertsCron(
      new Request("https://x/api/cron/alerts", {
        headers: { authorization: "Bearer cron-secret" },
      }),
      deps
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.sent, 1);
    assert.equal(w.pushes.length, 1);
  });
});
