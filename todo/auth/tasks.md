# Auth Feature Implementation Tasks

## Research & Architecture
- [ ] Capture a short technical memo confirming the plan to mirror Hacker News forms (per `plan.md` and Swizec’s article) and list the guardrails: no credential handling in-app, rely on user session cookies, respect rate limits.
- [ ] Audit the existing data layer in `packages/shared` for where authenticated helpers should live (e.g. `lib/api`, existing fetch wrappers, global configuration).
- [ ] Spike on cookie availability per platform: confirm Expo’s `expo-cookie` + `expo-secure-store` combo works on iOS/Android, and document the limitations for `apps/web` (third-party cookie access is blocked unless we proxy).
- [ ] Review Expo Router navigation to decide where the login WebView and post-login success handoff slot in (likely `app/(tabs)/account` or a modal route).
- [ ] Identify any TypeScript config updates needed for `cheerio-without-node-native` (module resolution, types) and note if we should ship our own type definitions under `packages/shared`.

## Shared Auth Session Module (`packages/shared`)
- [ ] Create a new module (e.g. `@hn/shared/auth/session`) exposing:
  - `setHNCookies`, `getHNCookies`, `clearHNCookies`
  - A discriminated `HNAuthState` type for unlocked actions vs anonymous
  - An event emitter or hook-friendly subscription API so apps can react to login/logout
- [ ] Wrap secure persistence:
  - On native: use `expo-secure-store`
  - On web: fall back to IndexedDB/`localStorage` with clear documentation about manual cookie capture if automation is blocked
- [ ] Add a light-weight validator that ensures stored cookies still contain the `user=` value before marking the session as authenticated.

## Shared Write API Client (`packages/shared`)
- [ ] Port Swizec’s `HNApi.js` gist into TypeScript using fetch + cookie header injection (no reliance on browser-managed cookies). Functions: `loginViaForm`, `fetchVoteLink`, `vote`, `fetchCommentForm`, `submitComment`.
- [ ] Replace `cheerio-without-node-native` import with typed wrapper (`import { load } from 'cheerio'`) and ensure our bundlers tree-shake server-only code.
- [ ] Handle error cases surfaced in the article:
  - Parse login response text to detect `Bad Login`
  - Throw when a vote link or comment form is missing (karma gating, already voted, rate-limited)
  - Surface redirect targets from the `goto` param so callers can refresh UI appropriately
- [ ] Add integration tests (Node environment) that load saved HTML fixtures of HN pages to verify we parse `auth` tokens, `hmac`, and hidden inputs correctly.
- [ ] Document fetch contract (required request headers, `Cookie` format) in `api-docs/auth.md` or adjacent docs.

## Mobile App (`apps/mobile`)
- [ ] Add WebView-based login screen:
  - Render the official `https://news.ycombinator.com/login`
  - Detect login success by watching the URL for `news.ycombinator.com/…`
  - On success, use `expo-cookie` to read cookies for the domain and hand them to the shared session module, then close the WebView.
- [ ] Create a `useHNAuth` hook that exposes auth state, login launcher, logout, and ensures secure store hydration on boot.
- [ ] Update UI (tabs, story screen, comment composer) to gate write actions on `authState.status === 'authenticated'`.
- [ ] Introduce vote/comment handlers that call the shared write client, optimistically update UI, and refetch item data via the existing read-only API.
- [ ] Handle “missing capability” states gracefully (e.g. hide downvote if no link on page, show toast when rate-limited).
- [ ] Add smoke-test checklist for QA: login, vote, unvote, favorite, post comment, logout, session restore after relaunch.

## Web App (`apps/web`)
- [ ] Decide on approach for cookies (documented spike outcome):
  1. Launch login in a new window and ask the user to paste the `user=` cookie (manual but simple), or
  2. Implement a Next.js API route acting as a minimal reverse proxy so we can set the cookie server-side.
- [ ] Whichever path we choose, reuse the shared session module for persistence and the shared write client for actions; ensure server-only pieces are tree-shaken in the browser bundle.
- [ ] Update App Router layouts/components to surface login state, hide write buttons for anonymous users, and show helpful messaging if web login is constrained.
- [ ] Add story/comment action handlers that call the shared write client from the client-side bundle while attaching cookies from session state.

## Tooling, Security, and QA
- [ ] Add environment guardrails: ensure we never log cookies, and scrub them from error reports (Sentry, console).
- [ ] Provide developer docs under `todo/auth/README.md` (or similar) covering the full setup, limitations, and manual testing steps (referencing the article + gist for rationale).
- [ ] Wire `pnpm typecheck` and `pnpm lint` into CI for the new code paths; add any missing scripts (e.g. `pnpm shared:test-auth` for HTML-parsing tests).
- [ ] Draft manual regression checklist touching both apps + fallback flows, and note any open questions (e.g. rate limit handling, captcha/bot detection) for future investigation.

## Follow-up / Nice-to-haves
- [ ] Explore caching item page HTML to reduce duplicate requests when batching votes, respecting freshness concerns mentioned in `plan.md`.
- [ ] Investigate auto-refreshing cookies when requests fail (prompt user to re-login).
- [ ] Consider packaging the shared auth client as a standalone library inside `packages/shared` if multiple surfaces consume it (smoother versioning, easier tests).
