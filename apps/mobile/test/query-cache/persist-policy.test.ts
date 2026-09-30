import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { hnKeys } from "@/lib/hn/read/keys";
import { DEFAULT_SEARCH_OPTIONS } from "@/lib/hn/read/search-params";
import {
  selectThreadsToPrefetch,
  runWithConcurrency,
} from "@/lib/query-cache/bookmark-prefetch";
import { isOfflineState } from "@/lib/query-cache/offline";
import {
  PersistedCacheTooLargeError,
  fitWithinLimit,
  persistBuster,
  selectPersistedStoryIds,
  serializeWithinLimit,
  shouldPersistQuery,
  storyQueryEntries,
  trimPersistedData,
} from "@/lib/query-cache/persist-policy";

const ok = { status: "success", dataUpdatedAt: 1 };
const query = (queryKey: readonly unknown[], state = ok) => ({
  queryKey,
  state,
});
const none = new Set<number>();

describe("shouldPersistQuery", () => {
  it("keeps successful category feeds", () => {
    assert.equal(shouldPersistQuery(query(hnKeys.stories("top")), none), true);
    assert.equal(shouldPersistQuery(query(hnKeys.stories("jobs")), none), true);
  });

  it("skips feeds that are not successful", () => {
    const pending = { status: "pending", dataUpdatedAt: 0 };
    const error = { status: "error", dataUpdatedAt: 0 };
    assert.equal(
      shouldPersistQuery(query(hnKeys.stories("top"), pending), none),
      false
    );
    assert.equal(
      shouldPersistQuery(query(hnKeys.stories("top"), error), none),
      false
    );
  });

  it("keeps only the chosen story threads", () => {
    const chosen = new Set([7]);
    assert.equal(shouldPersistQuery(query(hnKeys.story(7)), chosen), true);
    assert.equal(shouldPersistQuery(query(hnKeys.story(8)), chosen), false);
  });

  it("never keeps local stores, auth-adjacent, search or lookup queries", () => {
    const everything = new Set([1]);
    const keys = [
      hnKeys.bookmarks(),
      hnKeys.bookmarkedStories(),
      hnKeys.votes(),
      hnKeys.hidden(),
      hnKeys.readStories(),
      hnKeys.blockedUsers(),
      hnKeys.mutes(),
      hnKeys.searchOptions(),
      hnKeys.recentSearches(),
      hnKeys.search("rust", DEFAULT_SEARCH_OPTIONS),
      hnKeys.item(1),
      hnKeys.user("pg"),
      hnKeys.submissions([1]),
      hnKeys.ogMetadata("https://example.com"),
      hnKeys.frontPage("2026-09-01"),
      hnKeys.commentStory(1),
      ["session"],
      ["auth"],
    ];
    for (const key of keys) {
      assert.equal(shouldPersistQuery(query(key), everything), false, `${key}`);
    }
  });

  it("does not treat the stories prefix alone as a feed", () => {
    assert.equal(shouldPersistQuery(query(hnKeys.allStories()), none), false);
  });
});

describe("selectPersistedStoryIds", () => {
  it("keeps bookmarks plus the most recently fetched stories", () => {
    const entries = [
      { id: 1, dataUpdatedAt: 10 },
      { id: 2, dataUpdatedAt: 30 },
      { id: 3, dataUpdatedAt: 20 },
    ];
    assert.deepEqual(
      [...selectPersistedStoryIds(entries, [1], 2)].sort(),
      [1, 2, 3]
    );
    assert.deepEqual(
      [...selectPersistedStoryIds(entries, [], 2)].sort(),
      [2, 3]
    );
  });

  it("reads story ids from successful story queries only", () => {
    const entries = storyQueryEntries([
      query(hnKeys.story(5), { status: "success", dataUpdatedAt: 9 }),
      query(hnKeys.story(6), { status: "pending", dataUpdatedAt: 0 }),
      query(hnKeys.stories("top")),
      query(hnKeys.item(5)),
    ]);
    assert.deepEqual(entries, [{ id: 5, dataUpdatedAt: 9 }]);
  });
});

