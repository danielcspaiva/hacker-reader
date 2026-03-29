# Expo SDK 54 → 55 Migration Plan

**Date**: 2026-03-28
**App**: Hacker Reader (Expo React Native HN client)
**Current**: SDK 54.0.13, React 19.1.0, React Native 0.81.4
**Target**: SDK 55, React 19.2, React Native 0.83

## Context

The app works perfectly on SDK 54. A previous upgrade attempt to SDK 55 failed because too many changes were made simultaneously, making it impossible to isolate which change broke things.

**Root cause identified**: `app/(tabs)/index.tsx` containing `<Redirect href="/(tabs)/feed" />` breaks NativeTabs in SDK 55 — routes inside `(tabs)/` without a matching `NativeTabs.Trigger` cause an undefined component in SceneView.

**Strategy**: One change at a time. Test after each. Commit every working state. Document everything.

---

## Phase 0: Tooling & Baseline

### Step 0.1 — Ensure simulator interaction tools work

We need to be able to visually validate the app after each change. Available tools:

**MCP: `ios-simulator-mcp`** (just configured, needs session restart to connect)
- Package: `ios-simulator-mcp@latest` from npm (by joshuayoes)
- Provides MCP tools for simulator interaction (screenshots, UI inspection, etc.)
- Config: `claude mcp add --transport stdio ios-simulator -- npx -y ios-simulator-mcp@latest`

**Skill: `ios-simulator-skill`** (optional, from deepwiki/conorluddy)
- 21 Python scripts for simulator automation
- Install: `git clone https://github.com/conorluddy/ios-simulator-skill.git ~/.claude/skills/ios-simulator-skill`
- Provides: screen_mapper, navigator, gesture, keyboard, app_launcher, visual_diff, etc.
- Prerequisites: macOS 12+, Xcode CLI tools, Python 3.12+

**Fallback: `xcrun simctl` via Bash**
- `xcrun simctl list devices | grep Booted` — check running simulators
- `xcrun simctl io booted screenshot /tmp/screenshot.png` — take screenshot
- `xcrun simctl boot "iPhone 16 Pro"` — boot simulator

**Action items for Step 0.1:**
1. Restart Claude Code session so the `ios-simulator` MCP connects
2. Verify MCP tools are available (list tools, take test screenshot)
3. If MCP doesn't work, install the deepwiki skill as fallback
4. If neither works, use `xcrun simctl` + Read tool for screenshots
5. Verify we can read a simulator screenshot with the Read tool (it supports images)

### Step 0.2 — Create branch
```bash
git checkout -b feat/sdk-55-upgrade
```
- Commit this plan file and the migration folder

### Step 0.3 — Capture SDK 54 baseline
- Ensure app is running on simulator (it already is)
- Take baseline screenshots: feed tab, settings tab, story detail
- Save screenshots in this folder as reference
- Run `npx expo-doctor` from `apps/mobile/` and save output to `baseline-doctor.txt`

---

## Phase 1: Pre-Upgrade Fixes (still on SDK 54)

Fix known SDK 55 breaking issues while still on SDK 54 so we can verify them in isolation.

### Step 1.1 — Remove `app/(tabs)/index.tsx`

**File to DELETE**: `apps/mobile/app/(tabs)/index.tsx`

Current content:
```tsx
import { Redirect } from "expo-router";
export default function Index() {
  return <Redirect href="/(tabs)/feed" />;
}
```

**Why**: This route has no matching `NativeTabs.Trigger` → crashes SceneView in SDK 55. Even on SDK 54 it's unnecessary overhead.

**Routing after deletion**: expo-router defaults to the first alphabetical child route in a group. The tab directories are: `bookmarks`, `feed`, `profile`, `search`, `settings`. Alphabetically, `bookmarks` would become default — but we want `feed`.

**Fix options**:
- Option A: Add `initialRouteName: "feed"` to the tabs `_layout.tsx` export
- Option B: Rename `feed` directory to come first alphabetically (e.g., `(feed)` or `_feed`)
- Option C: The `unstable_settings` with `anchor: "(tabs)"` in root `_layout.tsx` may already handle this

**Recommended**: Check what happens when we just delete the file. If `feed` isn't the default, add `initialRouteName`.

**Test**:
- Rebuild app
- Verify feed tab loads as default
- Take screenshot, compare to baseline

**Commit**: `fix: remove (tabs)/index.tsx redirect for SDK 55 compatibility`

### Step 1.2 — Full app verification on SDK 54
- Test all 5 tabs: feed, bookmarks, profile, settings, search
- Test story detail navigation (tap a story from feed)
- Test back navigation
- Take screenshots to confirm nothing broke
- **Commit** if any additional fixes needed

---

## Phase 2: Clean & Upgrade SDK

### Step 2.1 — Nuclear clean
```bash
# Kill metro if running
# From apps/mobile/
rm -rf node_modules .expo ios

# From monorepo root
rm -rf node_modules
pnpm store prune

# Clear watchman if installed
watchman watch-del-all 2>/dev/null || true
```

