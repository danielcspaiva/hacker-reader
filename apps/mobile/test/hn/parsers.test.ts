import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { HNAuthError } from "@/lib/hn/errors";
import {
  parseCommentFormHmac,
  parseDeleteLink,
  parseFlagLink,
  parseUnvoteLink,
  parseVoteLink,
} from "@/lib/hn/web/parsers";

const fixture = (name: string) =>
  readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf8");

function thrown(fn: () => string): HNAuthError {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof HNAuthError, "expected an HNAuthError");
    return error;
  }
  assert.fail("expected the function to throw");
}

describe("parseVoteLink", () => {
  describe("real logged-out fixtures", () => {
    it("finds the up_ID anchor on an item page and decodes &amp;", () => {
      const html = fixture("item-8863.html");
      assert.equal(
        parseVoteLink(html, 8863),
        "vote?id=8863&how=up&goto=item%3Fid%3D8863"
      );
    });

    it("finds a comment's vote link on the same page", () => {
      const html = fixture("item-8863.html");
      assert.equal(
        parseVoteLink(html, 9224),
        "vote?id=9224&how=up&goto=item%3Fid%3D8863"
      );
    });

    it("finds a vote link on the front page (single-quoted attributes)", () => {
      const html = fixture("front-page.html");
      const id = /<a id='up_(\d+)'/.exec(html)?.[1];
      assert.ok(id);
      const link = parseVoteLink(html, Number(id));
      assert.ok(link.startsWith(`vote?id=${id}&how=up`));
    });

    it("has no comment hmac when logged out, and the 'login' heuristic fires", () => {
      const err = thrown(() => parseCommentFormHmac(fixture("item-8863.html")));
      assert.equal(err.code, "NOT_LOGGED_IN");
      assert.equal(err.message, "Session expired - please log in again");
    });

    it("the login page has neither vote links nor hmac", () => {
      const err = thrown(() => parseVoteLink(fixture("login-page.html"), 1));
      assert.equal(err.code, "NOT_LOGGED_IN");
    });
  });

  describe("synthetic attribute handling (SYNTHETIC, not real HN output)", () => {
    it("handles double-quoted, single-quoted and unquoted attributes", () => {
      assert.equal(
        parseVoteLink(
          `<a id="up_5" href="vote?id=5&amp;how=up&amp;auth=x">`,
          5
        ),
        "vote?id=5&how=up&auth=x"
      );
      assert.equal(
        parseVoteLink(
          `<a id='up_5' href='vote?id=5&amp;how=up&amp;auth=x'>`,
          5
        ),
        "vote?id=5&how=up&auth=x"
      );
      assert.equal(
        parseVoteLink(`<a id=up_5 href=vote?id=5&amp;how=up&amp;auth=x>`, 5),
        "vote?id=5&how=up&auth=x"
      );
    });

    it("matches attribute and tag names case-insensitively", () => {
      assert.equal(
        parseVoteLink(`<A ID="UP_5" HREF="vote?id=5&amp;how=up">`, 5),
        "vote?id=5&how=up"
      );
    });

    it("does not confuse up_12 with up_123", () => {
      const html =
        `<a id="up_123" href="vote?id=123&amp;how=up&amp;auth=b">` +
        `<a id="up_12" href="vote?id=12&amp;how=up&amp;auth=a">`;
      assert.equal(parseVoteLink(html, 12), "vote?id=12&how=up&auth=a");
      assert.equal(parseVoteLink(html, 123), "vote?id=123&how=up&auth=b");
    });

    it("accepts an up_12_x suffixed id (prefix + underscore)", () => {
      const html = `<a id="up_12_x" href="vote?id=12&amp;how=up&amp;auth=s">`;
      assert.equal(parseVoteLink(html, 12), "vote?id=12&how=up&auth=s");
    });

    it("falls back to a raw vote?id=...&how=up path when no anchor id matches", () => {
      const html = `<a class="x" href="vote?id=7&amp;how=up&amp;auth=z">`;
      assert.equal(parseVoteLink(html, 7), "vote?id=7&how=up&auth=z");
    });

    it("fallback accepts for= as well as id=", () => {
      const html = `<a href="vote?for=7&amp;how=up&amp;auth=z">`;
      assert.equal(parseVoteLink(html, 7), "vote?for=7&how=up&auth=z");
    });

    it("fallback ignores how=un links", () => {
      const html = `<a href="vote?id=7&amp;how=un&amp;auth=z">`;
      assert.equal(thrown(() => parseVoteLink(html, 7)).code, "PARSE_ERROR");
    });

    it("fallback compares the whole id (id=123 does not satisfy itemId 12)", () => {
      const html = `<a href="vote?id=123&amp;how=up&amp;auth=z">`;
      assert.equal(thrown(() => parseVoteLink(html, 12)).code, "PARSE_ERROR");
    });

    it("fallback finds how= before id=, single quotes, absolute and slash-led URLs", () => {
      assert.equal(
        parseVoteLink(`<a href='vote?how=up&amp;id=7&amp;auth=z'>`, 7),
        "vote?how=up&id=7&auth=z"
      );
      assert.equal(
        parseVoteLink(
          `<a href="https://news.ycombinator.com/vote?id=7&amp;how=up&amp;auth=z">`,
          7
        ),
        "vote?id=7&how=up&auth=z"
      );
      assert.equal(
        parseVoteLink(`<a href="/vote?id=7&amp;how=up&amp;auth=z">`, 7),
        "vote?id=7&how=up&auth=z"
      );
    });
  });

  describe("error classification when no link is found", () => {
    const cases: [string, string, string, string][] = [
      [
        "login",
        "<p>Please login to vote</p>",
        "NOT_LOGGED_IN",
        "Session expired - please log in again",
      ],
      [
        "karma",
        "<p>You need more karma</p>",
        "INSUFFICIENT_KARMA",
        "Insufficient karma to vote",
      ],
      [
        "slow down",
        "<p>Please slow down</p>",
        "RATE_LIMITED",
        "Rate limited - please wait",
      ],
      [
        "too fast",
        "<p>You are voting too fast</p>",
        "RATE_LIMITED",
        "Rate limited - please wait",
      ],
      [
        "captcha",
        "<p>Solve the captcha</p>",
        "CAPTCHA_REQUIRED",
        "CAPTCHA required - cannot proceed",
      ],
      [
        "verify",
        "<p>Please verify you are human</p>",
        "CAPTCHA_REQUIRED",
        "CAPTCHA required - cannot proceed",
      ],
      [
        "nothing recognisable",
        "<p>hello</p>",
        "PARSE_ERROR",
        "Vote link not found for item 1 - HN HTML may have changed",
      ],
    ];

    for (const [name, html, code, message] of cases) {
      it(`${name} -> ${code}`, () => {
        const err = thrown(() => parseVoteLink(html, 1));
        assert.equal(err.code, code);
        assert.equal(err.message, message);
        assert.equal(err.name, "HNAuthError");
      });
    }

    it("checks login before karma (heuristic order)", () => {
      const err = thrown(() => parseVoteLink("login karma", 1));
      assert.equal(err.code, "NOT_LOGGED_IN");
    });

    it("ignores keywords inside script and style blocks", () => {
      const html = "<script>login</script><style>karma</style>";
      assert.equal(thrown(() => parseVoteLink(html, 1)).code, "PARSE_ERROR");
    });

    it("decodes entities in visible text before checking keywords", () => {
      const err = thrown(() =>
        parseVoteLink("<p>log&nbsp;in</p><p>slow&nbsp;down</p>", 1)
      );
      assert.equal(err.code, "RATE_LIMITED");
    });
  });
});

