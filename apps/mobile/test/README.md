# HN layer tests

Characterization tests for the Hacker News layer (`lib/hn/**` and `lib/format`, `lib/html`). Zero extra dependencies.

    pnpm --filter @hn/mobile test     # or: cd apps/mobile && pnpm test

Runs `node --test` with `--experimental-transform-types` (needed for TypeScript
parameter properties) and `register.mjs`, a small resolve hook that lets Node load the
app's extensionless relative imports and the `@/` alias. Tested modules must not import React
Native / Expo.

## Fixtures (`fixtures/`)

Fetched read-only, logged out, from public pages on 2026-09-29 with `curl`:

- `front-page.html` https://news.ycombinator.com/
- `item-8863.html` https://news.ycombinator.com/item?id=8863
- `login-page.html` https://news.ycombinator.com/login

They only pin the logged-out path (vote links present, no `hmac`, "login" text).
Snippets defined inline in tests and labelled SYNTHETIC are hand-written from the
parsers' selectors. They are NOT evidence of what HN serves to a logged-in user for
vote/unvote/flag/delete/comment.

## Intentional behavior changes vs the pre-refactor code

All share one single-pass decoder (`lib/html/entities.ts`); each is pinned
by a test labelled `INTENTIONAL`:

- Numeric entities (decimal/hex, incl. astral) now decode in parser attribute values
  (vote/unvote/flag/delete links, hmac, goto). Real HN only emits `&amp;` there.
- `stripHTML`/`parseHTMLWithLinks`: named entities match case-insensitively
  (`&AMP;`), and `&#38;lt;` decodes once to `&lt;` (was `<`).
- OG metadata: one pass with `fromCodePoint`, so `&#38;amp;` stays `&amp;` and
  numerics above 0x10FFFF stay literal (old code wrapped them to garbage).
- `SecureSession` display token, `toString` and `toJSON` are the constant
  `SecureSession(redacted)`; corrupt stored cookie JSON means logged out.
- `comment()`'s error detection (`checkForCommentErrors`) reads only HN's error
  markup: a bare page with no table/form/textarea, or the orange `<font>` message
  on the re-rendered comment form. The words "blank", "slow down", "can't
  comment" or "unknown or expired link" elsewhere on a normal page (a comment,
  `target="_blank"`) are no longer errors.
- Local stores (`lib/hn/local/*`) throw on a failed read instead of treating it
  as `[]`, so a write can no longer wipe a list it failed to read (pinned in
  `json-list-store.test.ts`).
- Removed: `favorite`/`unfavorite` and their parsers (no importers), and the
  `getTopStories`/`getNewStories`/... wrappers (use `getCategoryStoryIds`).

## Not covered

`lib/hn/local/*` (except `json-list-store.ts`, which takes its storage as a
parameter) import AsyncStorage and `@/lib/observability`, so they cannot load in
node; the hooks and `hooks/present-hn-write-error.ts` import React Native too.
The pure logic they call is tested instead (`json-list-store`,
`describeHNWriteError`, `requireSession`, `parseWidgetTap`).
