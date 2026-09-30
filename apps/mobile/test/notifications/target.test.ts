import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isDigestTarget,
  parseNotificationTarget,
} from "@/lib/notifications/target";

describe("parseNotificationTarget", () => {
  it("reads the story, comment and kind of a reply push", () => {
    assert.deepEqual(
      parseNotificationTarget({
        kind: "reply",
        url: "hnclient://story/123?commentId=456",
      }),
      { kind: "reply", storyId: 123, commentId: 456 }
    );
  });

  it("reads the kind of a keyword alert push", () => {
    assert.deepEqual(
      parseNotificationTarget({ kind: "alert", url: "hnclient://story/42" }),
      { kind: "alert", storyId: 42 }
    );
    // The "N more" push has no link: a tap just opens the app.
    assert.equal(parseNotificationTarget({ kind: "alert" }), null);
  });

  it("reads the date of a daily digest push", () => {
    const target = parseNotificationTarget({
      kind: "digest",
      url: "hnclient://digest/2026-09-30",
    });
    assert.deepEqual(target, { kind: "digest", date: "2026-09-30" });
    assert.equal(target !== null && isDigestTarget(target), true);
    // The kind defaults from the link when the push carries none.
    assert.equal(
      parseNotificationTarget({ url: "hnclient://digest/2026-09-30" })?.kind,
      "digest"
    );
    const story = parseNotificationTarget({ url: "hnclient://story/9" });
    assert.equal(story !== null && isDigestTarget(story), false);
  });

  it("rejects malformed digest links", () => {
    for (const url of [
      "hnclient://digest/2026-02-30",
      "hnclient://digest/2026-9-30",
      "hnclient://digest/latest",
      "hnclient://digest/2026-09-30/extra",
      "hnclient://digest/2026-09-30?x=1",
      "hnclient://digest/",
      "https://evil.example/digest/2026-09-30",
    ]) {
      assert.equal(parseNotificationTarget({ url }), null, url);
    }
  });

  it("works without a comment and defaults the kind", () => {
    assert.deepEqual(parseNotificationTarget({ url: "hnclient://story/9" }), {
      kind: "other",
      storyId: 9,
    });
    assert.equal(
      parseNotificationTarget({ kind: "Bad Kind!", url: "hnclient://story/9" })
        ?.kind,
      "other"
    );
  });

  it("ignores a malformed comment id", () => {
    const target = parseNotificationTarget({
      url: "hnclient://story/9?commentId=x",
    });
    assert.ok(target && !isDigestTarget(target));
    assert.equal(target.commentId, undefined);
  });

  it("rejects anything that is not a story or digest link", () => {
    for (const data of [
      null,
      undefined,
      "hnclient://story/1",
      {},
      { url: 5 },
      { url: "https://evil.example/story/1" },
      { url: "hnclient://user/pg" },
      { url: "hnclient://story/abc" },
      { url: "hnclient://story/1/../../x" },
    ]) {
      assert.equal(parseNotificationTarget(data), null);
    }
  });
});
