# @hn/api

Backend for Hacker Reader Pro: Next.js 15 route handlers (no pages beyond a tiny index), deployed as its own Vercel project. Rule of the product: everything that runs on the phone is free, Pro is what needs a server.

```
pnpm --filter @hn/api dev        # http://localhost:3001
pnpm --filter @hn/api test       # node --test, in-memory store
pnpm --filter @hn/api typecheck
```

## API

All routes are under `/api/v1` and authenticate with `Authorization: Bearer <installId>`, a random UUID v4 the app generates once (there are no accounts). The same id is the RevenueCat app user id.

| Route                              | What it does                                                                                                                                        |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/v1/devices`             | Upsert `{ platform, appVersion, timezone, expoPushToken?, hnUsername?, prefs? }`. `null` clears, omitted keeps.                                     |
| `DELETE /api/v1/devices`           | Forget everything stored for this install id ("Delete Pro Data").                                                                                   |
| `GET /api/v1/me`                   | `{ pro, expiresAt?, features }` from RevenueCat, cached 10 minutes.                                                                                 |
| `POST /api/v1/webhooks/revenuecat` | RevenueCat webhook (own auth header); refreshes the cached entitlement.                                                                             |
| `GET /api/v1/summaries/story/:id`  | Pro. AI summary of a story's article and comments (see below). `200 { status: "ready", summary }` or `202 { status: "generating" }` (retry in ~3s). |
| `GET /api/health`                  | `{ ok: true }`.                                                                                                                                     |

Shared libs for later routes live in `lib/`: `requireInstall` / `requirePro` (`auth.ts`), `sendPush` / `checkPendingReceipts` (`push.ts`), `requireCron` (`cron.ts`), `rateLimit` (`rate-limit.ts`), `Store` (`store.ts`).

## Setup

1. **Vercel project**: import the repo, set the Root Directory to `apps/api`. `vercel.json` installs only this workspace (`--filter @hn/api...`).
2. **Redis**: in the project's Storage tab add Upstash Redis from the Vercel Marketplace and connect it; it injects `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (the `KV_REST_API_*` names also work).
3. **RevenueCat**:
   - Create a project with the iOS app (bundle id `com.danielcspaiva.hnclient`) and connect App Store Connect.
   - Entitlement `pro`, attached to both products.
   - Products (created in App Store Connect, prices are set there, never in code): monthly $2.99, yearly $19.99 with a 7-day free trial introductory offer.
   - Offering `default` (current) with a `monthly` and an `annual` package.
   - API keys: copy the **public iOS SDK key** for the app and a **secret API key** (v1) for `REVENUECAT_SECRET_KEY`.
   - Integrations > Webhooks: URL `https://<your-api-domain>/api/v1/webhooks/revenuecat`, Authorization header value of your choice (for example `Bearer <random string>`) which must equal `REVENUECAT_WEBHOOK_AUTH`. The webhook answers non-200 when a refresh fails so RevenueCat retries.
4. **Env vars** (see `.env.example`): `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `REVENUECAT_SECRET_KEY`, `REVENUECAT_WEBHOOK_AUTH`, `CRON_SECRET` (any long random string; Vercel Cron sends it as `Authorization: Bearer <CRON_SECRET>`), optional `EXPO_ACCESS_TOKEN`, `ANTHROPIC_API_KEY` (AI summaries), optional `SUMMARY_MODEL` and `SUMMARY_DAILY_TOKEN_BUDGET`.
5. **The app** (`apps/mobile/.env.local`): `EXPO_PUBLIC_API_URL=https://<your-api-domain>` and `EXPO_PUBLIC_REVENUECAT_IOS_KEY=<public iOS SDK key>`. Without the key Pro is hidden in the app.

## AI summaries

`GET /api/v1/summaries/story/:id` (Pro, `lib/summaries/`). Order: per-IP limit, `requirePro`, a per-install cap of 60 requests a day (`429 daily_limit`), then the cache, then the model.

