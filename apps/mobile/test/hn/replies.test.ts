import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildReplies,
  collectReplyIds,
  countUnread,
  isRepliesSeenEntry,
  isReplyNotificationsEntry,
  nextSeenAt,
  replyContextLabel,
  seenAtFor,
  withSeenAt,
} from "@/lib/hn/replies";
import type { HNItem } from "@/lib/hn/types";

const item = (id: number, extra: Partial<HNItem> = {}): HNItem => ({
  id,
  time: 1000,
  ...extra,
});

describe("collectReplyIds", () => {
  it("takes kids of live submissions, newest id first, deduped", () => {
    const submissions = [
      item(1, { kids: [10, 12] }),
      item(2, { kids: [11, 12] }),
      item(3, { kids: [99], deleted: true }),
      item(4, { kids: [98], dead: true }),
      { id: 5, kids: [97] }, // purged stub without a time
      item(6),
    ];
    assert.deepEqual(collectReplyIds(submissions), [12, 11, 10]);
  });

  it("caps to the newest ids", () => {
    assert.deepEqual(
      collectReplyIds([item(1, { kids: [1, 2, 3, 4] })], 2),
      [4, 3]
    );
  });
});

describe("buildReplies", () => {
  const story = item(1, { type: "story", title: "Show HN", by: "pg" });
  const mine = item(2, { type: "comment", text: "my take", by: "pg" });
  const submissions = [story, mine];

  it("pairs replies with parents, drops own/dead/deleted, sorts newest first", () => {
    const replies = [
      item(10, { parent: 1, by: "a", time: 100, text: "old" }),
      item(11, { parent: 2, by: "b", time: 300, text: "new" }),
      item(12, { parent: 1, by: "PG", time: 400, text: "self" }),
      item(13, { parent: 1, by: "c", time: 500, dead: true }),
      item(14, { parent: 1, by: "d", time: 600, deleted: true }),
      item(15, { parent: 1, by: "e", time: 300, text: "tie" }),
      item(16, { parent: 777, by: "f", time: 700, text: "unknown parent" }),
      { id: 17, parent: 1, by: "g" }, // no time
    ];
    const entries = buildReplies(submissions, replies, "pg");
    assert.deepEqual(
      entries.map((entry) => entry.reply.id),
      [15, 11, 10]
    );
    assert.equal(entries[1]?.parent.id, 2);
  });
});

describe("unread", () => {
  const entries = buildReplies(
    [item(1, { type: "story" })],
    [
      item(10, { parent: 1, by: "a", time: 100 }),
      item(11, { parent: 1, by: "b", time: 200 }),
    ],
    "me"
  );

  it("counts replies newer than the last-seen time", () => {
    assert.equal(countUnread(entries, 150), 1);
    assert.equal(countUnread(entries, 200), 0);
    assert.equal(countUnread(entries, 0), 2);
  });

  it("counts everything when the inbox was never opened", () => {
    assert.equal(countUnread(entries, undefined), 2);
  });

  it("marks seen at now, or at the newest reply if that is later", () => {
    assert.equal(nextSeenAt(entries, 500), 500);
    assert.equal(nextSeenAt(entries, 150), 200);
    assert.equal(nextSeenAt([], 42), 42);
  });
});

describe("replyContextLabel", () => {
  it("uses a story title, or an excerpt of your comment", () => {
    assert.equal(replyContextLabel(item(1, { title: "Hello" })), "Hello");
    assert.equal(
      replyContextLabel(item(2, { text: "<p>One &amp; two</p>" })),
      "Your comment: One & two"
    );
    const long = replyContextLabel(item(3, { text: "word ".repeat(40) }));
    assert.ok(long.endsWith("..."));
    assert.ok(long.length < 100);
    assert.equal(replyContextLabel(item(4)), "Your comment");
  });
});

describe("stored entries", () => {
  it("guards entries", () => {
    assert.equal(isRepliesSeenEntry({ username: "a", seenAt: 1 }), true);
    assert.equal(isRepliesSeenEntry({ username: "a" }), false);
    assert.equal(isReplyNotificationsEntry({ username: "a" }), true);
    assert.equal(isReplyNotificationsEntry({ user: "a" }), false);
  });

  it("only moves last-seen forward, per user", () => {
    let entries = withSeenAt([], "a", 100);
    entries = withSeenAt(entries, "b", 50);
    entries = withSeenAt(entries, "a", 80);
    assert.equal(seenAtFor(entries, "a"), 100);
    assert.equal(seenAtFor(entries, "b"), 50);
    assert.equal(seenAtFor(entries, "c"), undefined);
    assert.equal(seenAtFor(withSeenAt(entries, "a", 120), "a"), 120);
  });
});
