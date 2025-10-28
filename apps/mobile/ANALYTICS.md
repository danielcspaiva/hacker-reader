# Analytics Implementation

This document describes the PostHog analytics implementation for the Hacker Reader mobile app.

## Recent Improvements (2025-10)

✅ **User Identification**: Users are now properly identified on login using their HN session cookie ID
✅ **Screen Tracking**: Automatic screen view tracking using expo-router navigation
✅ **Theme Tracking Fix**: Theme changes now track the correct new value (not old)
✅ **Error Tracking**: Login failures and authentication errors are now tracked
✅ **Documentation**: Clarified super properties vs person properties usage

## Setup

### 1. Environment Configuration

Create a `.env` file in `apps/mobile/` based on `.env.example`:

```bash
cp .env.example .env
```

Add your PostHog configuration:

```env
EXPO_PUBLIC_POSTHOG_API_KEY=your-posthog-api-key-here
EXPO_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

**Getting your API key:**
1. Sign up at [PostHog Cloud](https://app.posthog.com/signup) or use self-hosted instance
2. Navigate to Project Settings → API Keys
3. Copy your Project API Key
4. Paste it into your `.env` file

### 2. Install Dependencies

PostHog is already installed in `package.json`. If you need to reinstall:

```bash
pnpm install
```

### 3. Rebuild the App

After adding environment variables, rebuild the app:

```bash
# iOS
pnpm ios

# Android
pnpm android
```

## Architecture

### Core Components

1. **PostHog Context** (`contexts/posthog-context.tsx`)
   - Initializes PostHog client on app startup
   - Manages opt-in/opt-out state
   - Provides PostHog client instance to entire app

2. **Analytics Hook** (`hooks/use-analytics.ts`)
   - Type-safe wrapper around PostHog client
   - Provides methods: `track()`, `identify()`, `setUserProperties()`, `reset()`, `screen()`
   - Handles cases where PostHog is not initialized

3. **Event Constants** (`constants/analytics-events.ts`)
   - Centralized event names and property keys
   - Type definitions for event properties
   - Ensures consistency across the app

## Tracked Events

### Navigation & Discovery

- `story_opened` - User opens story detail page
- `story_link_opened` - User clicks external link
- `category_changed` - User switches feed categories (top/new/ask/show/jobs)
- `infinite_scroll_triggered` - Next page loaded in feed

### Engagement

**Voting:**
- `story_upvoted` - Story upvoted
- `story_unvoted` - Upvote removed
- `vote_failed` - Vote operation failed

**Bookmarking:**
- `story_bookmarked` - Story added to bookmarks
- `story_unbookmarked` - Story removed from bookmarks
- `bookmarks_cleared` - All bookmarks cleared

**Comments:**
- `comment_viewed` - Comment thread expanded
- `comment_collapsed` - Comment thread collapsed
- `comment_reply_started` - Reply input opened
- `comment_posted` - New comment successfully posted
- `comment_failed` - Comment posting failed

**Sharing:**
- `story_shared` - Share action triggered

### Authentication

- `login_initiated` - Login modal opened
- `login_completed` - Successful login ✅ **Identifies user**
- `login_failed` - Login attempt failed (with error details)
- `logout_completed` - User logged out ✅ **Resets user identity**
- `session_expired` - Auth session expired

### Settings & Preferences

- `theme_changed` - Color scheme/palette changed
- `cache_cleared` - User cleared cache
- `app_rated` - User clicked rate app button
- `source_code_viewed` - Repository link opened

### Screen Views

Automatically tracked via expo-router navigation:
- Screen name derived from pathname
- Includes path and segments as properties

## User Identification

**How it works:**
1. On login, users are identified using their HN session cookie ID
2. On app startup, returning users are auto-identified from stored session
3. On logout, user identity is reset (anonymizes future events)

**User Properties (Super Properties):**

These properties are sent with EVERY event:

- `is_authenticated` - Boolean authentication status
- `color_scheme` - Current theme preference (system/light/dark)
- `platform` - iOS/Android
- `app_version` - App version from package.json
- `expo_sdk_version` - Expo SDK version

**Note:** These are "super properties" (event-level), not "person properties" (user-level). They're set via `client.register()` and included automatically with all future events.

## Usage Examples

### Basic Event Tracking

```tsx
import { useAnalytics } from '@/hooks/use-analytics';
import { EVENTS, EVENT_PROPERTIES } from '@/constants/analytics-events';

