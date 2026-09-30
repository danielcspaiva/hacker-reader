# Hacker News Client - Features Documentation

This document provides a comprehensive overview of all features available in the Hacker News mobile client.

## Table of Contents

- [Core Features](#core-features)
- [iOS Widgets](#ios-widgets)
- [Hacker Reader Pro](#hacker-reader-pro)
- [Authentication & User Actions](#authentication--user-actions)
- [UI/UX Features](#uiux-features)
- [Performance & Technical Features](#performance--technical-features)

---

## Core Features

### Story Browsing

Browse Hacker News stories across six categories, plus past front pages:

#### Categories

- **Top Stories** =% - The most popular stories currently on HN
- **Best Stories** - Highest-voted recent stories (Firebase `beststories`)
- **New Stories** ( - Recently submitted stories
- **Ask HN** =� - Questions and discussions from the community
- **Show HN** =� - Projects, products, and creations shared by users
- **Jobs** =� - Job postings from YC companies and startups

#### Past Front Pages

"Past Front Pages…" in the feed menu opens a day's front page (Algolia `front_page`, ranked by points), like news.ycombinator.com/front. Defaults to yesterday; previous/next day buttons in the header and a native date picker. Days are UTC. Deep link: `hnclient://front/YYYY-MM-DD`.

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
- **Thread Navigation** - Floating chevrons jump to the next/previous top-level comment; Collapse All / Expand All in the story menu
- **Text Size** - Settings → Text Size (Small to Extra Large, with preview) scales story titles, story text and comments on top of iOS Dynamic Type

- **Offline Reading** - Feeds and opened stories are saved on the device for 24h and show instantly on launch; bookmarks save their full thread (also in the background when the Bookmarks tab opens). Offline, an "Offline, showing saved stories" badge sits above saved content; Settings → Clear Cache removes the saved copies
- **Muted Words & Sites** - Mute title keywords or whole sites (subdomains included) from Settings or a story's menu; hides matching stories in the feed only (not search or bookmarks)

### iPad Split View

- Windows 768pt wide or more (iPad, Split View, Stage Manager; follows resizing) show the Stories and Bookmarks lists in a 400pt left column and the selected story's detail (header, comments, reply box) on the right
- Tapping a card selects it in place with an orange ring; nothing selected shows "Select a story"; deep links and peek previews still push the story screen
- Pushed story detail, settings, profile and other lists cap content at 720pt, centred
- Narrow windows and iPhone use the stacked phone layout

### Navigation

- **Tab Navigation** - Native tabs: Stories (category picked in the header), Bookmarks, Profile, Settings, Search
- **Stack Navigation** - Story details pushed onto stack
- **File-based Routing** - Expo Router with typed routes
- **Deep Linking** - Support for story URLs and widget deep links

---

## iOS Widgets

> **Note**: iOS widgets are only available in native builds (not Expo Go). Built with `expo-widgets`; requires iOS 16.4+ (the Stories widget needs iOS 17 for its category picker).

### Stories widget

- **Category picker** - long-press, Edit Widget, choose Top, Best, New, Ask HN, Show HN or Jobs (iOS 17+); the widget label names the category, Jobs hides points and comments
- **Small** - the #1 story as a hero card (up to 4 lines of title); tap opens that story
- **Medium** - **3 stories** (hero plus two) with points, comments, domain and age; each deep links to its story
- **Large** - **7 stories**, same row layout
- **Lock screen (rectangular)** - 3 one-line titles; tap opens the first story
- Tapping the header or background opens the feed on the widget's category

### Bookmarks widget

- **Medium** (2 rows) and **Large** (7 rows): your most recent bookmarks with points, domain and age; tap a row to open the story, the header to open the Bookmarks tab
- Updates as soon as you bookmark or remove a story; with no bookmarks it shows "Bookmark stories to see them here"
- Works offline from the last synced copy (points and comments can be stale); it does not refresh itself from the network

### Widget Features

- **Two ways to stay fresh (Stories)** - the app refreshes every category on launch, on foreground and after a Top feed pull-to-refresh; independently, a self-refreshing timeline provider (added by a config plugin) refetches them itself when the stored ones are older than 30 minutes, so the widget updates with the app closed
- A 12 hour timeline (24 entries, 30 minutes apart) keeps relative ages correct between refreshes
- Shows "Updated Nh ago" after 6 hours without a refresh
- The app logo reaches the widget through the App Group container (the extension cannot read the app bundle)
- Dark mode and tinted/vibrant rendering supported
- App Group: `group.com.danielcspaiva.hnclient`

---

## iCloud Sync

Free on every iOS device signed in to iCloud: it runs on the phone and Apple's servers, never ours.

- **What syncs** - bookmarks, mutes, blocked users, hidden stories and read state (only the 500 most recent entries)
- **How** - each collection is a last-writer-wins document in iCloud key-value storage (`NSUbiquitousKeyValueStore`), with tombstones so deletions propagate and a size budget far below the 1 MB limits; a local "last synced" state per collection detects deletions
- **When** - on launch, on foreground, about 2 seconds after a local change, and when another device changes iCloud
- **Settings** - Data section: an "iCloud Sync" switch (on by default when iCloud is available), "iCloud unavailable" when signed out, and a last-synced time; the Bookmarks widget refreshes after a sync changes bookmarks
- **Not on** Android or web (the switch is hidden)

---

## Hacker Reader Pro

An optional subscription for features that need a server. Everything that runs on the phone stays free; Pro pays for the servers.

- **Paywall** - a sheet (`app/pro.tsx`) opened only when someone taps a Pro feature or the Pro row in Settings, never on launch; plan cards (yearly with the store's trial and a per-month equivalent, monthly) priced from the App Store, a purchase button, Restore Purchases, Terms of Use and Privacy links
- **Features** - reply notifications, keyword alerts, AI summaries, daily digest, iCloud sync, alternate app icons (reply notifications are live; the rest are "Coming soon", each later PR flips its `status` in `lib/pro/features.ts`)
- **Features** - reply notifications, keyword alerts, AI summaries, daily digest, iCloud sync, alternate app icons (AI summaries is available; the rest are "Coming soon" until each PR flips its `status` in `lib/pro/features.ts`)
- **AI summaries** - "Summarize" in the story's ⋯ menu, plus a "Summarize N comments" pill in the story header above 40 comments; behind `requirePro("ai_summaries")`. Opens a sheet (`app/story/[id]/summary.tsx`) with a skeleton while generating (10-20s, polled on 202), then the article TL;DR, the discussion summary, theme cards whose "N comments" link closes the sheet and scrolls to the first cited comment, a "Where people disagree" section and a "Generated N min ago · AI can be wrong" footer. Plain text only; errors show a friendly message with Try Again. Summaries are generated once per story on the server and shared by all Pro users
- **Features** - reply notifications, keyword alerts, AI summaries, daily digest, alternate app icons (all "Coming soon" for now; each later PR flips its `status` in `lib/pro/features.ts`)
- **Settings** - a "Hacker Reader Pro" section: upsell row, or "Pro, thank you" with Manage Subscription; Restore Purchases; Delete Pro Data (removes the install's server-side data)
- **Reply notifications** - the "Notify me of replies" switch (Replies screen, and Settings' Pro section) asks for notification permission, gets the Expo push token and registers it with the HN username; the API cron pushes "💬 dang replied: ..." (max 5 per run, "and N more" after that) and a tap opens the story scrolled to the reply. Off, sign-out and Delete Pro Data clear it
- **Identity** - a random install ID in the Keychain, also the RevenueCat app user id; no account
- **Unavailable builds** - without `EXPO_PUBLIC_REVENUECAT_IOS_KEY` (dev, self-built, web, Expo Go) the section is hidden and the app works normally

---

## Replies inbox (free)

- **Replies** - a row on the Profile tab (unread badge) opens the signed-in user's replies: the direct replies to their latest 30 stories and comments, newest first, each with what it answers (story title or an excerpt of the user's comment); a tap opens the story scrolled to the reply
- **Unread** - the last-opened time is stored locally; viewing the inbox marks everything seen; the first sign-in starts with no badge
- **Client-only** - fetched from the public HN API on the phone, no server and no Pro needed

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

#### Submitting Stories

- **Submit sheet** - "Submit a Story…" in the feed header menu and "Submit a story" on your Profile; title (80-character counter), URL and text, prefilled from a shared link
- **Duplicates** - HN redirecting to an existing item shows "Open existing discussion" instead of posting
- **Signed out** - the sheet shows a sign-in prompt that opens the login sheet
- **After posting** - success haptic, the sheet closes and the New feed refreshes

#### Discuss on HN (share extension)

- Share a web link from Safari or any app to Hacker Reader; the link is looked up on Algolia (tracking parameters, `www.` and trailing slash ignored)
- Existing discussions open in a "Discussions on HN" sheet sorted by points, with "Submit it" at the bottom; with none, the Submit sheet opens prefilled
- `hnclient://discuss?url=...` opens the same lookup without the extension

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
