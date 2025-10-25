# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React Native Hacker News client built with Expo and file-based routing (expo-router). The app displays stories from Hacker News across five categories (Top, New, Ask, Show, Jobs) with infinite scrolling, link previews, and a comment system.

## Package Manager

This project uses **pnpm** as its package manager (specified in `package.json`). Always use `pnpm` commands instead of `npm` or `yarn`.

## Common Commands

### Development
- `pnpm start` - Start the Expo development server
- `pnpm ios` - Start on iOS simulator
- `pnpm android` - Start on Android emulator
- `pnpm web` - Start web version

### Code Quality
- `pnpm lint` - Run ESLint for code linting

### Reset
- `pnpm reset-project` - Reset project to blank state (moves starter code to app-example)

## Architecture

### Authentication (Mobile Only)

The mobile app supports HN authentication via WebView login:

1. **Login Flow**:
   - Users log in through official HN website in WebView (no credential handling in app)
   - Cookies extracted using `@react-native-cookies/cookies` + JavaScript injection fallback
   - Cookies stored securely in `expo-secure-store` (device keychain/keystore)

2. **Auth Module** (`packages/shared/src/auth/`):
   - **SecureSession** - Wrapper preventing accidental cookie exposure
   - **Error Taxonomy** - Typed errors (NOT_LOGGED_IN, RATE_LIMITED, etc.)
   - **Rate Limiter** - Client-side throttling (30 actions/min)
   - **HTML Parsers** - Extract auth tokens from HN pages using cheerio

3. **Write API** (`packages/shared/src/api/hn-write-api.ts`):
   - `vote(itemId, session)` - Upvote stories/comments
   - `unvote(itemId, session)` - Remove upvote
   - `comment(parentId, text, session)` - Post comments
   - `favorite(itemId, session)` - Favorite items
   - All operations require `SecureSession` with HN cookies
   - HTTPS enforced, automatic rate limiting, smart error handling

4. **Auth Context** (`apps/mobile/contexts/hn-auth-context.tsx`):
   - Global auth state via React Context
   - Session persistence across app restarts
   - `useHNAuth()` hook provides: `session`, `login()`, `logout()`, `isAuthenticated`

5. **UI Integration**:
   - Login modal: `components/auth/login-modal.tsx` - WebView with cookie extraction
   - Settings screen: Shows login status, login/logout buttons
   - Story cards: Upvote/unvote in context menu (when authenticated)
   - Optimistic updates with automatic rollback on error

6. **Security**:
   - Never log cookies (SecureSession prevents exposure)
   - Session expiration auto-detected → logout + re-login prompt
   - Rate limiting warnings shown to users
   - All requests use HTTPS only

**Note**: Web app remains read-only (no authentication). Comment posting API is ready but UI not yet implemented.

### Routing & Navigation
- **File-based routing** using Expo Router (expo-router v6)
- Routes are defined in the `app/` directory structure
- Tab navigation via `app/(tabs)/` using `expo-router/unstable-native-tabs`
- Dynamic routes: `app/story/[id].tsx` for story detail pages
- Main anchor point: `(tabs)` as defined in `app/_layout.tsx`

### Data Fetching Strategy
The app uses a **React Query + HN API** architecture:

1. **API Layer** (`lib/hn-api.ts`):
   - Base URL: `https://hacker-news.firebaseio.com/v0`
   - Exports typed functions for HN endpoints (getTopStories, getNewStories, getItem, etc.)
   - All functions return Promises with typed HNItem/HNUser interfaces

2. **React Query Hooks** (`hooks/use-stories.ts`, `hooks/use-story.ts`):
   - `useStories(category)` - Single hook accepting category parameter ('top' | 'new' | 'ask' | 'show' | 'jobs')
     - Uses `useInfiniteQuery` with dynamic query key `['stories', category]`
     - Maps category to appropriate API fetcher (getTopStories, getNewStories, etc.)
     - Only one query active at a time - switching categories reuses cached data instantly
   - `useStory(id)`, `useComment(id)` - Use `useQuery` for individual items
   - Global QueryClient configured in `app/_layout.tsx` with:
     - 5 minute staleTime
     - 10 minute gcTime
     - 2 retries
     - refetchOnWindowFocus disabled

3. **Infinite Scrolling Pattern**:
   - `useStories(category)` uses `useInfiniteQuery` with `pageParam` tracking offset
   - Page size: 30 items
   - `getNextPageParam` returns next offset or undefined when done
   - Stories are flattened from pages in components: `data?.pages.flatMap(page => page)`
   - Automatic caching by React Query - switching between categories is instant after first load

