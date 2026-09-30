import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { capWords, extractArticleText } from "../lib/summaries/article-extract";
import {
  fetchArticleHtml,
  isSafeArticleUrl,
} from "../lib/summaries/article-fetch";
import { fakeFetch } from "./helpers";

const html = (name: string) =>
  readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

describe("extractArticleText", () => {
  const article = extractArticleText(html("article-page.html"));

  it("prefers the longest <article> and drops chrome", () => {
    assert.ok(article);
    assert.match(article.text, /^Why static sites win/);
    assert.match(article.text, /Section 5 adds detail/);
    for (const noise of [
      "NOT CONTENT",
      "About us navigation",
      "newsletter sidebar",
      "Copyright footer",
      "Sign up",
      "should vanish",
      "tiny teaser",
      "color:red",
    ]) {
      assert.equal(article.text.includes(noise), false, noise);
    }
  });

  it("decodes entities and collapses whitespace", () => {
    assert.ok(article);
    assert.match(article.text, /Fish & chips — caf\u00e9 "quoted" 'text'\./);
    assert.equal(/ {2,}|\n{3,}/.test(article.text), false);
  });

  it("falls back to <main> when there is no article", () => {
    const page = extractArticleText(html("main-page.html"));
    assert.ok(page);
    assert.match(page.text, /Release notes/);
    assert.equal(page.text.includes("Top banner"), false);
    assert.equal(page.text.includes("Outside main"), false);
  });

  it("returns null for pages with no readable text", () => {
    assert.equal(extractArticleText(html("thin-page.html")), null);
    assert.equal(extractArticleText(""), null);
  });

  it("caps the word count", () => {
    const words = Array.from({ length: 800 }, (_, i) => `w${i}`).join(" ");
    const capped = extractArticleText(
      `<article><p>${words}</p></article>`,
      300
    );
    assert.ok(capped?.truncated);
    assert.equal(capped.text.split(/\s+/).length, 300);
    assert.deepEqual(capWords("a b\n\nc d e", 4), {
      text: "a b\n\nc d…",
      truncated: true,
    });
  });

  it("copes with unclosed and adversarial markup in linear time", () => {
    const started = Date.now();
    const nasty = "<nav>".repeat(100_000) + "<a".repeat(100_000);
    assert.equal(extractArticleText(nasty), null);
    assert.ok(Date.now() - started < 1000);
  });
});

describe("isSafeArticleUrl", () => {
  it("allows public http(s) hosts", () => {
    assert.ok(isSafeArticleUrl("https://blog.example.com/post?a=1"));
    assert.ok(isSafeArticleUrl("http://example.org:80/x"));
  });

  it("blocks private, loopback and internal targets", () => {
    for (const url of [
      "ftp://example.com/x",
      "http://localhost/x",
      "http://intranet/x",
      "http://printer.local/x",
      "http://127.0.0.1/x",
      "http://10.1.2.3/x",
      "http://172.20.0.1/x",
      "http://192.168.1.1/x",
      "http://169.254.169.254/latest/meta-data",
      "http://[::1]/x",
      "http://2130706433/x",
      "https://example.com:8443/x",
      "https://user:pw@example.com/x",
      "not a url",
    ]) {
      assert.equal(isSafeArticleUrl(url), null, url);
    }
  });
});

describe("fetchArticleHtml", () => {
  const htmlResponse = (body: string, type = "text/html; charset=utf-8") =>
    new Response(body, { headers: { "content-type": type } });

  it("returns the HTML of an HTML response", async () => {
    const fetched = await fetchArticleHtml("https://a.example.com/x", {
      fetch: fakeFetch(() => htmlResponse("<p>hi</p>")),
    });
    assert.equal(fetched, "<p>hi</p>");
  });

  it("ignores non-HTML content types and error statuses", async () => {
    for (const response of [
      () => htmlResponse("%PDF", "application/pdf"),
      () => new Response("nope", { status: 404 }),
    ]) {
      assert.equal(
        await fetchArticleHtml("https://a.example.com/x", {
          fetch: fakeFetch(response),
        }),
        null
      );
    }
  });

  it("cuts the body at the size cap", async () => {
    const fetched = await fetchArticleHtml("https://a.example.com/x", {
      maxBytes: 1000,
      fetch: fakeFetch(() => htmlResponse("a".repeat(50_000))),
    });
    assert.equal(fetched?.length, 1000);
  });

  it("follows safe redirects and refuses unsafe ones", async () => {
    const seen: string[] = [];
    const redirecting = (target: string) =>
      fakeFetch((url) => {
        seen.push(url);
        return url.includes("/start")
          ? new Response(null, { status: 302, headers: { location: target } })
          : htmlResponse("final");
      });

    assert.equal(
      await fetchArticleHtml("https://a.example.com/start", {
        fetch: redirecting("/final"),
      }),
      "final"
    );
    assert.deepEqual(seen, [
      "https://a.example.com/start",
      "https://a.example.com/final",
    ]);

    seen.length = 0;
    assert.equal(
      await fetchArticleHtml("https://a.example.com/start", {
        fetch: redirecting("http://169.254.169.254/"),
      }),
      null
    );
    assert.equal(seen.length, 1);
  });

  it("gives up on a slow server and never throws", async () => {
    const slow = fakeFetch(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new Error("aborted"))
          );
        })
    );
    // AbortSignal.timeout timers are unref'd; keep the loop alive for the test.
    const keepAlive = setTimeout(() => {}, 2000);
    assert.equal(
      await fetchArticleHtml("https://a.example.com/x", {
        fetch: slow,
        timeoutMs: 20,
      }),
      null
    );
    clearTimeout(keepAlive);
    assert.equal(
      await fetchArticleHtml("https://a.example.com/x", {
        fetch: fakeFetch(() => {
          throw new Error("boom");
        }),
      }),
      null
    );
  });
});
