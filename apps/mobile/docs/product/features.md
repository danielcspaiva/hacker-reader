# Hacker News Client - Features Documentation

This document provides a comprehensive overview of all features available in the Hacker News mobile client.

## Table of Contents

- [Core Features](#core-features)
- [iOS Widgets](#ios-widgets)
- [Authentication & User Actions](#authentication--user-actions)
- [UI/UX Features](#uiux-features)
- [Performance & Technical Features](#performance--technical-features)

---

## Core Features

### Story Browsing

Browse Hacker News stories across five different categories:

#### Categories

- **Top Stories** =% - The most popular stories currently on HN
- **New Stories** ( - Recently submitted stories
- **Ask HN** =� - Questions and discussions from the community
- **Show HN** =� - Projects, products, and creations shared by users
- **Jobs** =� - Job postings from YC companies and startups

#### Story Cards

Each story displays:

- **Title** - Story headline (clickable to open in browser)
- **Metadata** - Points, author, time posted, comment count
- **Domain** - Extracted domain name from URL
- **Link Preview** - Open Graph image as a flush, full-height panel on the card's right edge (about 104pt wide); cards without an image use the full width
- **Context Menu** - Long-press for upvote/unvote (when authenticated)

#### Infinite Scrolling

- Stories load 30 at a time
- Automatic loading when scrolling near the end
- Optimized with FlashList for smooth performance
- React Query caching - instant category switching after first load

### Story Details

#### Full Story View

- **Full Link Preview** - Large Open Graph image with metadata
- **Story Metadata** - Complete story information
- **Comment Tree** - Recursive, collapsible comment threads
- **Deep Linking** - Shareable URLs (hnclient://story/{id})

#### Comment System

- **Recursive Threading** - Nested comment display with visual indentation
- **Collapsible Threads** - Tap to collapse/expand comment trees
- **Reply Counts** - Shows number of replies per comment
- **HTML Parsing** - Properly formatted text with clickable links
- **Lazy Loading** - Comments fetched individually for performance
- **Filtered Content** - Dead/deleted comments automatically hidden
- **Read State** - Opened stories dim in every list; a "+N" badge shows comments added since your last visit; new comments are marked `NEW` with a "Next new comment" button; Mark as Read/Unread in the card menu; Clear Reading History in Settings

### Navigation

- **Tab Navigation** - Native tabs: Stories (category picked in the header), Bookmarks, Profile, Settings, Search
- **Stack Navigation** - Story details pushed onto stack
- **File-based Routing** - Expo Router with typed routes
- **Deep Linking** - Support for story URLs and widget deep links

---

## iOS Widgets

> **Note**: iOS widgets are only available in native builds (not Expo Go). Built with `expo-widgets`; requires iOS 16.4+.

### Widget Sizes

- **Small** - the #1 story as a hero card (up to 4 lines of title); tap opens that story
- **Medium** - **2 top stories** with points, comments, domain and age; each row deep links to its story
- **Large** - **7 top stories**, same row layout
- **Lock screen (rectangular)** - 3 one-line titles; tap opens the top story

### Widget Features

- **Two ways to stay fresh** - the app refreshes the timeline on launch, on foreground and after a Top feed pull-to-refresh; independently, a self-refreshing timeline provider (added by a config plugin) refetches the stories itself when the stored ones are older than 30 minutes, so the widget updates with the app closed
- A 12 hour timeline (24 entries, 30 minutes apart) keeps relative ages correct between refreshes
- Shows "Updated Nh ago" after 6 hours without a refresh
- The app logo reaches the widget through the App Group container (the extension cannot read the app bundle)
- Dark mode and tinted/vibrant rendering supported
- App Group: `group.com.danielcspaiva.hnclient`

---

## Authentication & User Actions

> **Note**: Authentication is currently mobile-only. Web app remains read-only.

### Login System

#### Native Login

- **Direct HN login** - a native form POSTs the credentials straight to news.ycombinator.com over HTTPS; nothing is stored by the app
- **HN Guidelines** - shown on the login sheet until accepted once
- **Cookie Extraction** - session cookies captured via `@react-native-cookies/cookies`
- **Secure Storage** - Cookies stored in device keychain/keystore via `expo-secure-store`
- **Session Persistence** - Stay logged in across app restarts

#### Login Flow

1. User taps "Log in" in the Profile tab
2. The login sheet opens; first time, the HN Guidelines are shown for acceptance
3. User enters username and password in the native form
4. App submits them to HN and extracts the session cookies
5. Cookies stored securely, the sheet closes
6. User now authenticated for all actions

#### Security Features

- **Cookie Protection** - SecureSession wrapper prevents accidental exposure
- **HTTPS Only** - All API requests use secure connections
- **No Logging** - Cookies never logged or exposed
- **Auto-Detection** - Session expiration detected � automatic logout
- **Re-login Prompts** - User prompted to re-authenticate when needed

### User Actions

#### Upvoting

- **Story Upvotes** - Long-press story card � "Upvote" in context menu
- **Comment Upvotes** - Tap arrow icon on comments (coming soon)
- **Unvote** - Long-press � "Unvote" to remove upvote
- **Optimistic Updates** - Instant UI feedback with automatic rollback on error
- **Authentication Required** - Login prompt shown for unauthenticated users

#### Favoriting

- **Save Stories** - Mark stories as favorites for later
- **Favorite List** - View saved favorites (coming soon)
- **Sync with HN** - Favorites synced to your HN account

#### Commenting

- **Reply to Stories** - Post top-level comments with in-app composer
- **Reply to Comments** - Nested replies in threads with inline input
- **Delete Comments** - Remove your own comments with confirmation prompt
- **Optimistic Updates** - Instant UI feedback while posting/deleting
- **HTML Support** - Basic formatting supported (links, code, quotes)
- **Error Recovery** - Automatic rollback on network errors
- **Smart Hooks** - Dedicated `use-comment-mutation` and `use-delete-comment-mutation` hooks

#### Rate Limiting

- **Client-Side Throttling** - 30 actions per minute limit
- **Smart Warnings** - User notified before hitting rate limit
- **Automatic Retry** - Failed actions retried with exponential backoff
- **Error Handling** - Typed errors with clear user messages

#### Error Taxonomy

- `NOT_LOGGED_IN` - Authentication required
- `SESSION_EXPIRED` - Re-login needed
- `RATE_LIMITED` - Too many actions
- `NETWORK_ERROR` - Connection issues
- `HN_ERROR` - HN API error with details
- `ITEM_NOT_FOUND` - Story/comment doesn't exist
- `ALREADY_VOTED` - Can't upvote twice

---

## UI/UX Features

### Link Previews

#### Open Graph Metadata Fetching

- Automatic OG metadata extraction from story URLs
- Displays preview images, titles, and descriptions
- Two display modes:
  - **Compact** - edge-to-edge image panel (about 104pt wide, full card height) on story cards
  - **Full** - Large image in story detail page
- Powered by `expo-image` for optimized loading
- Graceful fallback for URLs without OG data

#### Smart Image Loading

- Lazy loading for performance
- Automatic image caching
- Placeholder while loading
- Error handling for broken images

### Theme System

#### Dark Mode Support

- **Auto-Detection** - Follows system preference
- **Instant Switching** - Seamless theme transitions
- **Full Coverage** - All screens and components themed
- **React Navigation Themes** - Navigation UI matches theme

#### Color Palette

- **Light Mode** - warm grey page (`#F4F0EC`) with white cards and dark warm text
- **Dark Mode** - warm deep charcoal-brown (`#17130F`), never pure black
- **Accent** - the app icon's orange (`#FF7A18`); text-safe orange (`primaryInk`) for links and small text

Full token table, contrast ratios and component contract: [`docs/design-language.md`](../design-language.md).

#### Theme-Aware Building Blocks

- `useTheme()` - `{ scheme, colors }`, the one way to read colours
- `Text`, `Card`, `ListSection` and the other primitives in `components/ui/`
- Automatic icon tinting; the splash screen and root view follow the resolved scheme

### Gesture & Interaction

#### Context Menus

- Long-press story cards for actions
- Haptic feedback on interactions
- Native iOS/Android menu styles

#### Collapsible Comments

- Tap comment header to collapse/expand
- Visual indicators for collapsed state
- Preserves scroll position

#### Pull to Refresh

- Refresh story lists
- Clear visual feedback
- Automatic refetch with React Query

#### Safe Area Handling

- Proper insets on all screens
- Notch/Dynamic Island support
- Bottom tab bar padding
- Platform-specific adjustments (Android needs extra padding)

### Time Display

- Human-readable timestamps ("2h ago", "3d ago")
- Automatic updates (1m, 5m, 1h, 1d, etc.)
- Consistent formatting across app

### External Links

- **In-App Browser** - Opens with `expo-web-browser`
- **System Browser** - Option to open externally
- **Deep Linking** - Handle hnclient:// URLs

---

## Performance & Technical Features

### Optimization

#### FlashList Integration

- `@shopify/flash-list` instead of FlatList
- **Significantly Better Performance** for long lists
- Automatic recycling of list items
- Reduced memory footprint
- Used in all story list screens

#### React Query Caching

- **5-minute staleTime** - Data fresh for 5 minutes
- **10-minute gcTime** - Garbage collection after 10 minutes
- **Smart Refetching** - Only when needed
- **Instant Navigation** - Cached data shown immediately
- **Background Updates** - Stale data refetched in background

#### React Compiler

- **Automatic Memoization** - SDK 54+ auto-configures Babel plugin
- **No Manual Optimization** - No `useMemo`, `useCallback`, or `React.memo` needed
- **Smart Re-renders** - Compiler optimizes component updates
- **Improved Performance** - Reduced unnecessary renders

### Data Architecture

#### HN API Integration

- Base URL: `https://hacker-news.firebaseio.com/v0`
- Typed API functions with full TypeScript support
- Parallel fetching for story details
- Error handling and retries (2 retries with exponential backoff)

#### Write API Integration

- Separate module for authenticated actions
- SecureSession-based authentication
- Rate limiting built-in
- Typed error responses

#### React Query Hooks

- `useStories(category)` - Infinite query for story lists
- `useStory(id)` - Single story query with comment management
- `useComment(id)` - Single comment query
- `useCommentMutation()` - Post comments with optimistic updates
- `useDeleteCommentMutation()` - Delete comments with optimistic updates
- `useOGMetadata(url)` - Link preview metadata
- Automatic cache management with manual control for mutations

### Platform Features

#### iOS-Specific

- SF Symbols for icons
- Native tabs with smooth animations
- Home screen widgets
- Haptic feedback
- Share sheet integration

#### Android-Specific

- Material Design icons
- Custom tab bar padding (100 + safe area bottom)
- Edge-to-edge display
- System back gesture

#### Cross-Platform

- Consistent navigation patterns
- Unified theme system
- Shared business logic
- Platform-appropriate UI components

### Developer Experience

#### TypeScript

- Full type safety throughout app
- Auto-generated route types (`.expo/types/router.d.ts`)
- Typed API responses
- IntelliSense support

#### File-Based Routing

- Intuitive file structure
- Automatic route configuration
- Type-safe navigation
- Deep linking support

#### Code Quality

- oxlint and oxfmt for linting and formatting
- Node tests for the HN layer (`pnpm test`)
- Consistent code style
- React best practices
- Modern JavaScript/TypeScript features

---

## Future Enhancements

### Planned Features

- [x] Comment posting UI implementation
- [x] Comment deletion
- [x] User profiles
- [x] Search functionality (Algolia-powered): sort (relevance/newest), stories or comments, date range and minimum points filters in a header menu (persisted), `author:<name>` queries
- [ ] Favorites list screen
- [x] Share stories
- [ ] Offline reading mode
- [ ] iPad optimization
- [ ] Android widgets
- [ ] Web app authentication
- [ ] Notifications for replies
- [ ] Customizable themes
- [ ] Font size settings

### Under Consideration

- [ ] Local bookmarks
- [ ] Reading history
- [ ] Submission drafts
- [ ] Custom story filters
- [ ] Alternative sorting options
- [ ] Story collections
- [ ] RSS feed integration
- [ ] Privacy features (tracking protection)

---

## Technical Requirements

### Minimum Requirements

- **iOS**: 16.4+ (widgets)
- **Android**: 5.0+ (API Level 21+)
- **Expo SDK**: 58
- **React Native**: 0.88
- **Node.js**: 18+
- **Package Manager**: pnpm

### Recommended

- **iOS**: 17+ for best widget experience
- **Android**: 12+ for Material You theming
- **Device**: Physical device for full features (some features limited in simulators)

---

## Support & Resources

- **Repository**: [GitHub Repository URL]
- **Issues**: Report bugs and request features on GitHub
- **HN API Docs**: https://github.com/HackerNews/API
- **Expo Docs**: https://docs.expo.dev/

---

_Last Updated: November 10, 2025_