### Step 2.2 — Upgrade Expo SDK
```bash
# From apps/mobile/
npx expo install expo@latest
npx expo install --fix
```
Expected changes:
- `expo`: ~54.0.13 → ~55.x.x
- `react`: 19.1.0 → 19.2.x
- `react-native`: 0.81.4 → 0.83.x
- All `expo-*` packages bumped to SDK 55 versions
- `@expo/ui` may bump from 0.2.0-beta.7

### Step 2.3 — Reinstall & prebuild
```bash
# From monorepo root
pnpm install

# From apps/mobile/ — use project's own prebuild script
# This does: rm -rf ios && npx expo prebuild --platform ios && pnpm sync-xcode-env
pnpm prebuild:clean
```

**Important**: Must use `pnpm prebuild:clean` (not raw `npx expo prebuild`) because it runs `sync-xcode-env.js` which copies SENTRY_AUTH_TOKEN and EXPO_PUBLIC_SENTRY_DSN to `ios/.xcode.env.local`.

### Step 2.4 — Diagnostics
```bash
npx expo-doctor
```
- Fix any reported issues before proceeding
- Save output to `post-upgrade-doctor.txt`
- **Commit**: `chore: upgrade Expo SDK 54 → 55`
- Note: app may not build yet if NativeTabs imports changed — that's expected and handled in Phase 3

---

## Phase 3: Fix SDK 55 Breaking Changes

### Step 3.1 — Update NativeTabs imports

**File**: `apps/mobile/app/(tabs)/_layout.tsx`

Current imports:
```tsx
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
```

**Check**: After SDK 55 install, verify if `Icon`/`Label` still export from that path:
```bash
# Quick check — look at the actual exports
node -e "const m = require('expo-router/unstable-native-tabs'); console.log(Object.keys(m))"
```

If `Icon`/`Label` are no longer standalone exports, migrate to compound components:
```tsx
// Before (SDK 54)
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
<NativeTabs.Trigger name="feed">
  <Icon sf="newspaper" />
  <Label>Stories</Label>
</NativeTabs.Trigger>

// After (SDK 55 — if needed)
import { NativeTabs } from "expo-router/unstable-native-tabs";
<NativeTabs.Trigger name="feed">
  <NativeTabs.Trigger.Icon sf="newspaper" />
  <NativeTabs.Trigger.Label>Stories</NativeTabs.Trigger.Label>
</NativeTabs.Trigger>
```

**Test**: Build and run. Verify all 5 tabs show correct icons and labels.
**Commit**: `fix: update NativeTabs imports for SDK 55`

### Step 3.2 — Clean up app.json

**File**: `apps/mobile/app.json`

Changes:
- Remove `"newArchEnabled": true` (always on in SDK 55, field is no-op)
- Check if `"edgeToEdgeEnabled": true` needs removal for Android (expo-doctor will flag it)
- Remove `"experiments.reactCompiler"` if now default in SDK 55

**Test**: Rebuild, verify app loads.
**Commit**: `chore: remove deprecated app.json fields`

### Step 3.3 — Verify @expo/ui compatibility

The app uses from `@expo/ui/swift-ui`:
- Components: `Form`, `Picker`, `Section`, `Button`, `ContextMenu`, `Host`, `Text`
- Modifiers: `foregroundStyle`, `frame`, `glassEffect`

Files using @expo/ui:
- `app/(tabs)/settings/index.tsx`
- `app/(tabs)/profile/index.tsx`
- `app/user/[id].tsx`
- `app/story/[id].tsx`
- `components/submission-type-filter.tsx`
- `components/category-filter.tsx`
- `components/story/comment-item.tsx`

**Known SDK 55 @expo/ui renames** (NOT used in this app):
- `DateTimePicker` → `DatePicker`
- `Switch` → `Toggle`
- `CircularProgress`/`LinearProgress` → `ProgressView`

**Test**: Open settings, profile, story detail (context menu). Verify all SwiftUI components render.
**Commit** if any fixes needed.

### Step 3.4 — Verify Sentry + PostHog compatibility

**File**: `apps/mobile/metro.config.js` uses `@sentry/react-native/metro`

Check:
- Sentry metro wrapper works with new Metro version
- PostHog RN SDK compatible with RN 0.83
- No startup crashes related to these

**Test**: App boots, check console for Sentry/PostHog errors.
Update if needed:
```bash
npx expo install @sentry/react-native posthog-react-native
```

### Step 3.5 — Verify third-party package compatibility

Critical packages to verify:
- `@react-native-cookies/cookies` — auth cookie extraction
- `@shopify/flash-list` — story lists
- `react-native-widget-extension` — iOS widgets
- `react-native-reanimated` + `react-native-worklets` — animations
- `@react-native-async-storage/async-storage` — local storage
- `react-native-webview` — web content display
- `cheerio` — HTML parsing (pure JS, should be fine)

