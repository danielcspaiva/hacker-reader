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
- **Link Preview** - Open Graph image thumbnail (80x80px compact mode)
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

### Navigation

- **Tab Navigation** - Five tabs for each story category
- **Stack Navigation** - Story details pushed onto stack
- **File-based Routing** - Expo Router with typed routes
- **Deep Linking** - Support for story URLs and widget deep links

---

## iOS Widgets

> **Note**: iOS widgets are only available in native builds (not Expo Go). Requires iOS 16.2+.

### Widget Sizes

#### Small Widget

- Displays **3 top stories**
- Compact layout with titles only
- Single tap opens main app feed
- Perfect for at-a-glance updates

#### Medium Widget

- Displays **5 top stories**
- Shows title, points, and comment count
- Individual story taps deep link to story detail
- Balanced size for home screen

#### Large Widget

- Displays **10 top stories**
- Complete metadata (points, author, comments)
- Scrollable list of stories
- Maximum information density

### Widget Features

#### Automatic Updates

- Timeline refreshes every **30 minutes**
- Fetches latest top stories from HN API
- Smart caching for offline fallback
- Background updates managed by iOS

#### Data Synchronization

- **App Group Sharing** - `group.com.danielcspaiva.hnclient`
- Shared UserDefaults for cached stories
- Widget works offline with cached data
- Future: Bidirectional sync with main app

#### Deep Linking

- URL scheme: `hnclient://story/{id}`
- Tapping stories opens app to detail page
- Small widget opens main feed
- Medium/Large widgets have per-story links

#### Styling

- Matches app theme (HN orange #ff6600)
- Full dark mode support
- SF Symbols icons: =% flame.fill,  arrow.up, =d person.fill, =P clock.fill
- Typography consistent with app design

#### Technical Implementation

- Built with `react-native-widget-extension` Expo config plugin
- Native Swift using SwiftUI and WidgetKit
- All Swift code in `apps/mobile/widgets/` (CNG-compliant)
- Widget extension auto-generated during prebuild
- Direct HN API integration (https://hacker-news.firebaseio.com/v0/)

---

## Authentication & User Actions

> **Note**: Authentication is currently mobile-only. Web app remains read-only.

### Login System

#### WebView Authentication

- **Official HN Login** - Uses actual Hacker News website in WebView
- **No Credential Storage** - App never handles passwords directly
- **Cookie Extraction** - Automatic cookie capture via `@react-native-cookies/cookies`
- **Secure Storage** - Cookies stored in device keychain/keystore via `expo-secure-store`
- **Session Persistence** - Stay logged in across app restarts

#### Login Flow

1. User taps "Login" in Settings
2. WebView opens official HN login page
3. User enters credentials on HN website
4. App extracts session cookies automatically
5. Cookies stored securely, WebView closes
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
  - **Compact** - 80x80px thumbnail in story cards
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

- **Light Mode**
  - Background: White/Light Gray
  - Text: Dark Gray/Black
  - Accent: HN Orange (#ff6600)

- **Dark Mode** (Lights-Out)
  - Background: True Black/Dark Gray
  - Text: White/Light Gray
  - Accent: HN Orange (#ff6600)

#### Theme-Aware Components

- `ThemedView` - Containers with theme colors
- `ThemedText` - Typography with theme colors
- `useThemeColor` - Hook for dynamic colors
- Automatic icon tinting

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

- ESLint for linting
- Consistent code style
- React best practices
- Modern JavaScript/TypeScript features

---

## Future Enhancements

### Planned Features

- [x] Comment posting UI implementation
- [x] Comment deletion
- [ ] User profiles
- [x] Search functionality (Algolia-powered)
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

- **iOS**: 16.2+ (16.2+ for widgets)
- **Android**: 5.0+ (API Level 21+)
- **Expo SDK**: 54+
- **React Native**: 0.76+
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
