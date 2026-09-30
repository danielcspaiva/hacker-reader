import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mapLimit } from "../lib/async";
import { getDevice, upsertDevice, type DeviceInput } from "../lib/devices";
import type { JsonValue } from "../lib/json";
import {
  buildReplyMessages,
  collectReplyIds,
  diffReplies,
  excerpt,
  notifiableReplies,
  type HnItem,
} from "../lib/replies";
import { handleRepliesCron, runReplies, stateKey } from "../lib/replies-cron";
import { fakeFetch } from "./helpers";
import { MemoryStore } from "./memory-store";

const ID_A = "3f2b8f3e-6f6e-4a52-9a7e-0f1e1c2d3a4b";
const ID_B = "7a1c9d2e-1b3f-4c5d-8e6f-0a1b2c3d4e5f";
const TOKEN_A = "ExponentPushToken[aaaaaaaaaaaaaaaaaaaa]";
const TOKEN_B = "ExponentPushToken[bbbbbbbbbbbbbbbbbbbb]";

describe("reply diffing", () => {
  const items: HnItem[] = [
    { id: 1, kids: [10, 12] },
    { id: 2, kids: [11] },
    { id: 3, deleted: true, kids: [99] },
    { id: 4 },
  ];

  it("collects kids of live submissions, highest first", () => {
    assert.deepEqual(collectReplyIds(items), [12, 11, 10]);
  });

  it("sets only a baseline on the first run", () => {
    assert.deepEqual(diffReplies([10, 12, 11], null), {
      highest: 12,
      fresh: [],
      isBaseline: true,
    });
    assert.deepEqual(diffReplies([], null).highest, 0);
  });

  it("returns only ids above the stored mark, and never lowers it", () => {
    assert.deepEqual(diffReplies([12, 11, 10], 10), {
      highest: 12,
      fresh: [12, 11],
      isBaseline: false,
    });
    assert.deepEqual(diffReplies([5], 10), {
      highest: 10,
      fresh: [],
      isBaseline: false,
    });
  });

  it("drops dead, deleted, textless and own replies", () => {
    const list = notifiableReplies(
      [
        { id: 1, by: "dang", text: "hi" },
        { id: 2, by: "PG", text: "mine" },
        { id: 3, by: "x", text: "gone", deleted: true },
        { id: 4, by: "x", text: "dead", dead: true },
        { id: 5, by: "x" },
        null,
        { id: 6, by: "sama", text: "yo" },
      ],
      "pg"
    );
    assert.deepEqual(
      list.map((item) => item.id),
      [6, 1]
    );
  });
});

describe("messages", () => {
  const reply = (id: number, storyId?: number) => ({
    id,
    by: "dang",
    text: `<p>Reply &amp; ${id}`,
    storyId,
  });

  it("strips HTML and cuts the excerpt", () => {
    assert.equal(excerpt("<p>a &amp; <i>b</i>&#x27;s"), "a & b's");
    assert.equal(excerpt("x".repeat(200)).length, 141);
  });

  it("builds a push with a deep link", () => {
    const [message] = buildReplyMessages([reply(7, 3)]);
    assert.equal(message?.title, "💬 dang replied");
    assert.equal(message?.body, "Reply & 7");
    assert.equal(message?.url, "hnclient://story/3?commentId=7");
  });

  it("caps at 5 pushes, collapsing the rest into one", () => {
    const replies = [9, 8, 7, 6, 5, 4, 3].map((id) => reply(id, 1));
    const messages = buildReplyMessages(replies);
    assert.equal(messages.length, 5);
    assert.equal(messages[0]?.body, "and 3 more replies");
    assert.deepEqual(
      messages.slice(1).map((m) => m.replyId),
      [6, 7, 8, 9]
    );
    assert.equal(
      buildReplyMessages([9, 8, 7, 6, 5].map((id) => reply(id))).length,
      5
    );
    // Replies that were not fetched still count towards "and N more".
    const withExtra = buildReplyMessages([reply(1)], 1);
    assert.deepEqual(
      withExtra.map((m) => m.body),
      ["and 1 more reply", "Reply & 1"]
    );
    assert.equal(buildReplyMessages([], 6)[0]?.body, "and 6 more replies");
  });
});

describe("mapLimit", () => {
  it("keeps order and bounds concurrency", async () => {
    let active = 0;
    let peak = 0;
    const result = await mapLimit([1, 2, 3, 4, 5, 6], 2, async (n) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 2));
      active--;
      return n * 2;
    });
    assert.deepEqual(result, [2, 4, 6, 8, 10, 12]);
    assert.equal(peak, 2);
  });
});

interface TestItem {
  id: number;
  type: string;
  by?: string;
  parent?: number;
  text?: string;
  kids?: number[];
}

