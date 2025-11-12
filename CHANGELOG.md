# Changelog

All notable changes to Hacker Reader will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-11-11

### Added
- **Profile Tab** with complete user profile viewing
  - View user karma, account age, and bio
  - Browse user's submissions (stories and comments)
  - Separate views for stories vs comments with type filter
  - Account login/logout moved from Settings to Profile
- **Third-Party User Profiles** with dedicated screens
  - New routes: `app/user/[id].tsx` and `app/user/[id]/submissions.tsx`
  - Clickable usernames throughout app (comment headers, story headers)
  - View any HN user's profile, karma, bio, and submission history
  - Same submission filtering (stories vs comments) as own profile
- **Smart Prefetching** for instant category switching
  - New `use-app-prefetch` hook prefetches all 5 categories on app open
  - Prefetches first 30 items per category (155 API calls total)
  - Completes in 1-2 seconds after initial load
  - No loading spinners when switching between categories
- New API endpoints in `hn-api.ts`:
  - `getUser(id)` - Fetch user profile data
  - Enhanced `getItems()` with better null filtering
- New hooks for user data:
  - `use-user.ts` - Fetch and cache user profiles
  - `use-user-submissions.ts` - Fetch and cache user submissions (stories & comments)
- New UI components:
  - `SubmissionCommentCard` - Display user comment submissions
  - `SubmissionTypeFilter` - Toggle between stories and comments view
- Enhanced login screen with external link to HN account creation

### Changed
- Moved authentication UI from Settings tab to dedicated Profile tab
- Enhanced feed scroll behavior to auto-scroll to top when switching categories
- Optimized category filter to remove unnecessary animation frame wrapper
- Refactored sticky header rendering with ref-based scroll tracking for better performance
- Improved infinite scroll logic to prevent duplicate fetches while data is pending
- Enhanced feed refreshing to only trigger when not already loading data
- Simplified `getItems()` function by removing unnecessary null filtering
- App version bumped to 1.2.0 in `app.json`

### Performance
- Category switching now instant after ~2 second warmup period
- React Query cache reuse across profile and feed views
- Individual item caches populated during prefetch for faster detail views
- Increased prefetch page size (10 → 30 items) reduces subsequent API calls

## [1.1.0] - 2025-11-08

### Added
- Comment deletion functionality with optimistic UI updates
- New `use-comment-mutation` hook for streamlined comment posting
- New `use-delete-comment-mutation` hook for deleting comments
- TypeScript type checking script in package.json
- Vercel Analytics integration for web app traffic insights

### Changed
- Refactored guidelines acceptance from modal component to dedicated screen route (`app/auth/guidelines.tsx`)
- Enhanced login flow with native form that POSTs directly to Hacker News
- Improved authentication reliability with direct credential submission
- Removed sheet grabbers from authentication screens for cleaner user experience
- Guidelines acceptance now persisted in AsyncStorage with automatic redirect flow
- Improved mutation cache logic to skip auto-invalidation for comment mutations, allowing manual control
- Enhanced header titles for consistency: "Login" → "Sign in", "Guidelines" → "Hacker News Guidelines"
- Refactored comment posting logic from component to dedicated hook
- Improved analytics tracking with dedicated functions for comment events
- Enhanced Open Graph API with better error handling and type safety
- Updated HN authentication parsers with improved token extraction

### Improved
- Error handling for unblocking users with better user feedback
- Error handling for clearing blocked users
- Story query hook with better cache management for comments

### Removed
- `GuidelinesModal` component (replaced with screen route)

## [1.0.0] - 2025-11-07

### Added
- Initial public release of Hacker Reader
- Five HN feeds: Top, New, Show HN, Ask HN, and Jobs
- FlashList-based infinite scrolling for optimal performance
- Rich Open Graph link previews with thumbnail images
- Threaded comment system with collapsible trees
- Deep linking support for sharing stories
- HN account authentication via WebView
- Vote and favorite functionality for stories and comments
- Algolia-powered search across all HN content
- Bookmarks with persistent local storage
- User blocking feature to filter content
- iOS home screen widgets in three sizes (small, medium, large)
- Widget auto-updates every 30 minutes
- Widget deep linking to stories
- Offline widget support with cached data
- System-aware dark mode with manual override
- Glass effect UI elements
- Haptic feedback for interactions
- Next.js marketing site with App Store badges
- Community guidelines acceptance flow
- PostHog analytics integration (optional)
- Sentry error tracking (optional)
- React Compiler for automatic optimization
- TypeScript strict mode throughout codebase
- Expo Router file-based routing
- React Query for data fetching and caching
- Secure session management with expo-secure-store
- Rate limiting for HN write operations
- Monorepo structure with pnpm workspaces

### Platform Support
- iOS: Full support with native widgets
- Web: Marketing site only (read-only)
- Android: Coming in future release

### Technical Details
- Expo SDK 54
- React Native 0.81
- React 19.1 with React Compiler
- TypeScript 5.9
- React Query for state management
- expo-router v6 for navigation

[1.2.0]: https://github.com/danielcspaiva/hacker-reader/releases/tag/v1.2.0
[1.1.0]: https://github.com/danielcspaiva/hacker-reader/releases/tag/v1.1.0
[1.0.0]: https://github.com/danielcspaiva/hacker-reader/releases/tag/v1.0.0
