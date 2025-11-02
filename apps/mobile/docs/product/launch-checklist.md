---
title: Launch Checklist
description: Actions tailored to shipping Hacker Reader (Expo) to the App Store.
---

## 1. Lock the Release Candidate

- [ ] Branch and tag the release commit; stop merging non-critical work until App Store approval.
- [ ] Run `pnpm typecheck` and `pnpm lint` from the workspace root to confirm TypeScript + ESLint health.
- [ ] Launch the app with `pnpm mobile` on a physical iPhone (and Android if preparing a simultaneous Play Store launch) using the release commit.
- [ ] Regenerate a clean native project for widgets with `pnpm --filter @hn/mobile prebuild:ios` if native changes landed since the last build.
- [ ] Document the release SHA and Expo SDK version in `AGENTS.md` for future hotfix references.

## 2. QA the Hacker Reader Experience

- [ ] Smoke test every story category (Top, New, Show HN, Ask HN, Jobs) and confirm FlashList infinite scrolling loads additional pages.
- [ ] Verify the story detail screen renders metadata, OG image previews, and nested comment trees without crashes on long threads.
- [ ] Exercise the long-press context menu: upvote/unvote stories, bookmark toggle, and share sheet on both iOS and Android.
- [ ] Confirm Hacker News login modal captures cookies, persists sessions via SecureStore, and that logout fully clears credentials.
- [ ] Post at least one test comment (including a reply) from a reviewer account; ensure optimistic updates settle after refetch and rate-limit messaging appears when triggered.
- [ ] Validate bookmarks survive relaunch (AsyncStorage) and that "Clear Bookmarks" + "Clear Cache" in Settings work with confirmation dialogs.
- [ ] Test appearance controls (System / Light / Dark), glass effect fallbacks on devices without `expo-glass-effect`, and typography in both themes.
- [ ] Run search flows (Algolia) for multiple queries, paging, offline errors, and deep links from search results into story detail.
- [ ] Confirm settings links open the public repo/support destination and update the placeholder `IOS_APP_STORE_URL` / `ANDROID_PLAY_STORE_URL` constants before final build.

## 3. Observability & Analytics

- [ ] Add `sentry-expo` (or `@sentry/react-native` if ejecting) to the app entrypoint and wire the production DSN via Expo config so release builds ship with crash reporting.
- [ ] Trigger a test exception on a development build and confirm the event appears in Sentry with device/OS metadata but without leaking HN cookies or comment text.
- [ ] Instrument core PostHog events (app open, category change, login success, vote/unvote, comment submit, bookmark toggle, widget added) using `posthog-react-native` with batching enabled.
- [ ] Store Sentry DSN and PostHog keys in `app.config.ts` or secure env vars, document rotation steps, and gate them behind feature flags for local dev.
- [ ] Update App Privacy details to reflect analytics collection (device info, interaction events) and add opt-out language in Settings if required by policy.

## 4. Native Integrations & Entitlements

- [ ] Double-check `app.json` → `expo.ios.bundleIdentifier` (`com.danielcspaiva.hnclient`) matches certificates and provisioning profiles in App Store Connect.
- [ ] Ensure the widget extension reads from the `group.com.danielcspaiva.hnclient` app group: confirm shared stories populate on-device after a few refresh cycles.
- [ ] Exercise the iOS widgets (small, medium, large) on a physical device for timeline updates, deep links (`hnclient://story/{id}`), dark mode, and offline fallback.
- [ ] Validate universal/deep links: open `hnclient://story/{id}` and a Safari share flow to make sure Expo Router routes correctly in a production build.
- [ ] Confirm SecureStore entitlements exist in the generated Xcode project and that no additional ATS/permissions dialogs are required beyond network access.

## 5. Release Configuration