- **Input** (`input.ts`, `article-*.ts`): the story and its whole comment tree from Algolia `items/{id}`; for link stories the article HTML (6s timeout, 1.5MB cap, HTML content types only, no private or internal hosts, redirects re-checked) reduced to readable text by a small hand-written extractor (drops script/style/nav/footer/aside/form, prefers `<article>` then `<main>`, capped at 6000 words). Comments are picked breadth-first (every top-level thread before any reply, HN rank order) until about 25k tokens (chars/4), 2000 characters per comment; comment ids are kept. No usernames are sent. All of it is escaped and labelled as untrusted data in the prompt, and the system prompt says never to follow it.
- **Output** (`model.ts`, `output.ts`): structured JSON (`output_config.format`) `{ articleTldr?, discussion: { summary, themes: [{ title, summary, commentIds }], disagreements?: [{ question, sides }] }, generatedAt, commentCountAtGeneration, model }`, validated server-side; `commentIds` that were not in the input are dropped, malformed themes are dropped, and a missing discussion summary is an error (`502 summary_failed`).
- **Cache** (`cache.ts`): Redis `summary:story:<id>` for 7 days. Reused while it is younger than 30 minutes or the story's current `descendants` (HN Firebase, only looked up after 30 minutes) is within +20% of the count at generation; otherwise regenerated. If regeneration fails or the budget is spent, the old summary is still served.
- **Lock**: `summary:lock:<id>` (SET NX, 60s). A request that loses the lock returns the old summary if there is one, else polls for about 12 seconds and then answers `202 generating` so the app retries.
- **Cost guard**: every call adds its tokens to `summary:tokens:<YYYY-MM-DD>:total|in|out` (UTC day, kept 3 days; read them for monitoring). Once the day's total reaches `SUMMARY_DAILY_TOKEN_BUDGET` (default 5,000,000) the route answers `503 summaries_paused` with `Retry-After`.
- **Model**: `SUMMARY_MODEL`, default `claude-sonnet-5-5` ($2 input / $10 output per million tokens) with `effort: low`, one attempt and a 50s timeout (`maxDuration` 60). Rough cost per summary: about 35k input tokens (25k comments, up to about 8k article, prompt) is about $0.07, plus about 2-3k output/thinking tokens is about $0.02-0.03, so **about $0.10 per generated summary**; a typical small thread is a few cents. Cached reads cost nothing. Prompt caching is not used: every story's prompt is different and the shared system prompt is far below the minimum cacheable size. Opus 5.5 ($4/$20) would roughly double the cost for a modest gain on a digest.
- Needs `ANTHROPIC_API_KEY`; without it the route answers `503 summaries_unavailable`.

## Data

Redis keys (also `alerts:*`, see below): `device:<id>`, `devices` (set of ids), `pushtoken:<token>` (reverse index), `entitlement:<id>` (10 minute cache), `push:tickets` / `push:ticket:<id>` (receipts to check), `ratelimit:*` (fixed windows). `DELETE /devices` removes the device, its token index entry and the cached entitlement. Device records and their token index entry expire 45 days after the last upsert (the app registers on every launch/foreground while Pro), so lapsed users disappear by themselves. The `devices` index set does not expire: cron jobs that iterate it call `pruneDeviceIndex(store)` first. `POST /devices` requires Pro; `/me` and `/devices` are also limited to 60 requests/min per IP before any RevenueCat lookup.

## Reply notifications cron

`GET /api/cron/replies` (in `vercel.json` `crons`, every 5 minutes, protected by `requireCron`) pushes "💬 <author> replied: <excerpt>" to Pro devices with `prefs.replies`, an `hnUsername` and a push token.

