# Changelog

All notable changes to Hacker Reader will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-11-08

### Changed
- Refactored guidelines acceptance from modal component to dedicated screen route (`app/auth/guidelines.tsx`)
- Enhanced login flow with native form that POSTs directly to Hacker News
- Improved authentication reliability with direct credential submission
- Removed sheet grabbers from authentication screens for cleaner user experience
- Guidelines acceptance now persisted in AsyncStorage with automatic redirect flow

### Added
- Vercel Analytics integration for web app traffic insights

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

[1.1.0]: https://github.com/danielcspaiva/hacker-reader/releases/tag/v1.1.0
[1.0.0]: https://github.com/danielcspaiva/hacker-reader/releases/tag/v1.0.0