describe("trimPersistedData", () => {
  const pages = [[1], [2], [3], [4]];
  it("keeps the first two pages of an infinite query", () => {
    const data = { pages, pageParams: [0, 30, 60, 90] };
    assert.deepEqual(trimPersistedData(data), {
      pages: [[1], [2]],
      pageParams: [0, 30],
    });
  });

  it("leaves short lists and other data alone", () => {
    const short = { pages: [[1]], pageParams: [0] };
    assert.equal(trimPersistedData(short), short);
    const story = { id: 1, comments: [] };
    assert.equal(trimPersistedData<object>(story), story);
  });
});

describe("serializeWithinLimit", () => {
  it("returns the JSON under the limit", () => {
    assert.equal(serializeWithinLimit({ a: 1 }, 100), '{"a":1}');
  });

  it("throws a typed error over the limit instead of returning it", () => {
    assert.throws(
      () => serializeWithinLimit({ text: "x".repeat(200) }, 100),
      (error) =>
        error instanceof PersistedCacheTooLargeError && error.chars > 100
    );
  });
});

describe("persistBuster", () => {
  it("changes with the app version", () => {
    assert.notEqual(persistBuster("1.4.0"), persistBuster("1.5.0"));
  });
});

describe("isOfflineState", () => {
  it("is offline only when the OS says so", () => {
    assert.equal(isOfflineState({}), false);
    assert.equal(isOfflineState({ isConnected: true }), false);
    assert.equal(isOfflineState({ isConnected: false }), true);
    assert.equal(
      isOfflineState({ isConnected: true, isInternetReachable: false }),
      true
    );
  });
});

describe("bookmark prefetch", () => {
  it("skips cached threads and caps the count", () => {
    const ids = Array.from({ length: 80 }, (_, i) => i + 1);
    const picked = selectThreadsToPrefetch(ids, (id) => id <= 10, 50);
    assert.equal(picked.length, 50);
    assert.equal(picked[0], 11);
  });

  it("never runs more than the concurrency at once and survives failures", async () => {
    let active = 0;
    let peak = 0;
    const done: number[] = [];
    await runWithConcurrency([1, 2, 3, 4, 5, 6, 7, 8, 9], 4, async (n) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      if (n === 3) throw new Error("boom");
      done.push(n);
    });
    assert.equal(peak, 4);
    assert.equal(done.length, 8);
  });
});

describe("fitWithinLimit", () => {
  const entry = (queryKey: readonly unknown[], at: number, size: number) => ({
    queryKey,
    state: { dataUpdatedAt: at, data: "x".repeat(size) },
  });
  const client = (queries: ReturnType<typeof entry>[]) => ({
    timestamp: 0,
    buster: "b",
    clientState: { mutations: [], queries },
  });

  it("returns the full payload when it fits", () => {
    const value = client([entry(hnKeys.stories("top"), 1, 10)]);
    assert.equal(fitWithinLimit(value, 10_000), JSON.stringify(value));
  });

  it("drops the oldest story threads first until it fits", () => {
    const value = client([
      entry(hnKeys.stories("top"), 1, 100),
      entry(hnKeys.story(1), 1, 400),
      entry(hnKeys.story(2), 5, 400),
    ]);
    const out = JSON.parse(fitWithinLimit(value, 900));
    const keys = out.clientState.queries.map(
      (q: { queryKey: unknown[] }) => q.queryKey
    );
    assert.deepEqual(keys, [hnKeys.stories("top"), hnKeys.story(2)]);
  });

  it("throws when the feeds alone are over budget", () => {
    const value = client([entry(hnKeys.stories("top"), 1, 500)]);
    assert.throws(
      () => fitWithinLimit(value, 100),
      (error) => error instanceof PersistedCacheTooLargeError
    );
  });
});
