import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HNAuthError } from "@/lib/hn/errors";
import { addReplyToComment, removeComment } from "@/lib/hn/read/comment-tree";
import { parseStoredCookies } from "@/lib/hn/session";
import type { Comment } from "@/lib/hn/types";
import { parseDeleteConfirmForm, parseFlagLink } from "@/lib/hn/web/parsers";

const c = (id: number, children: Comment[] = []): Comment => ({
  id,
  by: "u",
  time: 0,
  text: "t",
  children,
});

describe("parseStoredCookies", () => {
  it("accepts a flat string map", () => {
    assert.deepEqual(parseStoredCookies('{"user":"a&b"}'), { user: "a&b" });
  });
  it("rejects malformed JSON, non-objects, arrays and non-string values", () => {
    for (const bad of ["{", "null", "1", '"x"', "[]", '{"user":1}']) {
      assert.equal(parseStoredCookies(bad), null, bad);
    }
  });
});

describe("parseDeleteConfirmForm", () => {
  it("reads hmac and goto", () => {
    const html =
      '<input type="hidden" name="goto" value="item?id=3"><input type="hidden" name="hmac" value="H1">';
    assert.deepEqual(parseDeleteConfirmForm(html, 8), {
      hmac: "H1",
      goto: "item?id=3",
    });
  });
  it("defaults goto to the item page", () => {
    const html = '<input name="hmac" value="H1">';
    assert.equal(parseDeleteConfirmForm(html, 8).goto, "item?id=8");
  });
  it("throws PARSE_ERROR without hmac", () => {
    try {
      parseDeleteConfirmForm("<form></form>", 8);
      assert.fail("expected throw");
    } catch (error) {
      assert.ok(error instanceof HNAuthError);
      assert.equal(error.code, "PARSE_ERROR");
      assert.equal(error.message, "Delete confirmation HMAC not found");
    }
  });
});

describe("parsers entity decoding", () => {
  it("decodes &apos; and does not double-decode &amp;lt;", () => {
    const html = `<a href="flag?id=5&amp;auth=a&apos;b&amp;lt;">flag</a>`;
    assert.equal(parseFlagLink(html, 5), "flag?id=5&auth=a'b&lt;");
  });
});

describe("comment tree edits", () => {
  it("addReplyToComment appends at any depth without mutating", () => {
    const tree = [c(1, [c(2, [c(3)])]), c(4)];
    const out = addReplyToComment(tree, 3, c(9));
    assert.equal(out[0].children[0].children[0].children[0].id, 9);
    assert.equal(tree[0].children[0].children[0].children.length, 0);
    assert.equal(out[1], tree[1]);
  });
  it("removeComment drops the subtree at any depth", () => {
    const out = removeComment([c(1, [c(2, [c(3)])]), c(4)], 2);
    assert.deepEqual(
      out.map((x) => [x.id, x.children.length]),
      [
        [1, 0],
        [4, 0],
      ]
    );
  });
});