/** A fake HN + Algolia + Expo push world. */
function world() {
  const users = new Map<string, number[]>();
  const items = new Map<number, TestItem>();
  const pushes: { to: string; title: string; data?: JsonValue }[] = [];
  let ticket = 0;
  const handle = async (url: string, init: RequestInit | undefined) => {
    if (url.includes("exp.host") && url.includes("/send")) {
      const batch = JSON.parse(String(init?.body));
      pushes.push(...batch);
      return Response.json({
        data: batch.map(() => ({ status: "ok", id: `t${ticket++}` })),
      });
    }
    if (url.includes("getReceipts")) return Response.json({ data: {} });
    let m = /firebaseio\.com\/v0\/user\/(.+)\.json/.exec(url);
    if (m) {
      const submitted = users.get(decodeURIComponent(m[1]!));
      return Response.json(submitted ? { id: m[1], submitted } : null);
    }
    m = /firebaseio\.com\/v0\/item\/(\d+)\.json/.exec(url);
    if (m) return Response.json(items.get(Number(m[1])) ?? null);
    m = /algolia\.com\/api\/v1\/items\/(\d+)/.exec(url);
    if (m) {
      // Walk to the story like Algolia would.
      let cur = items.get(Number(m[1]));
      while (cur?.type === "comment" && cur.parent !== undefined) {
        cur = items.get(cur.parent);
      }
      return Response.json({ story_id: cur?.id ?? null });
    }
    return new Response("nope", { status: 404 });
  };
  return { users, items, pushes, handle, fetchImpl: fakeFetch(handle) };
}

async function enable(
  store: MemoryStore,
  installId: string,
  token: string,
  username: string,
  extra: Partial<DeviceInput> = {}
) {
  await upsertDevice(store, installId, {
    platform: "ios",
    appVersion: "1.0.0",
    timezone: "UTC",
    expoPushToken: token,
    hnUsername: username,
    prefs: { replies: true },
    ...extra,
  });
  await store.set(`entitlement:${installId}`, { pro: true });
}

function setup() {
  const store = new MemoryStore();
  const w = world();
  const deps = {
    store,
    fetch: w.fetchImpl,
    secretKey: "sk",
    secret: "cron-secret",
  };
  // pg: story 100 with one reply 101, comment 102 on it with reply 103
  w.users.set("pg", [102, 100]);
  w.items.set(100, { id: 100, type: "story", by: "pg", kids: [101] });
  w.items.set(101, {
    id: 101,
    type: "comment",
    by: "bob",
    parent: 100,
    text: "first",
    kids: [],
  });
  w.items.set(102, {
    id: 102,
    type: "comment",
    by: "pg",
    parent: 101,
    text: "mine",
    kids: [103],
  });
  w.items.set(103, {
    id: 103,
    type: "comment",
    by: "bob",
    parent: 102,
    text: "older",
    kids: [],
  });
  return { store, w, deps };
}

