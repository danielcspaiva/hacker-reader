# Project Environment

Captured 2026-09-15. Inspector JSON is in the last section.

## Project type

- pnpm monorepo (`pnpm@10.15.1`, Node v22.22.3)
- `apps/mobile`: Expo Router 56 / React Native 0.85.3 / New Architecture
- `apps/web`: Next.js (not needed for this session)
- `is_react_native`: true
- iOS native project already generated at `apps/mobile/ios/` (CNG + widgets)
- Bundle id: `com.danielcspaiva.hnclient`
- Scheme / product: HackerReader

## Commands

- Install: `pnpm install` (node_modules present)
- Metro: `pnpm mobile` (filter `@hn/mobile start` → `expo start`), default port 8081
- Run iOS: `pnpm mobile:ios` → `expo run:ios` from `apps/mobile`
- Target a simulator: `pnpm --filter @hn/mobile ios -- --device <UDID>`
- Prebuild: `pnpm mobile:prebuild` / `pnpm mobile:prebuild:clean`
- Typecheck / lint: `pnpm typecheck`, `pnpm lint`

## iOS

- Workspace: `apps/mobile/ios/HackerReader.xcworkspace`
- Pods present
- Env: `apps/mobile/.env.local` (Sentry + PostHog). Sync to Xcode with `pnpm --filter @hn/mobile sync-xcode-env`
- Widgets: `apps/mobile/widgets/` → `ios/HackerReaderWidgets/`
- Xcode 27.0 (27A5194q)

## Session target (this run)

- Simulator: iPhone 17 Pro, iOS 26.5
- UDID: `3E9CEC2A-BBED-4DAA-AC62-160F119C64E4`
- Physical iPhone listed (`kind: device`) — do not use unless asked

## Xcode 27 caveats

- Active toolchain: `/Applications/Xcode-beta.app` (27.0 / 27A5194q)
- `Simulator.app` is gone; DeviceHub lives at `Xcode-beta.app/Contents/Applications/DeviceHub.app`
- `npx expo run:ios` (Expo CLI 56.1.10) fails with `Can't determine id of Simulator app`. Workaround: `xcodebuild` + `simctl install/launch`
- Xcode 27 errors if any pod target is below iOS 15. Podfile `post_install` now bumps those; `Pods.xcodeproj` was patched in this session
- Metro: `cd apps/mobile && npx expo start --port 8081` (do not set `CI=1` — that disables reloads)
- `expo-modules-jsi` 56.0.7 fails to compile on Xcode 27: `JavaScriptRuntime.swift` ternary `set == nil ? nil : setter` is not a C function pointer. Patched in node_modules this session (not durable)
- Build: `xcodebuild -workspace apps/mobile/ios/HackerReader.xcworkspace -scheme HackerReader -configuration Debug -destination 'id=3E9CEC2A-BBED-4DAA-AC62-160F119C64E4' -derivedDataPath /tmp/hn-client-dd CODE_SIGNING_ALLOWED=NO`
- Install: `xcrun simctl install <UDID> /tmp/hn-client-dd/Build/Products/Debug-iphonesimulator/HackerReader.app`
- Launch: argent `launch-app` bundle `com.danielcspaiva.hnclient`, then tap the Metro row in Expo Dev Client
- Simulator keychain: `getValueWithKeyAsync` / `loadSession` fails with "A required entitlement isn't present" (expo-secure-store). Feed still loads.
- iOS 27.0 sim (`27073F4E-98A5-4B56-AD88-4780865D09A2`): unsigned SDK 56 app crashed with `UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`. Added `SceneDelegate.swift` + `UIApplicationSceneManifest`; app now launches.
- Upgraded to Expo SDK 57.0.23 / RN 0.86.3. Scene support via `expo-build-properties` `ios.enableSceneSupport: true` (SDK 58 is still beta). Verified Stories + Profile on iOS 27.
- Branch `chore/expo-sdk-58-upgrade`: Expo SDK 58.0.0-preview.2 / RN 0.88.0-rc.0 / expo-router 58.0.3. Scene lifecycle is default (`SceneDelegate.swift`). `@sentry/react-native` 8.26.0 required (7.x fails: missing `React/RCTTextView.h`). Metro `expo start` needs `scripts/raf-polyfill.cjs` (`requestAnimationFrame` missing in Node SSR). Launch LogBox: `useNavigation` from `Link.Preview` dummy nav (4 visible story cards). Build: `xcodebuild ... -derivedDataPath /tmp/hn-client-sdk58-dd`.

## Inspector JSON (argent-environment-inspector, 2026-09-15T22:24:58Z)

```json
{
  "project_type": "expo",
  "project_type_details": "pnpm monorepo: apps/mobile is Expo SDK 56 + Expo Router + React Native 0.85.3 (dev client, New Architecture, React Compiler, iOS widgets); apps/web is Next.js 15.5 App Router marketing site. Root package hn-client@1.0.0; mobile package @hn/mobile@1.3.0.",
  "is_react_native": true,
  "is_ios": true,
  "is_android": true,
  "is_expo": true,
  "is_web": true,
  "startup_commands": [
    {
      "command": "pnpm mobile",
      "context": "Repo root: Expo Metro for @hn/mobile. Port 8081. expo-dev-client, not Expo Go."
    },
    { "command": "pnpm web", "context": "Next.js marketing site, port 3000." }
  ],
  "build_commands": [
    {
      "command": "pnpm mobile:ios",
      "platform": "ios",
      "context": "expo run:ios. On Xcode 27 this fails (no Simulator.app); use xcodebuild + simctl."
    },
    {
      "command": "pnpm mobile:android",
      "platform": "android",
      "context": "expo run:android"
    }
  ],
  "argent_workflow": {
    "start_dev_server": "pnpm mobile",
    "build_ios": "pnpm mobile:ios",
    "build_android": "pnpm mobile:android",
    "notes": "Expo app root is apps/mobile. Scheme HackerReader, bundle com.danielcspaiva.hnclient. Metro 8081. Argent CLI 0.25.1."
  },
  "metro_port": 8081,
  "key_packages": {
    "expo": "~56.0.3",
    "react-native": "0.85.3",
    "expo-router": "~56.2.5",
    "expo-dev-client": "~56.0.14"
  },
  "terminal_tools": {
    "package_manager": "pnpm",
    "package_manager_version": "10.15.1",
    "node": "22.22.3",
    "pod_version": "1.16.2",
    "expo_cli": "56.1.10",
    "argent_cli": "0.25.1"
  }
}
```
