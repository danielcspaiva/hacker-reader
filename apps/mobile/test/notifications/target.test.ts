import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseNotificationTarget } from "@/lib/notifications/target";

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
    assert.equal(
      parseNotificationTarget({ url: "hnclient://story/9?commentId=x" })
        ?.commentId,
      undefined
    );
  });

  it("rejects anything that is not a story link", () => {
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
