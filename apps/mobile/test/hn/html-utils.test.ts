import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { formatMemberSince, timeAgo, timeAgoSpoken } from "@/lib/format/time";
import { getDomain } from "@/lib/format/url";
import { parseHTMLWithLinks, stripHTML } from "@/lib/html/parse";

afterEach(() => mock.timers.reset());

describe("stripHTML (also pins the private decodeEntities)", () => {
  it("turns <p> into blank lines and drops </p>", () => {
    assert.equal(stripHTML("one<p>two<p>three</p>"), "one\n\ntwo\n\nthree");
  });

  it("unwraps <i>, <b> and <a> keeping inner text", () => {
    assert.equal(
      stripHTML(
        `<i>a</i> <b>b</b> <a href="https://x.dev" rel="nofollow">c</a>`
      ),
      "a b c"
    );
  });

  it("decodes named entities: quot, lt, gt, amp", () => {
    assert.equal(stripHTML("&quot;x&quot; &lt;y&gt; &amp;"), '"x" <y> &');
  });

  it("does NOT decode apos or nbsp", () => {
    assert.equal(stripHTML("a&apos;b&nbsp;c"), "a&apos;b&nbsp;c");
  });

  it("decodes decimal and hex numeric entities", () => {
    assert.equal(stripHTML("&#39;&#x27;&#x2F;&#47;"), "''//");
  });

  it("decodes astral code points (fix: fromCodePoint instead of fromCharCode)", () => {
    assert.equal(stripHTML("&#128512;"), "\u{1F600}");
    assert.equal(stripHTML("&#x1F600;"), "\u{1F600}");
  });

  it("does not double-decode: &amp;lt; becomes &lt;, not <", () => {
    assert.equal(stripHTML("&amp;lt;"), "&lt;");
  });

  it("KNOWN QUIRK: numeric entities are decoded before &amp;, so &amp;#39; double-decodes to &", () => {
    assert.equal(stripHTML("&amp;#39;"), "&#39;");
  });

  it("INTENTIONAL: named entities match case-insensitively", () => {
    assert.equal(stripHTML("&AMP; &QUOT;x&QUOT; &Lt;"), '& "x" <');
  });

  it("INTENTIONAL: numeric-then-named chains decode once (&#38;lt; -> &lt;)", () => {
    assert.equal(stripHTML("&#38;lt;"), "&lt;");
  });

  it("trims the result", () => {
    assert.equal(stripHTML("<p>hi</p>  "), "hi");
  });

  it("leaves other tags (e.g. <pre><code>) untouched", () => {
    assert.equal(
      stripHTML("<pre><code>x</code></pre>"),
      "<pre><code>x</code></pre>"
    );
  });
});

describe("parseHTMLWithLinks", () => {
  it("returns null for empty/undefined input", () => {
    assert.equal(parseHTMLWithLinks(undefined), null);
    assert.equal(parseHTMLWithLinks(""), null);
  });

  it("splits text and links, decoding entities in hrefs and labels", () => {
    const parts = parseHTMLWithLinks(
      `see <a href="https://a.dev/?x=1&amp;y=2" rel="nofollow">a.dev/?x=1&amp;y=2</a> now`
    );
    assert.deepEqual(parts, [
      { type: "text", content: "see " },
      {
        type: "link",
        content: "a.dev/?x=1&y=2",
        url: "https://a.dev/?x=1&y=2",
      },
      { type: "text", content: " now" },
    ]);
  });

  it("accepts single-quoted hrefs", () => {
    const parts = parseHTMLWithLinks(`<a href='https://a.dev'>a</a>`);
    assert.deepEqual(parts, [
      { type: "link", content: "a", url: "https://a.dev" },
    ]);
  });

  it("converts <p> to newlines and strips <i>", () => {
    assert.deepEqual(parseHTMLWithLinks("one<p><i>two</i>"), [
      { type: "text", content: "one\n\ntwo" },
    ]);
  });

  it("extracts <pre><code> blocks and inline <code>; whitespace-only text between is dropped", () => {
    assert.deepEqual(
      parseHTMLWithLinks(
        "run <code>ls</code><p><pre><code>a &lt; b\nc</code></pre>"
      ),
      [
        { type: "text", content: "run " },
        { type: "code", content: "ls" },
        { type: "code", content: "a < b\nc" },
      ]
    );
  });

  it("drops whitespace-only text segments between parts", () => {
    const parts = parseHTMLWithLinks(
      `<a href="https://a.dev">a</a> <a href="https://b.dev">b</a>`
    );
    assert.deepEqual(
      parts?.map((p) => p.type),
      ["link", "link"]
    );
  });

  it("KNOWN QUIRK: link labels containing tags (e.g. <i>) are not matched as links", () => {
    const parts = parseHTMLWithLinks(`<a href="https://a.dev"><b>x</b></a>`);
    assert.ok(parts?.every((p) => p.type === "text"));
  });
});

