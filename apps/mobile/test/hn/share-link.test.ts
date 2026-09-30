import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extractSharedLink, normalizeUrl } from "@/lib/format/url";

describe("normalizeUrl", () => {
  it("drops scheme, www, fragment and trailing slash", () => {
    assert.equal(
      normalizeUrl("https://www.Example.com/a/b/#section"),
      "example.com/a/b"
    );
    assert.equal(normalizeUrl("http://example.com/"), "example.com");
  });

  it("strips tracking parameters and keeps the rest in order", () => {
    assert.equal(
      normalizeUrl(
        "https://example.com/p?id=3&utm_source=x&UTM_medium=y&fbclid=z&page=2"
      ),
      "example.com/p?id=3&page=2"
    );
  });

  it("makes equivalent links equal", () => {
    assert.equal(
      normalizeUrl("https://example.com/post/?utm_campaign=a"),
      normalizeUrl("http://www.example.com/post")
    );
  });

  it("rejects non-http input", () => {
    assert.equal(normalizeUrl("not a url"), null);
    assert.equal(normalizeUrl("ftp://example.com"), null);
    assert.equal(normalizeUrl("mailto:a@b.c"), null);
  });
});

describe("extractSharedLink", () => {
  it("takes a url payload", () => {
    assert.deepEqual(
      extractSharedLink([{ value: " https://a.com/x ", shareType: "url" }]),
      { url: "https://a.com/x" }
    );
  });

  it("finds the link in shared text and keeps the rest as the title", () => {
    assert.deepEqual(
      extractSharedLink([
        { value: "Great read https://a.com/x", shareType: "text" },
      ]),
      { url: "https://a.com/x", title: "Great read" }
    );
  });

  it("prefers a url payload over text", () => {
    assert.deepEqual(
      extractSharedLink([
        { value: "see https://b.com", shareType: "text" },
        { value: "https://a.com", shareType: "url" },
      ]),
      { url: "https://a.com" }
    );
  });

  it("returns null without a link", () => {
    assert.equal(
      extractSharedLink([{ value: "just words", shareType: "text" }]),
      null
    );
    assert.equal(extractSharedLink([]), null);
  });
});
