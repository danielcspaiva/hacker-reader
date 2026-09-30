import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseWidgetTap } from "@/lib/widgets/tap";

describe("parseWidgetTap", () => {
  it("parses the story-row URL the widget builds", () => {
    assert.deepEqual(
      parseWidgetTap(
        "hnclient://story/12345?source=widget&widgetKind=HNTopStoriesWidget&widgetSize=medium"
      ),
      { size: "medium", kind: "HNTopStoriesWidget", storyId: 12345 }
    );
  });

  it("reads the category of a Top Stories row", () => {
    assert.deepEqual(
      parseWidgetTap(
        "hnclient://story/9?source=widget&widgetKind=HNTopStoriesWidget&category=ask&widgetSize=large"
      ),
      { size: "large", kind: "HNTopStoriesWidget", category: "ask", storyId: 9 }
    );
  });

  it("parses header and background taps (no story)", () => {
    assert.deepEqual(
      parseWidgetTap(
        "hnclient://feed/best?source=widget&widgetKind=HNTopStoriesWidget&category=best&widgetSize=small"
      ),
      { size: "small", kind: "HNTopStoriesWidget", category: "best" }
    );
    assert.deepEqual(
      parseWidgetTap(
        "hnclient://bookmarks?source=widget&widgetKind=HNBookmarksWidget&widgetSize=medium"
      ),
      { size: "medium", kind: "HNBookmarksWidget" }
    );
  });

  it("drops an unknown kind or category instead of rejecting the tap", () => {
    assert.deepEqual(
      parseWidgetTap(
        "hnclient://story/1?source=widget&widgetKind=Other&category=nope&widgetSize=small"
      ),
      { size: "small", storyId: 1 }
    );
    assert.deepEqual(
      parseWidgetTap("hnclient://feed/nope?source=widget&widgetSize=small"),
      { size: "small" }
    );
  });

  it("accepts every widget size the layout emits", () => {
    for (const size of ["small", "medium", "large", "accessory"]) {
      assert.equal(
        parseWidgetTap(`hnclient://story/1?source=widget&widgetSize=${size}`)
          ?.size,
        size
      );
    }
  });

  it("ignores URLs that are not widget story taps", () => {
    for (const url of [
      "hnclient://",
      "hnclient://story/1",
      "hnclient://story/1?source=share&widgetSize=small",
      "hnclient://story/1?source=widget",
      "hnclient://feed/top",
      "hnclient://bookmarks?source=share&widgetSize=small",
      "hnclient://story/1?source=widget&widgetSize=huge",
      "hnclient://story/abc?source=widget&widgetSize=small",
      "hnclient://user/pg?source=widget&widgetSize=small",
      "https://news.ycombinator.com/item?id=1",
      "",
    ]) {
      assert.equal(parseWidgetTap(url), null, url);
    }
  });

  it("tolerates a malformed escape in an unrelated parameter", () => {
    assert.deepEqual(
      parseWidgetTap(
        "hnclient://story/7?x=%E0%A4%A&source=widget&widgetSize=small"
      ),
      { size: "small", storyId: 7 }
    );
  });
});
