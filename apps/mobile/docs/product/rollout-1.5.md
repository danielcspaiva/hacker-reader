# 1.5 / Pro rollout: setup and device-test runbook

This is the order to bring the stacked PRs (stack 1 → 16) up on a real device. Each PR description also has its own checklist; this page is the end-to-end path.

## 0. Merge order

The PRs are stacked, with each one based on the previous. Review and merge them bottom-up (stack 1 into `main`, then retarget stack 2 to `main`, and so on), or test the tip branch `claude/upbeat-bell-hyqfek-16-digest`, which contains everything.

| Stack | PR                                   | Needs native rebuild                          | Needs server |
| ----- | ------------------------------------ | --------------------------------------------- | ------------ |
| 1     | Read state + new comments            |                                               |              |
| 2     | Search filters                       |                                               |              |
| 3     | Best + past front pages              |                                               |              |
| 4     | Mutes                                |                                               |              |
| 5     | Thread nav + text size               |                                               |              |
| 6     | Submit + share extension             | yes (new extension target)                    |              |
| 7     | iPad split view                      |                                               |              |
| 8     | Widget categories + Bookmarks widget | yes (widget target)                           |              |
| 9     | Offline cache                        | yes (`expo-network`)                          |              |
| 10    | Pro foundation                       | yes (`react-native-purchases`, `expo-crypto`) | yes          |
| 11    | Replies inbox + reply push           | yes (`expo-notifications`)                    | yes          |
| 12    | AI summaries                         |                                               | yes          |
| 13    | iCloud sync (free)                   | yes (local module + entitlement)              |              |
| 14    | Alternate icons                      | yes (asset catalog)                           |              |
| 15    | Keyword alerts                       |                                               | yes          |
| 16    | Daily digest                         |                                               | yes          |

Stacks 1–5 and 7 are pure JS: they can be tested in a dev build before any of the native steps.

## 1. Apple developer portal (once)

On App ID `com.danielcspaiva.hnclient`:

- **Push Notifications**: on (stack 11+).
- **iCloud → Key-value storage**: on (stack 13).
- **App Groups**: `group.com.danielcspaiva.hnclient` already exists for the widget. Also register the new share extension App ID `com.danielcspaiva.hnclient.ShareExtension` and add it to the same group (stack 6).
- Regenerate the provisioning profiles, or let Xcode automatic signing do it.

## 2. Regenerate `ios/` (on the Mac)

The sandbox could not do this: Linux prebuild rebuilt `ios/` from scratch and dropped the Xcode 27 fixes.

```sh
pnpm install
cd apps/mobile
npx expo prebuild --platform ios      # NOT --clean
git diff ios/Podfile                  # the post_install Xcode 27 fix must still be there
cd ios && pod install
```

Check that the generated project has:

- A new target `expo-sharing-extension` (bundle id `…ShareExtension`, App Group entitlement).
- `ExpoWidgetsTarget/HNBookmarksWidget.swift` in the widget target. `HNTopStoriesWidget.swift` should carry `AppIntentConfiguration` and `@available(iOS 17.0, *)`, and `index.swift` should wrap it in `if #available(iOS 17.0, *)`.
- `Midnight`, `Ember` and `Mono` `.appiconset`s, plus `ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES`.
- Entitlements: `aps-environment`, `com.apple.developer.ubiquity-kvstore-identifier`, and the App Group.
- The pods `ICloudKV`, `ExpoAlternateAppIcons`, `RNPurchases`, `ExpoNotifications`, `ExpoNetwork`, `ExpoSharing` and `ExpoCrypto`.

Run `pnpm test` afterwards: the widget test compares the committed Swift file with the plugin output.

## 3. Backend (`apps/api`)

1. In Vercel, create a new project with root directory `apps/api`, and add **Upstash Redis** from the marketplace (it sets `UPSTASH_REDIS_REST_URL` / `_TOKEN`).
2. Env vars (see `apps/api/.env.example`):
   - `REVENUECAT_SECRET_KEY`, `REVENUECAT_WEBHOOK_AUTH`
   - `CRON_SECRET`, optional `EXPO_ACCESS_TOKEN`
   - `ANTHROPIC_API_KEY`, optional `SUMMARY_MODEL` and `SUMMARY_DAILY_TOKEN_BUDGET`
3. Crons (`apps/api/vercel.json`): replies every 5 min, alerts every 10, digest build daily, digest send every 15. Sub-daily crons need a paid Vercel plan. Otherwise point Upstash QStash at the same routes with the `CRON_SECRET` bearer.
4. Functions run up to 60s (summaries, crons), which also needs a plan that allows it.
5. Smoke tests:
   - `curl <api>/api/health` should return ok.
   - `curl -H "Authorization: Bearer <random uuid>" <api>/api/v1/me` should return `pro:false`.

## 4. App Store Connect + RevenueCat

1. **App Store Connect:** create an auto-renewable subscription group "Hacker Reader Pro" with monthly $2.99 and yearly $19.99, plus a 7-day free-trial introductory offer on yearly.
2. **RevenueCat:**
   - Create the project and add the App Store app (shared secret / App Store Connect API key).
   - Create entitlement `pro` and attach both products.
   - Create offering `default` with `$rc_monthly` and `$rc_annual`.
   - Add the webhook `<api>/api/v1/webhooks/revenuecat` with Authorization header = `REVENUECAT_WEBHOOK_AUTH`.
3. **App env** (`apps/mobile/.env.local`, then `pnpm --filter @hn/mobile sync-xcode-env`): `EXPO_PUBLIC_REVENUECAT_IOS_KEY` and `EXPO_PUBLIC_API_URL`.
4. **Sandbox tester:** create a sandbox Apple ID for purchase tests.

## 5. Device test pass (physical iPhone; push doesn't work on the simulator)

Work through each PR's checklist in stack order. The highest-risk items, in priority order:

1. **Build:** the widget target compiles at iOS 16.4 with the new `@available` patch (stack 8), and the share extension target builds (stack 6).
2. **Purchases:** a sandbox purchase flips Settings to "Pro, thank you" (stack 10), and `GET /api/v1/me` agrees.
3. **Reply push end to end** (stack 11): enable it, trigger `/api/cron/replies` twice (baseline, then after a real reply), then tap the push from a cold start.
4. **AI summary** on a big thread (stack 12): check real cost against the ~$0.10 estimate in Redis `summary:tokens:*`.
5. **iCloud sync** between two devices (stack 13).
6. **Offline:** airplane-mode launch shows the saved feed (stack 9).
7. **iPad:** split view with two scroll views, large-title behaviour and insets (stack 7).
8. **Submit:** real HN markup (stack 6 fixtures are synthetic). Use a throwaway account.

## 6. Decisions waiting on you

- **Stories widget is iOS 17+** because of the category picker. It disappears on iOS 16.4–16.x (stack 8). The alternative is a second, static widget kind for iOS 16.
- **iCloud sync is free**, not Pro, per the "only server features are paid" rule. Alternate icons are the one cosmetic Pro exception.
- **Pricing**: $2.99 / $19.99, no lifetime plan. It's set in App Store Connect, never in code.
- **Default AI model**: `claude-sonnet-5-5` (quality vs cost, shared cache). Override with `SUMMARY_MODEL`.