describe("runReplies", () => {
  it("only sets the baseline on the first run, then pushes new replies once", async () => {
    const { store, w, deps } = setup();
    await enable(store, ID_A, TOKEN_A, "pg");

    const first = await runReplies(deps);
    assert.equal(first.baselines, 1);
    assert.equal(w.pushes.length, 0);
    assert.equal(await store.get(stateKey("pg")), 103);

    // A reply to the story and a reply to the user's comment (walks to story 100).
    w.items.set(100, { id: 100, type: "story", by: "pg", kids: [101, 104] });
    w.items.set(104, {
      id: 104,
      type: "comment",
      by: "dang",
      parent: 100,
      text: "<p>Nice post",
      kids: [],
    });
    w.items.set(102, {
      id: 102,
      type: "comment",
      by: "pg",
      parent: 101,
      text: "mine",
      kids: [103, 105],
    });
    w.items.set(105, {
      id: 105,
      type: "comment",
      by: "sama",
      parent: 102,
      text: "deep",
      kids: [],
    });
    w.items.set(106, {
      id: 106,
      type: "comment",
      by: "pg",
      parent: 105,
      text: "self",
      kids: [],
    });
    w.items.set(105, {
      id: 105,
      type: "comment",
      by: "sama",
      parent: 102,
      text: "deep",
      kids: [106],
    });

    const second = await runReplies(deps);
    assert.equal(second.replies, 2);
    assert.deepEqual(
      w.pushes.map((p) => [p.to, p.title]),
      [
        [TOKEN_A, "💬 dang replied"],
        [TOKEN_A, "💬 sama replied"],
      ]
    );
    assert.deepEqual(w.pushes[0]?.data, {
      kind: "reply",
      url: "hnclient://story/100?commentId=104",
    });
    assert.deepEqual(w.pushes[1]?.data, {
      kind: "reply",
      url: "hnclient://story/100?commentId=105",
    });
    // Only direct replies to submissions count: 106 is a reply to a reply.
    assert.equal(await store.get(stateKey("pg")), 105);

    const third = await runReplies(deps);
    assert.equal(third.replies, 0);
    assert.equal(w.pushes.length, 2);
  });

  it("shares state across devices of one username without double-sending", async () => {
    const { store, w, deps } = setup();
    await enable(store, ID_A, TOKEN_A, "pg");
    await enable(store, ID_B, TOKEN_B, "pg");
    await runReplies(deps);

    w.items.set(100, { id: 100, type: "story", by: "pg", kids: [101, 110] });
    w.items.set(110, {
      id: 110,
      type: "comment",
      by: "dang",
      parent: 100,
      text: "hey",
      kids: [],
    });
    await runReplies(deps);
    await runReplies(deps);

    assert.deepEqual(w.pushes.map((p) => p.to).sort(), [TOKEN_A, TOKEN_B]);
  });

  it("skips devices that are not Pro, have replies off or lack a username", async () => {
    const { store, w, deps } = setup();
    await enable(store, ID_A, TOKEN_A, "pg");
    await store.set(`entitlement:${ID_A}`, { pro: false });
    await enable(store, ID_B, TOKEN_B, "pg", { prefs: { replies: false } });
    await runReplies(deps);
    assert.equal(await store.get(stateKey("pg")), null);
    assert.equal(w.pushes.length, 0);
  });

  it("caps pushes per user and collapses the rest", async () => {
    const { store, w, deps } = setup();
    await enable(store, ID_A, TOKEN_A, "pg");
    await runReplies(deps);

    const kids = [101];
    for (let id = 120; id < 128; id++) {
      kids.push(id);
      w.items.set(id, {
        id,
        type: "comment",
        by: "bob",
        parent: 100,
        text: `r${id}`,
        kids: [],
      });
    }
    w.items.set(100, { id: 100, type: "story", by: "pg", kids });
    const summary = await runReplies(deps);
    assert.equal(summary.replies, 8);
    assert.equal(w.pushes.length, 5);
    assert.equal(w.pushes[0]?.title, "💬 Replies on Hacker News");
  });

  it("keeps the mark when Expo rejects everything so the next run retries", async () => {
    const { store, w, deps } = setup();
    await enable(store, ID_A, TOKEN_A, "pg");
    await runReplies(deps);
    w.items.set(100, { id: 100, type: "story", by: "pg", kids: [101, 130] });
    w.items.set(130, {
      id: 130,
      type: "comment",
      by: "bob",
      parent: 100,
      text: "x",
      kids: [],
    });

    const failing = fakeFetch((url, init) =>
      url.includes("/send")
        ? new Response("boom", { status: 500 })
        : w.handle(url, init)
    );
    const result = await runReplies({ ...deps, fetch: failing });
    assert.equal(result.errors, 1);
    assert.equal(await store.get(stateKey("pg")), 103);
    await runReplies(deps);
    assert.equal(w.pushes.length, 1);
  });

  it("batches users with a cursor when the time budget runs out", async () => {
    const { store, w, deps } = setup();
    for (const [i, name] of ["aa", "bb", "cc"].entries()) {
      w.users.set(name, []);
      await enable(
        store,
        `${i}f2b8f3e-6f6e-4a52-9a7e-0f1e1c2d3a4b`,
        `ExponentPushToken[${name.repeat(10)}]`,
        name
      );
    }
    let clock = 0;
    const timed = {
      ...deps,
      usersPerBatch: 1,
      budgetMs: 10,
      now: () => (clock += 6),
    };

    // Each run gets through one user before the budget is gone.
    const run1 = await runReplies(timed);
    assert.equal(run1.partial, true);
    assert.equal(run1.users, 1);
    assert.equal(await store.get("replies:cursor"), "aa");

    clock = 0;
    const run2 = await runReplies(timed);
    assert.equal(run2.users, 1);
    assert.equal(await store.get("replies:cursor"), "bb");

    clock = 0;
    const run3 = await runReplies(timed);
    assert.equal(run3.users, 1);
    assert.equal(run3.partial, false);
    assert.equal(await store.get("replies:cursor"), null);
    assert.equal(await store.get(stateKey("cc")), 0);
  });

  it("skips a run while another holds the lock", async () => {
    const { store, deps } = setup();
    await enable(store, ID_A, TOKEN_A, "pg");
    await store.incr("replies:lock", 120);
    const summary = await runReplies(deps);
    assert.equal(summary.users, 0);
    assert.equal(await store.get(stateKey("pg")), null);
  });
});

describe("handleRepliesCron", () => {
  it("rejects requests without the cron secret", async () => {
    const { deps } = setup();
    const response = await handleRepliesCron(
      new Request("https://x.test/api/cron/replies"),
      deps
    );
    assert.equal(response.status, 401);
  });

  it("runs with the secret and reports a summary", async () => {
    const { store, deps } = setup();
    await enable(store, ID_A, TOKEN_A, "pg");
    const response = await handleRepliesCron(
      new Request("https://x.test/api/cron/replies", {
        headers: { Authorization: "Bearer cron-secret" },
      }),
      deps
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.users, 1);
    assert.equal(body.baselines, 1);
  });
});

describe("device prefs merge", () => {
  it("keeps other prefs when one is toggled", async () => {
    const store = new MemoryStore();
    await enable(store, ID_A, TOKEN_A, "pg", {
      prefs: { replies: true, hour: 8 },
    });
    await upsertDevice(store, ID_A, {
      platform: "ios",
      appVersion: "1.0.0",
      timezone: "UTC",
      prefs: { replies: false },
    });
    assert.deepEqual((await getDevice(store, ID_A))?.prefs, {
      replies: false,
      hour: 8,
    });
  });
});
