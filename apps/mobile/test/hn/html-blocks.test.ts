import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getBlocks } from "@/lib/html/blocks";

describe("getBlocks", () => {
  it("splits paragraphs on <p>", () => {
    const blocks = getBlocks("one<p>two");
    assert.deepEqual(blocks, [
      { kind: "paragraph", spans: [{ type: "text", content: "one" }] },
      { kind: "paragraph", spans: [{ type: "text", content: "two" }] },
    ]);
  });

  it("turns a leading > into a quote without the marker", () => {
    const blocks = getBlocks("&gt; quoted<p>reply");
    assert.deepEqual(blocks[0], {
      kind: "quote",
      spans: [{ type: "text", content: "quoted" }],
    });
    assert.equal(blocks[1]?.kind, "paragraph");
  });

  it("linkifies bare urls and keeps anchor urls", () => {
    const blocks = getBlocks(
      `see https://a.dev/x. and <a href="https://b.dev">b</a>`
    );
    const spans = blocks[0]?.kind === "paragraph" ? blocks[0].spans : [];
    assert.deepEqual(
      spans.filter((span) => span.type === "link"),
      [
        { type: "link", content: "https://a.dev/x", url: "https://a.dev/x" },
        { type: "link", content: "b", url: "https://b.dev" },
      ]
    );
  });

  it("makes multi-line code a block and inline code a span", () => {
    const blocks = getBlocks("<pre><code>a\nb\n</code></pre>x <code>y</code>");
    assert.deepEqual(blocks[0], { kind: "code", content: "a\nb" });
    assert.equal(blocks[1]?.kind, "paragraph");
  });

  it("returns the same array for the same html", () => {
    assert.equal(getBlocks("cached"), getBlocks("cached"));
  });
});
