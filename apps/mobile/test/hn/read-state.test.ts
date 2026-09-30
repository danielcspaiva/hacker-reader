import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isNewComment,
  isReadStoryEntry,
  markRead,
  maxCommentId,
  newCommentCount,
  readEntryIndex,
  recordVisit,
  removeReadEntry,
  upsertReadEntry,
  type ReadStoryEntry,
} from "@/lib/hn/read-state";
import type { Comment } from "@/lib/hn/types";

const entry = (id: number, extra: Partial<ReadStoryEntry> = {}) => ({
  id,
  readAt: 1,
  commentCount: 0,
  ...extra,
});

const comment = (id: number, children: Comment[] = []): Comment => ({
  id,
  by: "a",
  time: 0,
  text: "x",
  children,
});

describe("upsertReadEntry", () => {
  it("puts the entry first and replaces an earlier one", () => {
    const next = upsertReadEntry([entry(1), entry(2)], entry(2, { readAt: 9 }));
    assert.deepEqual(
      next.map((e) => e.id),
      [2, 1]
    );
    assert.equal(next[0].readAt, 9);
  });

  it("drops the oldest entries past the cap", () => {
    const next = upsertReadEntry([entry(1), entry(2), entry(3)], entry(4), 3);
    assert.deepEqual(
      next.map((e) => e.id),
      [4, 1, 2]
    );
  });
});

describe("recordVisit", () => {
  it("records count and max comment id on a first visit", () => {
    const [saved] = recordVisit([], {
      id: 5,
      now: 100,
      commentCount: 12,
      maxCommentId: 900,
    });
    assert.deepEqual(saved, {
      id: 5,
      readAt: 100,
      commentCount: 12,
      maxSeenCommentId: 900,
    });
  });

  it("never lowers the max seen id", () => {
    const [saved] = recordVisit([entry(5, { maxSeenCommentId: 900 })], {
      id: 5,
      now: 2,
      commentCount: 3,
      maxCommentId: 500,
    });
    assert.equal(saved.maxSeenCommentId, 900);
  });

  it("leaves the max unset for a story without comments", () => {
    const [saved] = recordVisit([], {
      id: 5,
      now: 1,
      commentCount: 0,
      maxCommentId: undefined,
    });
    assert.equal("maxSeenCommentId" in saved, false);
  });
});

describe("markRead / removeReadEntry", () => {
  it("marks read without claiming comments were seen", () => {
    const [saved] = markRead([], { id: 7, now: 5, commentCount: 4 });
    assert.equal(saved.maxSeenCommentId, undefined);
    assert.equal(saved.commentCount, 4);
  });

  it("keeps a previously seen max id", () => {
    const [saved] = markRead([entry(7, { maxSeenCommentId: 50 })], {
      id: 7,
      now: 5,
      commentCount: 9,
    });
    assert.equal(saved.maxSeenCommentId, 50);
  });

  it("removes an entry and returns the same list when absent", () => {
    const list = [entry(1), entry(2)];
    assert.deepEqual(
      removeReadEntry(list, 1).map((e) => e.id),
      [2]
    );
    assert.equal(removeReadEntry(list, 3), list);
  });
});

describe("new comment detection", () => {
  it("counts comments added since the last visit", () => {
    assert.equal(newCommentCount(entry(1, { commentCount: 10 }), 14), 4);
    assert.equal(newCommentCount(entry(1, { commentCount: 10 }), 8), 0);
    assert.equal(newCommentCount(undefined, 14), 0);
  });

  it("flags ids above the previous max, and nothing without a previous visit", () => {
    const previous = entry(1, { maxSeenCommentId: 100 });
    assert.equal(isNewComment(101, previous), true);
    assert.equal(isNewComment(100, previous), false);
    assert.equal(isNewComment(101, undefined), false);
    assert.equal(isNewComment(101, entry(1)), false);
  });

  it("finds the max id across a nested tree", () => {
    const tree = [comment(1, [comment(7, [comment(3)])]), comment(5)];
    assert.equal(maxCommentId(tree), 7);
    assert.equal(maxCommentId([]), undefined);
  });
});

describe("guard and index", () => {
  it("accepts well-formed entries only", () => {
    assert.equal(isReadStoryEntry(entry(1, { maxSeenCommentId: 2 })), true);
    assert.equal(isReadStoryEntry(entry(1)), true);
    assert.equal(isReadStoryEntry({ id: 1 }), false);
    assert.equal(
      isReadStoryEntry({ ...entry(1), maxSeenCommentId: "x" }),
      false
    );
    assert.equal(isReadStoryEntry(null), false);
  });

  it("indexes by id and reuses the map for the same array", () => {
    const list = [entry(1), entry(2)];
    assert.equal(readEntryIndex(list).get(2)?.id, 2);
    assert.equal(readEntryIndex(list), readEntryIndex(list));
  });
});