- [ ] Bump `expo.version` in `apps/mobile/app.json` and match it with the git tag (e.g., `1.0.1`) and marketing version in App Store Connect.
- [ ] Increment the native build numbers: update `apps/mobile/app.json` (`expo.ios.buildNumber`) if added, plus `widgets/Info.plist` `CFBundleVersion`.
- [ ] Update splash, app icon, and adaptive icon assets (`apps/mobile/assets`) if branding changed; run the simulator to ensure no stale caching.
- [ ] Run `eas build --platform ios --profile production` from `apps/mobile` using the Apple distribution certificate tied to the App Store Connect app.
- [ ] Archive build logs and the resulting `.ipa`/artifact URL in the release notes folder for traceability.

## 6. App Store Connect Metadata

- [ ] App Name: "Hacker Reader"; Subtitle should highlight key value (e.g., "Hacker News with widgets and comments").
- [ ] Keywords: include `Hacker News`, `HN`, `Show HN`, `Ask HN`, `widgets`, `reader`.
- [ ] Description: call out story categories, offline widgets, bookmarking, commenting, Algolia-powered search, and dark mode.
- [ ] Support URL, Marketing URL, and Privacy Policy must point to production destinations (replace GitHub placeholders if new domains exist).
- [ ] Age rating questionnaire: confirm selections reflect user-generated content (frequent/intense mature themes via community comments).
- [ ] App Privacy: declare that no data is collected server-side; note that authentication cookies live on-device only.
- [ ] Export compliance: keep `ITSAppUsesNonExemptEncryption = false` in sync with the App Store questionnaire response.

## 7. Visual Assets & Review Materials

- [ ] Capture updated screenshots (6.7", 6.1", 5.5" iPhone and iPad if releasing there) for: feed, story detail, comments, bookmarks, search, settings, widgets.
- [ ] Produce an optional App Preview video showing login, voting, bookmarking, and widget placement.
- [ ] Provide App Review demo credentials (HN account dedicated to reviewers) plus steps to trigger voting and commenting.
- [ ] Create a changelog snippet for "What’s New" that references the specific release (e.g., performance enhancements, widget polish).
- [ ] Prepare a simple FAQ/support doc for login issues, rate limiting, and comment posting that support can access on launch day.

## 8. Submit for Review

- [ ] Upload the production `.ipa` (or select the latest TestFlight build) in App Store Connect and tie it to the just-updated metadata.
- [ ] Fill in review notes: highlight that login uses the official Hacker News web flow, provide reviewer credentials, and mention that widgets require allowing the app group.
- [ ] Submit any in-app events or promotional assets if scheduling alongside launch.
- [ ] Set manual release so you can coordinate public comms once approval arrives.

## 9. Pre-Launch Monitoring

- [ ] Check review status twice daily; respond within 24 hours to any metadata or demo account questions.
- [ ] If a rejection lands, capture the reason, prioritize the fix, and fast-follow with a new build; log action items in `todo/`.
- [ ] Draft the public announcement (blog/newsletter/social) while waiting so it’s ready once Apple approves.

## 10. Launch Day

- [ ] Release the build in App Store Connect manually when marketing + support are on standby.
- [ ] Install from the live App Store listing; verify version/build numbers, login persistence, bookmarks, and widget timeline behavior.
- [ ] Monitor Apple’s analytics (installs, crashes) and on-device logs for the first 24 hours; capture any anomalies in `todo/`.
- [ ] Publish the public announcement with the App Store link and share internally.
- [ ] Tag the release in git (`git tag v1.0.x`) and upload release notes/screenshots to the repo.

## 11. Post-Launch Follow-Up

- [ ] Gather App Store reviews/support tickets, summarize themes, and plan the first maintenance patch.
- [ ] Review widget engagement (install rate, refresh reliability) via internal telemetry or user feedback.
- [ ] Update documentation (`features.md`, `monetization.md`, roadmap) to reflect the shipped state.
- [ ] Conduct a retrospective focusing on Expo Router + widget integration pain points and feed learnings into the next release plan.
