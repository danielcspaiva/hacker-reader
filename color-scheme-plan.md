# Color Scheme Simplification & Reliability Plan

## Current Pain Points
- **Scattered lookups**: Many screens recalculate `background`, `text`, or `tint` from `Colors` manually (for example `apps/mobile/app/_layout.tsx:36`, `apps/mobile/app/(tabs)/search/_layout.tsx:22`, `apps/mobile/components/story/story-comment-input.tsx:43`), which invites drift and makes changes risky.
- **Color palette indirection without payoff**: `colorPalette` is hard-coded to `"lights-out"` in the provider (`apps/mobile/contexts/color-scheme-context.tsx:27`), yet `Colors` still nests palettes and `useThemeColor` only types against the `pale` palette (`apps/mobile/hooks/use-theme-color.ts:11`). The runtime works, but the types lie and the extra dimension complicates overrides.
- **Blocking render while preference hydrates**: `ColorSchemeProvider` returns `null` until AsyncStorage finishes (`apps/mobile/contexts/color-scheme-context.tsx:58`), so the entire app flashes blank on cold start or storage failures.
- **Platform bridges duplicated**: We manually pass `colorScheme` into every `Host` from `@expo/ui/swift-ui` (`apps/mobile/components/category-filter.tsx:38`, `apps/mobile/app/(tabs)/settings/index.tsx:44`) and call `UserInterfaceStyle.setStyle` in the provider (`apps/mobile/contexts/color-scheme-context.tsx:51`). There is no single source of truth that handles React Navigation, SwiftUI host views, StatusBar, and GlassView defaults together.
- **Hard-coded fallbacks**: Several components provide literal hex strings (e.g. placeholder gray in `apps/mobile/components/story/story-comment-input.tsx:136`) or string concatenations for alpha adjustments, which bypass the token system and make dark-mode tweaks brittle.

## Goals
- Treat “theme” as a single object that covers React Native components, SwiftUI hosts, and navigation config.
- Remove dead abstractions so typings match runtime behaviour and palette swaps become straightforward if/when we add them.
- Ensure the app renders immediately with a sane default while theme preference hydrates, falling back gracefully if storage is unavailable.
- Reduce the amount of per-screen theme plumbing so new surfaces automatically stay in sync.

## Proposal

### 1. Consolidate theme state & tokens
1. Replace `colorPalette` with an explicit `AppTheme` object: `{ mode, colors, statusBarStyle, navigationTheme, swiftUIColorScheme }`.
2. Flatten `Colors` to `ColorsByMode.light` / `ColorsByMode.dark` (keep palette support via optional extension, but default to a single palette until we need more).
3. Update `useThemeColor` to accept either token keys or overrides and return values straight from the `AppTheme`, eliminating manual `[theme][palette]` lookups and the incorrect `pale` typing.

### 2. Harden the provider
1. Hydrate preferences using an async bootstrap that sets an immediate default (`system`/`light`) and only updates once storage resolves—never short-circuit rendering. Consider optimistically reading synchronously via `expo-secure-store`/`MMKV` if startup flash is still noticeable.
2. Wrap all storage reads/writes in try/catch and surface an error boundary hook (e.g. `useThemeDiagnostics`) so we can log failures without crashing the UI.
3. Keep `UserInterfaceStyle.setStyle` but move platform conditionals into a dedicated `applyNativeAppearance(theme)` helper so native side-effects live alongside StatusBar configuration and future android implementations.

### 3. Centralize platform consumers
1. Create a `ThemeProvider` that composes:
   - React Navigation `<ThemeProvider>` with the derived `navigationTheme`.
   - Expo `<StatusBar>` using `theme.statusBarStyle`.
   - A new `<SwiftUIHostProvider>` that renders children and injects `theme.swiftUIColorScheme` into every SwiftUI `Host` via context, so screens no longer pass `colorScheme` prop manually.
2. Expose a `useAppTheme()` hook returning the derived tokens plus helpers like `theme.surface("glass")`, `theme.border(subtle)`, etc. Components then import tokens instead of repeating `colorScheme === "dark"` checks.
3. For `GlassView` defaults, provide a wrapper (e.g. `<ThemedGlassView>`). It can choose between transparent vs. solid backgrounds based on `isLiquidGlassAvailable()` once, then reuse per-callers.

### 4. Reduce hard-coded literals
1. Move repeated system colors (`#8E8E93`, `"${textColor}40"`) into the theme as semantic tokens (`placeholder`, `disabledTint`), so both light/dark versions live together and alpha logic is centralized.
2. Offer a small utility to compose translucency (`withOpacity(token, 0.25)`) to avoid string concatenation and align RN / SwiftUI transparency handling.

### 5. Prepare for future palettes
1. Keep palette support behind a typed extension: `type Palette = "classic";` today, add `"lights-out"` or user-defined palettes later.
2. Store palette choice alongside scheme (sharing persistence + migrations). Even if we only expose `"classic"`, wiring it now means we won’t touch dozens of files when we introduce more variants.

## Implementation Steps
1. **Bootstrap theme module**: Define `createTheme(mode)` + tokens, add exhaustive tests snapshotting light/dark outputs.
2. **Refactor provider**: Swap `ColorSchemeProvider` to emit the new `AppTheme`, add non-blocking hydration, move native side-effects into `applyNativeAppearance`.
3. **Update hooks/components**: Replace direct `useColorSchemeContext` usage with `useAppTheme` for screens/components. Start with `_layout.tsx`, tab layouts, `StoryCommentInput`, and SwiftUI hosts.
4. **Clean up tokens**: Remove hard-coded literals, migrate `useThemeColor` to the new API, delete now-dead palette types.
5. **Document & verify**: Add README/`api-docs/` entry summarizing theme usage patterns; rerun dark/light smoke tests on iOS simulator, Android emulator, and web.

## Open Questions
- Do we want to persist palette separately from scheme, or wait for a user-facing toggle?
- Should theme persistence live in a shared package (`@hn/shared`) so web can reuse it later?
- Is it worth pulling in `expo-system-ui` or sticking with the custom native module for iOS-only style overrides?