### UI Components

#### Performance-Critical Components
- **FlashList** from `@shopify/flash-list` is used instead of FlatList for story lists
  - Significantly better performance for long lists
  - Used in all tab screens (`app/(tabs)/*/index.tsx`)
  - Requires `estimatedItemSize` or proper height handling

#### Component Organization
- `components/` - Reusable UI components
  - `story-card.tsx` - Individual story item with metadata and link preview
  - `link-preview.tsx` - OG image preview (compact mode for cards, full mode for story detail)
  - `themed-*.tsx` - Theme-aware components (ThemedView, ThemedText)
  - `ui/` - Low-level UI primitives

#### Link Previews
- Fetches Open Graph metadata via `hooks/use-og-metadata.ts` and `lib/og-api.ts`
- Two modes: `compact` (80x80 thumbnail in StoryCard) and full (story detail page)
- Uses `expo-image` for optimized image loading

### Theme System
- Auto theme switching based on system preference
- `hooks/use-color-scheme.ts` - Platform-specific color scheme detection
- `hooks/use-theme-color.ts` - Theme-aware color values
- `constants/theme.ts` - Theme configuration
- React Navigation themes (DarkTheme/DefaultTheme) applied in root layout

### Comments System
The comment tree is recursively rendered in `app/story/[id].tsx`:
- Each `Comment` component fetches its own data via `useComment(id)`
- Collapsible comment threads with reply count
- HTML parsing with clickable links using custom `parseHTMLWithLinks` function
- Opens links via `expo-web-browser`

## Key Technical Details

### TypeScript Configuration
- React 19.1.0 with TypeScript ~5.9.2
- File-based routing types auto-generated in `.expo/types/router.d.ts`
- `expo-env.d.ts` provides Expo-specific types

### Platform Handling
- Native tabs use SF Symbols for icons (`Icon sf="flame.fill"`)
- Safe area insets handled via `react-native-safe-area-context`
- Platform-specific padding for Android tab bar: `100 + bottom` in contentContainerStyle

### State Management
- No global state management library (Redux, Zustand, etc.)
- React Query handles all server state
- Local UI state uses React hooks (useState)
- **React Compiler enabled** - automatic memoization, no manual `useMemo`, `useCallback`, or `React.memo` needed

### HTML Handling
Comments and story text contain HTML that needs parsing:
- Custom `parseHTMLWithLinks` function in story detail screen
- Decodes HTML entities (&#x2F;, &quot;, etc.)
- Converts `<p>` tags to newlines
- Extracts `<a>` tags for clickable links
- Renders as native Text components with onPress handlers

## File Structure Patterns

```
app/
  (tabs)/           # Tab-based routes
    [category]/     # Each category (top, new, ask, show, jobs)
      index.tsx     # List screen with FlashList
      _layout.tsx   # Stack layout config
  story/
    [id].tsx        # Story detail with comments
  _layout.tsx       # Root layout with QueryClientProvider
lib/                # API clients
hooks/              # React Query hooks and custom hooks
components/         # Reusable components
constants/          # Theme and other constants
```

## Important Implementation Notes

1. **Infinite Query Data Structure**: The `useStories(category)` hook returns paginated data. Always flatten with `data?.pages.flatMap(page => page)` before rendering.

2. **HN API Behavior**: The API returns story IDs first, then requires individual item fetches. The `getItems()` helper parallelizes these fetches.

3. **Comment Loading**: Comments are lazy-loaded individually. Deleted/dead comments are filtered out by returning null in the component.

4. **Time Display**: Custom `timeAgo` function formats timestamps (e.g., "2h ago", "3d ago") - implemented separately in StoryCard and story detail screen.

5. **URL Extraction**: Domain extraction for story cards uses URL parsing with `www.` stripping.

6. **Platform Differences**: Android requires extra bottom padding (100 + safe area) due to tab bar rendering differences.

7. **Theme Colors**: Always use `useThemeColor` hook instead of hardcoded colors to support dark mode.

## Expo Configuration

- New Architecture enabled (`newArchEnabled: true`)
- Typed routes experimental feature enabled (`experiments.typedRoutes: true`)
- **React Compiler enabled** (`experiments.reactCompiler: true`)
  - SDK 54+ auto-configures Babel plugin
  - Automatic memoization of components and hooks
  - Do not use manual `useMemo`, `useCallback`, or `React.memo`
- Edge-to-edge on Android with predictive back gesture disabled
- Custom splash screen configuration with dark mode support