describe("parseUnvoteLink", () => {
  it("finds the un_ID anchor", () => {
    const html = `<a id="un_9" href="vote?id=9&amp;how=un&amp;auth=t">`;
    assert.equal(parseUnvoteLink(html, 9), "vote?id=9&how=un&auth=t");
  });

  it("the anchor lookup does not confuse un_9 with un_99", () => {
    const html = `<a id="un_99" href="/somewhere-else">`;
    assert.equal(thrown(() => parseUnvoteLink(html, 9)).code, "PARSE_ERROR");
  });

  it("the raw-path fallback compares the whole id (id=99 does not satisfy itemId 9)", () => {
    const html = `<a id="un_99" href="vote?id=99&amp;how=un&amp;auth=b">`;
    assert.equal(thrown(() => parseUnvoteLink(html, 9)).code, "PARSE_ERROR");
  });

  it("falls back to a raw how=un path", () => {
    assert.equal(
      parseUnvoteLink(`<a href="vote?for=9&amp;how=un&amp;auth=t">`, 9),
      "vote?for=9&how=un&auth=t"
    );
  });

  it("throws PARSE_ERROR with no login heuristic, even on a login page", () => {
    const err = thrown(() => parseUnvoteLink("please login", 9));
    assert.equal(err.code, "PARSE_ERROR");
    assert.equal(err.message, "Unvote link not found for item 9");
  });
});