function MyComponent() {
  const analytics = useAnalytics();

  const handleAction = () => {
    analytics.track(EVENTS.STORY_OPENED, {
      [EVENT_PROPERTIES.STORY_ID]: 123,
      [EVENT_PROPERTIES.STORY_TITLE]: 'Hello World',
    });
  };

  return <Button onPress={handleAction}>Open Story</Button>;
}
```

### User Identification

```tsx
// Identify user on login
analytics.identify('user-123', {
  email: 'user@example.com',
  signup_date: '2025-01-01',
});

// Reset on logout
analytics.reset();
```

### Setting User Properties

```tsx
analytics.setUserProperties({
  [USER_PROPERTIES.COLOR_SCHEME]: 'dark',
  [USER_PROPERTIES.IS_AUTHENTICATED]: true,
});
```

### Screen Tracking

```tsx
// PostHog automatically tracks screen views via expo-router
// Manual tracking is available if needed:
analytics.screen('Settings', {
  from: 'feed',
});
```

## Privacy & Compliance

### Development Mode

Analytics can be disabled via environment variable for development/testing:

```env
EXPO_PUBLIC_ANALYTICS_DISABLED=true
```

### Data Security

- Never log sensitive data (passwords, cookies, tokens)
- SecureSession prevents cookie exposure in analytics
- All requests use HTTPS
- PostHog data retention follows GDPR guidelines

## Development

### Debugging

Enable debug logging by setting `__DEV__` flag. PostHog logs will appear in console:

```
[PostHog] Initialized successfully
[Analytics] Event tracked: story_opened { story_id: 123 }
```

### Testing Events

1. Run app in development mode
2. Perform actions that trigger events
3. Check console for `[Analytics]` logs
4. Verify events in PostHog dashboard (Events → Live events)

### Adding New Events

1. Add event name to `EVENTS` in `constants/analytics-events.ts`
2. Add any new properties to `EVENT_PROPERTIES`
3. Create TypeScript interface if needed (e.g., `StoryEventProperties`)
4. Track event using `analytics.track()`

Example:

```tsx
// 1. Add to constants/analytics-events.ts
export const EVENTS = {
  // ...existing events
  SEARCH_PERFORMED: 'search_performed',
} as const;

export const EVENT_PROPERTIES = {
  // ...existing properties
  SEARCH_QUERY: 'search_query',
  RESULTS_COUNT: 'results_count',
} as const;

// 2. Track in component
analytics.track(EVENTS.SEARCH_PERFORMED, {
  [EVENT_PROPERTIES.SEARCH_QUERY]: query,
  [EVENT_PROPERTIES.RESULTS_COUNT]: results.length,
});
```

## PostHog Dashboard

### Key Metrics to Monitor

1. **Engagement:**
   - Daily/Weekly Active Users (DAU/WAU)
   - Story opens per session
   - Comment posting rate
   - Vote activity

2. **Retention:**
   - Day 1, Day 7, Day 30 retention
   - Cohort analysis by signup date

3. **Feature Usage:**
   - Bookmarks created vs. cleared
   - Category distribution (top/new/ask/show/jobs)
   - Authentication rate

4. **Technical:**
   - Vote failure rate
   - Comment failure rate
   - Session expiration frequency

### Creating Insights

Example insight queries:

**Most Viewed Stories:**
```sql
SELECT properties.story_title, COUNT(*) as views
FROM events
WHERE event = 'story_opened'
GROUP BY properties.story_title
ORDER BY views DESC
LIMIT 10
```

**Category Popularity:**
```sql
SELECT properties.category, COUNT(*) as changes
FROM events
WHERE event = 'category_changed'
GROUP BY properties.category
ORDER BY changes DESC
```

## Troubleshooting

### Events Not Appearing

1. **Check API key:** Verify `EXPO_PUBLIC_POSTHOG_API_KEY` is set correctly
2. **Rebuild app:** Environment variables require rebuild after changes
3. **Check logs:** Look for `[PostHog]` initialization messages
4. **Network:** Ensure device/simulator has internet connection
5. **PostHog status:** Check [status.posthog.com](https://status.posthog.com)

### Type Errors

If you see TypeScript errors related to analytics:

```bash
pnpm typecheck
```

Ensure all event names use constants from `analytics-events.ts`:

```tsx
// ❌ Bad - hardcoded string
analytics.track('story_opened', {});

// ✅ Good - using constant
analytics.track(EVENTS.STORY_OPENED, {});
```

### PostHog Not Initializing

Check console for error messages. Common issues:

- Missing or invalid API key
- Network firewall blocking PostHog
- Self-hosted instance URL incorrect
- React Native version incompatibility

## Resources

- [PostHog Docs](https://posthog.com/docs)
- [PostHog React Native SDK](https://posthog.com/docs/libraries/react-native)
- [GDPR Compliance](https://posthog.com/docs/privacy/gdpr-compliance)
- [PostHog API Reference](https://posthog.com/docs/api)
