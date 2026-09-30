import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mapHitToCommentHit, mapHitToHNItem } from "@/lib/hn/read/algolia";
import { hnKeys } from "@/lib/hn/read/keys";
import {
  convertHNItemToComment,
  mergeAlgoliaWithHNKids,
} from "@/lib/hn/read/merge";
import { DEFAULT_SEARCH_OPTIONS } from "@/lib/hn/read/search-params";
import type { AlgoliaComment } from "@/lib/hn/types";
import { decodeEntities, decodeEntitiesExtended } from "@/lib/html/entities";

function ac(
  id: number,
  author: string | null,
  text: string | null,
  children: AlgoliaComment[] = []
): AlgoliaComment {
  return {
    id,
    created_at: "",
    created_at_i: id * 10,
    author,
    text,
    points: null,
    parent_id: null,
    story_id: 1,
    children,
    type: "comment",
    url: null,
    title: null,
  };
}

describe("hnKeys", () => {
  it("produce the legacy literal arrays", () => {
    assert.deepEqual(hnKeys.allStories(), ["stories"]);
    assert.deepEqual(hnKeys.stories("top"), ["stories", "top"]);
    assert.deepEqual(hnKeys.item(5), ["item", 5]);
    assert.deepEqual(hnKeys.story(5), ["story", 5]);
    assert.deepEqual(hnKeys.user("pg"), ["user", "pg"]);
    assert.deepEqual(hnKeys.submissions([1]), ["submissions", [1]]);
    assert.deepEqual(hnKeys.ogMetadata("u"), ["og-metadata", "u"]);
    assert.deepEqual(hnKeys.search("q", DEFAULT_SEARCH_OPTIONS), [
      "algolia-search",
      "q",
      DEFAULT_SEARCH_OPTIONS,
    ]);
  });
});

describe("mergeAlgoliaWithHNKids", () => {
  it("keeps only top-level algolia comments listed in HN kids and reports missing kids", () => {
    const nested = ac(11, "b", "reply");
    const result = mergeAlgoliaWithHNKids(
      [ac(1, "a", "hi", [nested]), ac(2, "c", "not a kid"), ac(3, null, "x")],
      [1, 3, 4]
    );
    assert.deepEqual(
      result.comments.map((c) => [c.id, c.children.map((k) => k.id)]),
      [[1, [11]]]
    );
    // 3 is present in algolia (but unusable) so it is not re-fetched
    assert.deepEqual(result.missingIds, [4]);
  });

  it("returns nothing when HN has no kids", () => {
    assert.deepEqual(mergeAlgoliaWithHNKids([ac(1, "a", "t")], undefined), {
      comments: [],
      missingIds: [],
    });
  });
});

describe("convertHNItemToComment", () => {
  it("drops deleted/dead/textless items", () => {
    assert.equal(convertHNItemToComment({ id: 1, deleted: true }), null);
    assert.equal(convertHNItemToComment({ id: 1, by: "a" }), null);
    assert.deepEqual(convertHNItemToComment({ id: 1, by: "a", text: "t" }), {
      id: 1,
      by: "a",
      time: 0,
      text: "t",
      children: [],
    });
  });
});

describe("mapHitToHNItem", () => {
  const hit = {
    objectID: "42",
    title: null,
    url: null,
    author: "u",
    points: 3,
    num_comments: null,
    created_at_i: 99,
  };

  it("maps nulls to undefined", () => {
    const item = mapHitToHNItem(hit);
    assert.equal(item?.id, 42);
    assert.equal(item?.title, undefined);
    assert.equal(item?.score, 3);
    assert.equal(item?.type, "story");
  });

  it("drops a hit without a numeric objectID", () => {
    assert.equal(mapHitToHNItem({ ...hit, objectID: "abc" }), null);
  });
});

describe("mapHitToCommentHit", () => {
  const hit = {
    objectID: "7",
    title: null,
    url: null,
    author: "u",
    points: null,
    num_comments: null,
    created_at_i: 5,
    comment_text: "<p>hi</p>",
    story_id: 3,
    story_title: "A story",
    parent_id: 4,
  };

  it("maps a comment hit with its story context", () => {
    const mapped = mapHitToCommentHit(hit);
    assert.equal(mapped?.comment.id, 7);
    assert.equal(mapped?.comment.type, "comment");
    assert.equal(mapped?.comment.text, "<p>hi</p>");
    assert.equal(mapped?.comment.parent, 4);
    assert.equal(mapped?.storyId, 3);
    assert.equal(mapped?.storyTitle, "A story");
  });

  it("drops a hit without a numeric objectID", () => {
    assert.equal(mapHitToCommentHit({ ...hit, objectID: "x" }), null);
  });
});

describe("decodeEntitiesExtended", () => {
  it("decodes typographic names and apos, leaves unknown", () => {
    assert.equal(
      decodeEntitiesExtended("a&apos;b&nbsp;c&mdash;&bogus;"),
      "a'b c—&bogus;"
    );
  });
  it("INTENTIONAL: decodes once, so &#38;amp; stays &amp;", () => {
    assert.equal(decodeEntitiesExtended("&#38;amp;"), "&amp;");
  });
  it("INTENTIONAL: out-of-range numerics stay literal (old code wrapped to garbage)", () => {
    assert.equal(decodeEntitiesExtended("a&#1114112;b"), "a&#1114112;b");
    assert.equal(decodeEntitiesExtended("&#x110000;"), "&#x110000;");
  });
  it("basic decoder leaves them alone", () => {
    assert.equal(decodeEntities("&mdash;"), "&mdash;");
  });
});