describe("timeAgo (current behavior)", () => {
  const NOW_MS = 1_700_000_000_000;
  const now = NOW_MS / 1000;

  function at(secondsAgo: number): string {
    mock.timers.reset();
    mock.timers.enable({ apis: ["Date"], now: NOW_MS });
    return timeAgo(now - secondsAgo);
  }

  it("minutes under an hour, no 'ago' suffix", () => {
    assert.equal(at(0), "now");
    assert.equal(at(59), "now");
    assert.equal(at(60), "1m");
    assert.equal(at(3599), "59m");
  });

  it("hours under a day", () => {
    assert.equal(at(3600), "1h");
    assert.equal(at(86399), "23h");
  });

  it("days, weeks, then years", () => {
    assert.equal(at(86400), "1d");
    assert.equal(at(86400 * 6), "6d");
    assert.equal(at(86400 * 7), "1w");
    assert.equal(at(86400 * 364), "52w");
    assert.equal(at(86400 * 400), "1y");
    assert.equal(at(86400 * 365 * 19), "19y");
  });

  it("future timestamps read as now", () => {
    assert.equal(at(-120), "now");
  });
});

describe("timeAgoSpoken", () => {
  const NOW_MS = 1_700_000_000_000;
  const now = NOW_MS / 1000;

  function at(secondsAgo: number): string {
    mock.timers.reset();
    mock.timers.enable({ apis: ["Date"], now: NOW_MS });
    return timeAgoSpoken(now - secondsAgo);
  }

  it("uses the same buckets as timeAgo, spelled out", () => {
    assert.equal(at(30), "just now");
    assert.equal(at(60), "1 minute ago");
    assert.equal(at(3599), "59 minutes ago");
    assert.equal(at(3600), "1 hour ago");
    assert.equal(at(86400 * 2), "2 days ago");
    assert.equal(at(86400 * 7), "1 week ago");
    assert.equal(at(86400 * 365 * 19), "19 years ago");
  });
});

describe("formatMemberSince", () => {
  it("formats as 'Month YYYY' (en-US)", () => {
    const ts = Date.UTC(2020, 5, 15, 12) / 1000;
    assert.equal(formatMemberSince(ts), "June 2020");
  });
});

describe("getDomain", () => {
  it("returns hostname without www.", () => {
    assert.equal(getDomain("https://www.example.com/a?b=1"), "example.com");
    assert.equal(
      getDomain("http://blog.example.co.uk/x"),
      "blog.example.co.uk"
    );
  });

  it("returns null for missing or invalid urls", () => {
    assert.equal(getDomain(undefined), null);
    assert.equal(getDomain(""), null);
    assert.equal(getDomain("not a url"), null);
  });

  it("strips only a leading 'www.'", () => {
    assert.equal(getDomain("https://awww.example.com"), "awww.example.com");
    assert.equal(
      getDomain("https://blog.www.example.com"),
      "blog.www.example.com"
    );
  });

  it("keeps ports out of the domain", () => {
    assert.equal(getDomain("http://localhost:8080/x"), "localhost");
  });
});
