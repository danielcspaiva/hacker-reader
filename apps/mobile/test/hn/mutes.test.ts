import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createMuteFilter,
  normalizeMuteValue,
  type Mute,
} from "@/lib/hn/mutes-match";

const keyword = (value: string): Mute => ({
  kind: "keyword",
  value,
  createdAt: 0,
});
const domain = (value: string): Mute => ({
  kind: "domain",
  value,
  createdAt: 0,
});
const title = (t: string) => ({ title: t });

describe("normalizeMuteValue", () => {
  it("lowercases and collapses whitespace in keywords", () => {
    assert.equal(normalizeMuteValue("keyword", "  Open   AI "), "open ai");
  });
  it("rejects empty input", () => {
    assert.equal(normalizeMuteValue("keyword", "   "), null);
    assert.equal(normalizeMuteValue("domain", ""), null);
  });
  it("reduces domains to the bare host", () => {
    for (const input of [
      "Medium.com",
      "https://www.medium.com/some/path?x=1",
      "www.medium.com/",
      "http://medium.com:8080",
      "medium.com.",
    ]) {
      assert.equal(normalizeMuteValue("domain", input), "medium.com", input);
    }
  });
  it("keeps subdomains other than www", () => {
    assert.equal(
      normalizeMuteValue("domain", "https://foo.medium.com/a"),
      "foo.medium.com"
    );
  });
  it("rejects things that are not hosts", () => {
    assert.equal(normalizeMuteValue("domain", "not a site"), null);
    assert.equal(normalizeMuteValue("domain", "a_b!c"), null);
  });
});

describe("createMuteFilter keywords", () => {
  it("matches case-insensitively on word boundaries", () => {
    const muted = createMuteFilter([keyword("ai")]);
    assert.equal(muted(title("AI agents are here")), true);
    assert.equal(muted(title("Show HN: my ai tool")), true);
    assert.equal(muted(title("He said no")), false);
    assert.equal(muted(title("Maintain your repo")), false);
  });
  it("treats punctuation as a boundary", () => {
    const muted = createMuteFilter([keyword("ai")]);
    assert.equal(muted(title("Is AI, really?")), true);
    assert.equal(muted(title("(AI) winter")), true);
    assert.equal(muted(title("AI-powered toaster")), true);
  });
  it("does not treat underscores or digits as boundaries", () => {
    const muted = createMuteFilter([keyword("ai")]);
    assert.equal(muted(title("ai_tools")), false);
    assert.equal(muted(title("ai2 released")), false);
  });
  it("matches multi-word phrases across whitespace runs", () => {
    const muted = createMuteFilter([keyword("open ai")]);
    assert.equal(muted(title("Open AI raises money")), true);
    assert.equal(muted(title("Open   AI raises money")), true);
    assert.equal(muted(title("Open source AI")), false);
    assert.equal(muted(title("Reopen AI")), false);
  });
  it("escapes regex metacharacters", () => {
    const muted = createMuteFilter([
      keyword("c++"),
      keyword("(beta)"),
      keyword("a.b"),
    ]);
    assert.equal(muted(title("Learning C++ in 2026")), true);
    assert.equal(muted(title("Learning C in 2026")), false);
    assert.equal(muted(title("App (beta) out")), true);
    assert.equal(muted(title("axb")), false);
    assert.equal(muted(title("a.b test")), true);
  });
  it("matches any of several keywords", () => {
    const muted = createMuteFilter([keyword("crypto"), keyword("nft")]);
    assert.equal(muted(title("NFT mania")), true);
    assert.equal(muted(title("Crypto winter")), true);
    assert.equal(muted(title("Rust 2.0")), false);
  });
  it("handles non-ASCII letters as word characters", () => {
    const muted = createMuteFilter([keyword("cafe")]);
    assert.equal(muted(title("Café culture")), false);
    const accented = createMuteFilter([keyword("café")]);
    assert.equal(accented(title("Café culture")), true);
    assert.equal(accented(title("Cafés")), false);
  });
  it("ignores stories without a title", () => {
    assert.equal(
      createMuteFilter([keyword("ai")])({ url: "https://ai.com" }),
      false
    );
  });
  it("does not match keywords against the URL", () => {
    const muted = createMuteFilter([keyword("medium")]);
    assert.equal(muted({ title: "Hello", url: "https://medium.com/x" }), false);
  });
});

describe("createMuteFilter domains", () => {
  const story = (url?: string) => ({ title: "t", url });
  it("matches the exact domain, ignoring www", () => {
    const muted = createMuteFilter([domain("medium.com")]);
    assert.equal(muted(story("https://medium.com/a")), true);
    assert.equal(muted(story("https://www.medium.com/a")), true);
  });
  it("matches subdomains", () => {
    const muted = createMuteFilter([domain("medium.com")]);
    assert.equal(muted(story("https://foo.medium.com/a")), true);
    assert.equal(muted(story("https://a.b.medium.com/a")), true);
  });
  it("does not match look-alikes or parents", () => {
    const muted = createMuteFilter([domain("medium.com")]);
    assert.equal(muted(story("https://notmedium.com/a")), false);
    assert.equal(muted(story("https://medium.com.evil.io/a")), false);
    assert.equal(muted(story("https://medium.org/a")), false);
    const sub = createMuteFilter([domain("foo.medium.com")]);
    assert.equal(sub(story("https://medium.com/a")), false);
    assert.equal(sub(story("https://bar.medium.com/a")), false);
  });
  it("skips stories without a usable url", () => {
    const muted = createMuteFilter([domain("medium.com")]);
    assert.equal(muted(story(undefined)), false);
    assert.equal(muted(story("not a url")), false);
  });
});

describe("createMuteFilter mixed", () => {
  it("combines keywords and domains", () => {
    const muted = createMuteFilter([keyword("ai"), domain("medium.com")]);
    assert.equal(muted({ title: "AI", url: "https://x.com" }), true);
    assert.equal(muted({ title: "Rust", url: "https://foo.medium.com" }), true);
    assert.equal(muted({ title: "Rust", url: "https://x.com" }), false);
  });
  it("mutes nothing for an empty list", () => {
    assert.equal(
      createMuteFilter([])({ title: "AI", url: "https://medium.com" }),
      false
    );
  });
});