**Test**: Feed loads with FlashList, story cards render, can scroll.
**Commit** if updates needed.

---

## Phase 4: Full Feature Verification

### Step 4.1 — Navigation & tabs
- [ ] All 5 tabs load: feed, bookmarks, profile, settings, search
- [ ] Story detail from feed tap
- [ ] Back navigation works
- [ ] Tab switching is instant (cached data)
- [ ] Deep link: `hnclient://story/{id}` opens story detail

### Step 4.2 — Auth flows
- [ ] Login modal presentation (formSheet/modal depending on iOS version)
- [ ] Guidelines screen loads
- [ ] Login form submits (if HN credentials available)

### Step 4.3 — @expo/ui components
- [ ] Settings: Form, Picker, Section, Button render
- [ ] Profile: Form, Section, Button render
- [ ] Story: ContextMenu on long-press works
- [ ] Category filter: Picker with glassEffect
- [ ] Submission type filter: Picker with glassEffect

### Step 4.4 — Widgets
- [ ] Widget target exists in `ios/` after prebuild
- [ ] `HackerReaderWidgets` target in Xcode project
- [ ] Widget can be added to home screen in simulator

### Step 4.5 — Final cleanup
```bash
npx expo-doctor
pnpm lint
pnpm typecheck
```
- Fix any issues
- **Commit**: `chore: SDK 55 upgrade complete — all features verified`

---

## Critical Files

| File | Action |
|------|--------|
| `apps/mobile/app/(tabs)/index.tsx` | **DELETE** |
| `apps/mobile/app/(tabs)/_layout.tsx` | Update NativeTabs imports |
| `apps/mobile/app/_layout.tsx` | Possibly add initialRouteName for feed |
| `apps/mobile/app.json` | Remove newArchEnabled, other deprecated fields |
| `apps/mobile/package.json` | Version bumps via expo install |
| `apps/mobile/metro.config.js` | Verify Sentry wrapper compatibility |

## Verification Protocol

After **every** step:
1. Check metro bundler logs for errors/warnings
2. Take simulator screenshot with ios-simulator MCP (or xcrun simctl fallback)
3. Visually compare to baseline
4. If broken → investigate immediately, **do not proceed**
5. If working → commit immediately

## Risk Mitigations

- **Every working state gets a commit** — enables `git bisect` if something breaks later
- **Fix known issues before upgrading** — reduces variables during SDK bump
- **Nuclear clean before SDK bump** — eliminates stale cached modules
- **Use project's own scripts** (`pnpm prebuild:clean`) — includes env sync
- **Test one change at a time** — isolates failures instantly
- **Visual baseline comparison** — catches subtle UI regressions

## Rollback Strategy

If the upgrade fails at any point:
```bash
git stash  # save any in-progress work
git checkout main
rm -rf node_modules .expo ios
pnpm install
pnpm --filter @hn/mobile prebuild:clean
```
This restores the working SDK 54 state completely.

## Log

| Step | Status | Notes |
|------|--------|-------|
| 0.1 Tooling | DONE | `xcrun simctl` works for screenshots. `ios-simulator-mcp` configured but needs session restart. MCP was misconfigured as `@anthropic/ios-simulator-mcp` (404) — fixed to `ios-simulator-mcp@latest`. Deepwiki skill available as backup. |
| 0.2 Branch | DONE | Created `feat/sdk-55-upgrade` branch |
| 0.3 Baseline | DONE | Screenshot saved: `baseline-screenshots/sdk54-feed-tab.png`. expo-doctor saved: `baseline-doctor.txt` (4 pre-existing failures: duplicate deps, CNG sync warning, unmaintained cookies pkg, 24 outdated patches). App works fine. |
| 1.1 Delete index.tsx | DONE | Moved redirect from `(tabs)/index.tsx` to root `app/index.tsx`. Added `initialRouteName` to both root and tabs layouts. App launches correctly to feed tab. |
| 1.2 Verify SDK 54 | DONE | Feed tab loads as default, no errors in metro or system logs. App running cleanly. |
| 2.1 Nuclear clean | | |
| 2.2 Upgrade SDK | | |
| 2.3 Reinstall | | |
| 2.4 Diagnostics | | |
| 3.1 NativeTabs | | |
| 3.2 app.json | | |
| 3.3 @expo/ui | | |
| 3.4 Sentry/PostHog | | |
| 3.5 Third-party pkgs | | |
| 4.1 Navigation | | |
| 4.2 Auth | | |
| 4.3 @expo/ui verify | | |
| 4.4 Widgets | | |
| 4.5 Final cleanup | | |

## Session Notes

### Session 1 (2026-03-28)
- Phase 0 completed: tooling verified, branch created, baseline captured
- `ios-simulator` MCP fixed (wrong package name) — needs session restart to connect
- Simulator: iPhone 17 Pro (7ECA3E87) booted, iOS 26.1
- App running on SDK 54.0.13, all working
- **Next**: Restart session for MCP tools, then Phase 1
