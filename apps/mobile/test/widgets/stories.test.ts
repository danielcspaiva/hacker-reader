import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { HNItem } from "@/lib/hn";
import {
  buildCategoryStories,
  buildTimelineEntries,
  mergeBookmarkStories,
  mergeCategoryStories,
  orderedWidgetStories,
  readStoredStories,
  toWidgetStory,
  type WidgetStory,
} from "@/lib/widgets/stories";

function item(id: number, extra: Partial<HNItem> = {}): HNItem {
  return {
    id,
    type: "story",
    title: `Story ${id}`,
    score: id * 10,
    time: 1000 + id,
    descendants: id,
    url: `https://www.example${id}.com/post`,
    by: "someone",
    ...extra,
  };
}

function story(id: number, extra: Partial<WidgetStory> = {}): WidgetStory {
  return { id, title: `Story ${id}`, score: 0, time: 0, comments: 0, ...extra };
}

describe("toWidgetStory", () => {
  it("keeps only the lean fields and strips www from the domain", () => {
    assert.deepEqual(toWidgetStory(item(3)), {
      id: 3,
      title: "Story 3",
      score: 30,
      time: 1003,
      comments: 3,
      domain: "example3.com",
    });
  });

  it("defaults the missing numbers (jobs have no score or comments)", () => {
    const job = toWidgetStory(
      item(4, { score: undefined, descendants: undefined, url: undefined })
    );
    assert.equal(job?.score, 0);
    assert.equal(job?.comments, 0);
    assert.equal(job?.domain, undefined);
  });

  it("drops deleted, dead and untitled items", () => {
    assert.equal(toWidgetStory(item(1, { deleted: true })), null);
    assert.equal(toWidgetStory(item(1, { dead: true })), null);
    assert.equal(toWidgetStory(item(1, { title: undefined })), null);
  });
});

describe("orderedWidgetStories", () => {
  it("keeps the id order, skips missing items and respects the limit", () => {
    const items = [item(1), item(2), item(3, { dead: true }), item(4)];
    assert.deepEqual(
      orderedWidgetStories([4, 9, 3, 1, 2], items, 2).map((s) => s.id),
      [4, 1]
    );
  });
});

describe("buildCategoryStories", () => {
  it("shares one item pool and marks failed lists null", () => {
    const result = buildCategoryStories(
      { top: [1, 2], best: [2, 3], jobs: null },
      [item(1), item(2), item(3)],
      7
    );
    assert.deepEqual(
      result.top?.map((s) => s.id),
      [1, 2]
    );
    assert.deepEqual(
      result.best?.map((s) => s.id),
      [2, 3]
    );
    assert.equal(result.jobs, null);
  });
});

describe("mergeCategoryStories", () => {
  it("keeps the stored stories of a category that failed or came back empty", () => {
    const merged = mergeCategoryStories(
      { top: [story(10)], best: null, new: [] },
      { top: [story(1)], best: [story(2)], new: [story(3)], ask: [story(4)] }
    );
    assert.deepEqual(merged, {
      top: [story(10)],
      best: [story(2)],
      new: [story(3)],
      ask: [story(4)],
    });
  });

  it("returns null when nothing fresh arrived, so the timeline stays untouched", () => {
    assert.equal(
      mergeCategoryStories({ top: null, best: [] }, { top: [story(1)] }),
      null
    );
  });

  it("works without any stored stories", () => {
    assert.deepEqual(mergeCategoryStories({ top: [story(1)] }, {}), {
      top: [story(1)],
    });
  });
});

describe("readStoredStories", () => {
  it("migrates the pre-category array to Top", () => {
    assert.deepEqual(readStoredStories([story(1)]), { top: [story(1)] });
  });

  it("passes a category map through and treats nothing as empty", () => {
    assert.deepEqual(readStoredStories({ best: [story(2)] }), {
      best: [story(2)],
    });
    assert.deepEqual(readStoredStories(undefined), {});
  });
});

describe("mergeBookmarkStories", () => {
  it("follows the bookmark order and prefers fresh copies", () => {
    const merged = mergeBookmarkStories(
      [3, 1, 2],
      [story(1, { score: 99 })],
      [story(1, { score: 1 }), story(2, { score: 2 }), story(3, { score: 3 })]
    );
    assert.deepEqual(
      merged.map((s) => [s.id, s.score]),
      [
        [3, 3],
        [1, 99],
        [2, 2],
      ]
    );
  });

  it("drops bookmarks with no known copy and stories no longer bookmarked", () => {
    assert.deepEqual(
      mergeBookmarkStories([1, 5], [], [story(1), story(2)]).map((s) => s.id),
      [1]
    );
    assert.deepEqual(mergeBookmarkStories([], [story(1)], [story(2)]), []);
  });
});

describe("buildTimelineEntries", () => {
  it("spaces identical props over future dates", () => {
    const props = { a: 1 };
    const entries = buildTimelineEntries(props, 1_000, 3, 500);
    assert.deepEqual(
      entries.map((e) => e.date.getTime()),
      [1_000, 1_500, 2_000]
    );
    assert.ok(entries.every((e) => e.props === props));
  });
});