- Per username (devices sharing one are grouped, tokens deduplicated): reads the user's newest 20 submissions from HN Firebase, collects their direct replies and compares with `replies:<username>` (highest reply id seen, 3 day TTL refreshed each run). The first run for a user only stores the baseline. Replies by the user, deleted and dead ones are skipped. The story id for the `hnclient://story/{id}?commentId={id}` link comes from Algolia `items/{id}`, else a parent walk capped at 10.
- Caps: at most 5 pushes per user and run (the newest 4 plus "and N more replies"); at most 25 reply bodies fetched per user and run.
- Bounded: users are processed in batches of 10 (6 fetches in flight) until 50s are used; the last processed username is kept in `replies:cursor` and the next run continues after it (cleared after the last user). `replies:lock` (120s) stops overlapping runs. A run where Expo rejects every push keeps the mark, so the next run retries.
- Pro check: the cached entitlement (`entitlement:<id>`), falling back to RevenueCat when the 10 minute cache is empty; fails closed.
- Ends with `checkPendingReceipts`, which removes dead push tokens.
- **Vercel plan**: crons that run more often than once a day need a paid (Pro) Vercel plan; on Hobby the deploy is rejected. Fallback: call the same route every 5 minutes from an external scheduler such as Upstash QStash with `Authorization: Bearer <CRON_SECRET>` (remove the `crons` entry then).
- Keys: `replies:<username>`, `replies:cursor`, `replies:lock`. `POST /devices` now merges `prefs` into the stored ones instead of replacing them, so one feature toggling its pref leaves the others alone.

Redis keys: `device:<id>`, `devices` (set of ids), `pushtoken:<token>` (reverse index), `entitlement:<id>` (10 minute cache), `push:tickets` / `push:ticket:<id>` (receipts to check), `ratelimit:*` (fixed windows), `summary:story:<id>`, `summary:lock:<id>`, `summary:tokens:<day>:*`. `DELETE /devices` removes the device, its token index entry and the cached entitlement. Device records and their token index entry expire 45 days after the last upsert (the app registers on every launch/foreground while Pro), so lapsed users disappear by themselves. The `devices` index set does not expire: cron jobs that iterate it call `pruneDeviceIndex(store)` first. `POST /devices` requires Pro; `/me` and `/devices` are also limited to 60 requests/min per IP before any RevenueCat lookup.

## Keyword alerts cron

`GET /api/cron/alerts` (in `vercel.json` `crons`, every 10 minutes, protected by `requireCron`) pushes "🔔 SQLite · 142 points" (body: the story title, `data: { url: "hnclient://story/<id>", kind: "alert" }`) to Pro devices whose `prefs.alerts` match a recent story.

- `prefs.alerts` is a list of `{ id, query, minPoints }` (at most 20; `query` at most 60 characters, a keyword or phrase or `site:example.com`; `minPoints` one of 10, 50, 100, 250, 500). `POST /devices` validates it and replaces the list as a whole (other prefs still merge).
- Candidates are fetched once per run, not per user: Algolia `search_by_date?tags=story&numericFilters=created_at_i>{now-48h},points>=10&hitsPerPage=1000`, following `nbPages` up to 4 pages. A failed first page ends the run with an error; a later failing page keeps what was fetched.
- Matching (`lib/alerts-match.ts`, a copy of the app's `mutes-match.ts` semantics with the same tests): keywords match whole words in the title, case-insensitively, phrases across any whitespace; `site:` matches the domain and its subdomains. A story needs the text match AND `points >= minPoints`; the first matching alert of a device wins.
- Dedupe: `alerts:sent:<installId>` holds the story ids (with creation time) already pushed, pruned after about 50 hours, 3 day TTL refreshed when it changes. A run where Expo rejects every push leaves it alone, so the next run retries.
- Caps: at most 3 pushes per install and run (the 2 highest-scoring plus "N more stories match your alerts", which opens the app). A new alert on an install with no history can match up to 48 hours of stories, so its first run is typically the capped summary.
- Bounded: installs are processed in batches of 20 (6 in flight) until 50s are used; `alerts:cursor` continues after the last install id, `alerts:lock` (120s) stops overlapping runs. Pro check and sub-daily cron caveats are the same as for the replies cron. Ends with `checkPendingReceipts`.