describe("parseCommentFormHmac", () => {
  it("reads name=hmac value (SYNTHETIC)", () => {
    const html = `<form><input type="hidden" name="hmac" value="abc123"></form>`;
    assert.equal(parseCommentFormHmac(html), "abc123");
  });

  it("reads single-quoted and unquoted attributes (SYNTHETIC)", () => {
    assert.equal(parseCommentFormHmac(`<input name='hmac' value='q1'>`), "q1");
    assert.equal(parseCommentFormHmac(`<input name=hmac value=q2>`), "q2");
  });

  it("decodes entities in the value", () => {
    assert.equal(
      parseCommentFormHmac(`<input name="hmac" value="a&amp;b">`),
      "a&b"
    );
  });

  it("throws NOT_LOGGED_IN when missing and the page says login", () => {
    const err = thrown(() => parseCommentFormHmac("<a>login</a>"));
    assert.equal(err.code, "NOT_LOGGED_IN");
  });

  it("throws PARSE_ERROR when missing otherwise", () => {
    const err = thrown(() => parseCommentFormHmac("<p>nothing</p>"));
    assert.equal(err.code, "PARSE_ERROR");
    assert.equal(err.message, "Comment form HMAC not found");
  });

  it("treats an empty hmac value as missing", () => {
    const err = thrown(() =>
      parseCommentFormHmac(`<input name="hmac" value="">`)
    );
    assert.equal(err.code, "PARSE_ERROR");
  });
});

describe("numeric entities in scraped attributes", () => {
  it("INTENTIONAL: numeric entities decode in a vote href (old parser left them literal)", () => {
    assert.equal(
      parseVoteLink(`<a id="up_5" href="vote?id=5&#38;how=up&#x3D;x">`, 5),
      "vote?id=5&how=up=x"
    );
  });
});

describe("parseFlagLink", () => {
  it("finds flag_ID anchor and decodes &amp;", () => {
    assert.equal(
      parseFlagLink(`<a id="flag_4" href="flag?id=4&amp;auth=f">`, 4),
      "flag?id=4&auth=f"
    );
  });

  it("falls back to a raw flag?id=/for= path", () => {
    assert.equal(
      parseFlagLink(`<a href="flag?for=4&amp;auth=f">`, 4),
      "flag?for=4&auth=f"
    );
  });

  it("missing + 'login' text -> NOT_LOGGED_IN", () => {
    assert.equal(
      thrown(() => parseFlagLink("<a>login</a>", 4)).code,
      "NOT_LOGGED_IN"
    );
  });

  it("missing otherwise -> INSUFFICIENT_KARMA (with the full message)", () => {
    const err = thrown(() => parseFlagLink("<p>nothing</p>", 4));
    assert.equal(err.code, "INSUFFICIENT_KARMA");
    assert.equal(
      err.message,
      "Flag link not found - you may need more karma on Hacker News to flag content"
    );
  });
});

describe("parseDeleteLink", () => {
  it("extracts delete-confirm path and decodes &amp; (SYNTHETIC)", () => {
    const html = `<a href="delete-confirm?id=45877116&amp;goto=item%3Fid%3D45853261">delete</a>`;
    assert.equal(
      parseDeleteLink(html, 45877116),
      "delete-confirm?id=45877116&goto=item%3Fid%3D45853261"
    );
  });

  it("missing + 'login' -> NOT_LOGGED_IN", () => {
    assert.equal(
      thrown(() => parseDeleteLink("login", 1)).code,
      "NOT_LOGGED_IN"
    );
  });

  it("missing otherwise -> CANNOT_DELETE with the window-expired message", () => {
    const err = thrown(() => parseDeleteLink("<p>x</p>", 1));
    assert.equal(err.code, "CANNOT_DELETE");
    assert.equal(
      err.message,
      "Delete link not found - this may not be your comment, or the deletion window has expired"
    );
  });

  it("real logged-out item page has no delete link", () => {
    const err = thrown(() => parseDeleteLink(fixture("item-8863.html"), 8863));
    assert.equal(err.code, "NOT_LOGGED_IN");
  });
});

describe("signed-in pages whose comments mention login", () => {
  // The header of a signed-in page links to logout; the comment says "login".
  const signedIn = `<span class="pagetop"><a id="me" href="user?id=appstorereview">appstorereview</a> | <a id='logout' rel='nofollow' href="logout?auth=abc&amp;goto=item%3Fid%3D4">logout</a></span>
<div class="commtext c00">You have to login with SSO first.</div>`;

  it("flag -> INSUFFICIENT_KARMA, not NOT_LOGGED_IN", () => {
    assert.equal(
      thrown(() => parseFlagLink(signedIn, 4)).code,
      "INSUFFICIENT_KARMA"
    );
  });

  it("vote, comment and delete do not report NOT_LOGGED_IN", () => {
    assert.notEqual(
      thrown(() => parseVoteLink(signedIn, 4)).code,
      "NOT_LOGGED_IN"
    );
    // Signed in but no reply form: the item takes no replies, not a scraper break.
    assert.equal(
      thrown(() => parseCommentFormHmac(signedIn)).code,
      "CANNOT_COMMENT"
    );
    assert.notEqual(
      thrown(() => parseDeleteLink(signedIn, 4)).code,
      "NOT_LOGGED_IN"
    );
  });
});
