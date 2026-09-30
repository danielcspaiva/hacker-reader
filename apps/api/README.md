# @hn/api

Backend for Hacker Reader Pro: Next.js 15 route handlers (no pages beyond a tiny index), deployed as its own Vercel project. Rule of the product: everything that runs on the phone is free, Pro is what needs a server.

```
pnpm --filter @hn/api dev        # http://localhost:3001
pnpm --filter @hn/api test       # node --test, in-memory store
pnpm --filter @hn/api typecheck
```

## API

All routes are under `/api/v1` and authenticate with `Authorization: Bearer <installId>`, a random UUID v4 the app generates once (there are no accounts). The same id is the RevenueCat app user id.

| Route                              | What it does                                                                                                    |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `POST /api/v1/devices`             | Upsert `{ platform, appVersion, timezone, expoPushToken?, hnUsername?, prefs? }`. `null` clears, omitted keeps. |
| `DELETE /api/v1/devices`           | Forget everything stored for this install id ("Delete Pro Data").                                               |
| `GET /api/v1/me`                   | `{ pro, expiresAt?, features }` from RevenueCat, cached 10 minutes.                                             |
| `POST /api/v1/webhooks/revenuecat` | RevenueCat webhook (own auth header); refreshes the cached entitlement.                                         |
| `GET /api/health`                  | `{ ok: true }`.                                                                                                 |

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
4. **Env vars** (see `.env.example`): `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `REVENUECAT_SECRET_KEY`, `REVENUECAT_WEBHOOK_AUTH`, `CRON_SECRET` (any long random string; Vercel Cron sends it as `Authorization: Bearer <CRON_SECRET>`), optional `EXPO_ACCESS_TOKEN`.
5. **The app** (`apps/mobile/.env.local`): `EXPO_PUBLIC_API_URL=https://<your-api-domain>` and `EXPO_PUBLIC_REVENUECAT_IOS_KEY=<public iOS SDK key>`. Without the key Pro is hidden in the app.

## Data

Redis keys: `device:<id>`, `devices` (set of ids), `pushtoken:<token>` (reverse index), `entitlement:<id>` (10 minute cache), `push:tickets` / `push:ticket:<id>` (receipts to check), `ratelimit:*` (fixed windows). `DELETE /devices` removes the device, its token index entry and the cached entitlement. Device records and their token index entry expire 45 days after the last upsert (the app registers on every launch/foreground while Pro), so lapsed users disappear by themselves. The `devices` index set does not expire: cron jobs that iterate it call `pruneDeviceIndex(store)` first. `POST /devices` requires Pro; `/me` and `/devices` are also limited to 60 requests/min per IP before any RevenueCat lookup.
