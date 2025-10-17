# Extract Magic Numbers to Constants

**Priority**: Immediate (High Impact, Low Effort)
**Category**: Code Organization / Maintainability
**Estimated Time**: 15 minutes

## Problem

Magic numbers are scattered throughout the codebase without context:

**In Layout/Styling**:
- `100` - Android tab bar offset padding
- `80` - Thumbnail size in link preview
- `0.5` - Infinite scroll threshold

**In Data Fetching**:
- `30` - Page size for story fetching
- `5 * 60 * 1000` - Query stale time (5 minutes)
- `10 * 60 * 1000` - Query garbage collection time (10 minutes)
- `60 * 60 * 1000` - OG metadata stale time (1 hour)
- `24 * 60 * 60 * 1000` - OG metadata gc time (24 hours)
- `10 * 60 * 1000` - Comment stale time (10 minutes)
- `2` - Retry count

**In Timeouts/Limits**:
- `3600`, `86400` - Seconds in hour/day (timeAgo function)

**Issues**:
- Unclear meaning without comments
- Hard to change consistently
- No single source of truth
- Difficult to tune performance

## Solution

Extract all magic numbers to well-named constants in dedicated files.

### Implementation Steps

#### 1. Create `constants/layout.ts`

```typescript
/**
 * Layout and UI-related constants
 */

/**
 * Extra padding offset for Android to account for bottom tab bar
 * This is added to safe area insets on Android
 */
export const ANDROID_TAB_BAR_OFFSET = 100;

/**
 * Threshold (0-1) for triggering infinite scroll pagination
 * 0.5 = trigger when scrolled 50% to the end
 */
export const INFINITE_SCROLL_THRESHOLD = 0.5;

/**
 * Size of thumbnail images in compact link previews
 */
export const THUMBNAIL_SIZE = 80;

/**
 * Estimated height of a story card item for FlashList optimization
 */
export const STORY_CARD_ESTIMATED_HEIGHT = 120;
```

#### 2. Create `constants/api.ts`

```typescript
/**
 * API and data fetching configuration
 */

/**
 * Number of stories to fetch per page in infinite scroll
 */
export const STORIES_PAGE_SIZE = 30;

/**
 * Base URL for Hacker News Firebase API
 */
export const HN_API_BASE_URL = 'https://hacker-news.firebaseio.com/v0';

/**
 * User agent string for OG metadata fetching
 */
export const OG_FETCH_USER_AGENT = 'Mozilla/5.0 (compatible; HNClient/1.0)';
```

#### 3. Create `constants/cache.ts`

```typescript
/**
 * React Query cache configuration constants
 * All times are in milliseconds
 */

/**
 * How long story data is considered fresh (5 minutes)
 */
export const STORY_STALE_TIME = 5 * 60 * 1000;

/**
 * How long story data is kept in cache before garbage collection (10 minutes)
 */
export const STORY_GC_TIME = 10 * 60 * 1000;

/**
 * How long comment data is considered fresh (10 minutes)
 * Comments don't change often, so longer stale time
 */
export const COMMENT_STALE_TIME = 10 * 60 * 1000;

/**
 * How long OG metadata is considered fresh (1 hour)
 * OG data rarely changes
 */
export const OG_METADATA_STALE_TIME = 60 * 60 * 1000;

/**
 * How long OG metadata is kept in cache (24 hours)
 */
export const OG_METADATA_GC_TIME = 24 * 60 * 60 * 1000;

/**
 * Number of retry attempts for failed queries
 */
export const QUERY_RETRY_COUNT = 2;

/**
 * Number of retry attempts for OG metadata (fewer retries)
 */
export const OG_RETRY_COUNT = 1;
```

#### 4. Create `constants/time.ts`

```typescript
/**
 * Time-related constants
 */

/** Seconds in one minute */
export const SECONDS_PER_MINUTE = 60;

/** Seconds in one hour */
export const SECONDS_PER_HOUR = 3600;

/** Seconds in one day */
export const SECONDS_PER_DAY = 86400;

/** Milliseconds in one second */
export const MS_PER_SECOND = 1000;

/** Milliseconds in one minute */
export const MS_PER_MINUTE = 60 * 1000;

/** Milliseconds in one hour */
export const MS_PER_HOUR = 60 * 60 * 1000;

/** Milliseconds in one day */
export const MS_PER_DAY = 24 * 60 * 60 * 1000;
```

#### 5. Update Files to Use Constants

**`app/_layout.tsx`**:
```typescript
import { STORY_STALE_TIME, STORY_GC_TIME, QUERY_RETRY_COUNT } from '@/constants/cache';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STORY_STALE_TIME,
      gcTime: STORY_GC_TIME,
      retry: QUERY_RETRY_COUNT,
      refetchOnWindowFocus: false,
    },
  },
});
```

**`hooks/use-stories.ts`**:
```typescript
import { STORIES_PAGE_SIZE } from '@/constants/api';

const PAGE_SIZE = STORIES_PAGE_SIZE; // Or use directly
```

**`hooks/use-og-metadata.ts`**:
```typescript
import { OG_METADATA_STALE_TIME, OG_METADATA_GC_TIME, OG_RETRY_COUNT } from '@/constants/cache';

export function useOGMetadata(url?: string) {
  return useQuery<OGMetadata | null, Error>({
    queryKey: ['og-metadata', url],
    queryFn: () => (url ? fetchOGMetadata(url) : Promise.resolve(null)),
    enabled: !!url,
    staleTime: OG_METADATA_STALE_TIME,
    gcTime: OG_METADATA_GC_TIME,
    retry: OG_RETRY_COUNT,
  });
}
```

**`hooks/use-story.ts`**:
```typescript
import { COMMENT_STALE_TIME } from '@/constants/cache';

export function useComment(id: number) {
  return useQuery<HNItem, Error>({
    queryKey: ['comment', id],
    queryFn: () => getItem(id),
    enabled: !!id,
    staleTime: COMMENT_STALE_TIME,
  });
}
```

**`lib/hn-api.ts`**:
```typescript
import { HN_API_BASE_URL } from '@/constants/api';

const BASE_URL = HN_API_BASE_URL;
```

**`lib/og-api.ts`**:
```typescript
import { OG_FETCH_USER_AGENT } from '@/constants/api';

const response = await fetch(url, {
  headers: {
    'User-Agent': OG_FETCH_USER_AGENT,
  },
});
```

**`lib/utils/time.ts`** (after creating in Task #02):
```typescript
import { SECONDS_PER_HOUR, SECONDS_PER_DAY, SECONDS_PER_MINUTE } from '@/constants/time';

export function timeAgo(timestamp: number): string {
  const now = Date.now() / 1000;
  const diff = now - timestamp;

  if (diff < SECONDS_PER_HOUR) {
    return `${Math.floor(diff / SECONDS_PER_MINUTE)}m ago`;
  }
  if (diff < SECONDS_PER_DAY) {
    return `${Math.floor(diff / SECONDS_PER_HOUR)}h ago`;
  }
  return `${Math.floor(diff / SECONDS_PER_DAY)}d ago`;
}
```

**`components/story-list-screen.tsx`** (or individual tab screens):
```typescript
import { ANDROID_TAB_BAR_OFFSET, INFINITE_SCROLL_THRESHOLD, STORY_CARD_ESTIMATED_HEIGHT } from '@/constants/layout';

<FlashList
  estimatedItemSize={STORY_CARD_ESTIMATED_HEIGHT}
  contentContainerStyle={{
    paddingBottom: Platform.select({
      android: ANDROID_TAB_BAR_OFFSET + bottom,
      default: 0,
    }),
  }}
  onEndReachedThreshold={INFINITE_SCROLL_THRESHOLD}
  // ...
/>
```

**`components/link-preview.tsx`**:
```typescript
import { THUMBNAIL_SIZE } from '@/constants/layout';

const styles = StyleSheet.create({
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    // ...
  },
  thumbnailLoading: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    // ...
  },
});
```

## Files to Create

- `constants/layout.ts`
- `constants/api.ts`
- `constants/cache.ts`
- `constants/time.ts`

## Files to Modify

- `app/_layout.tsx`
- `hooks/use-stories.ts`
- `hooks/use-og-metadata.ts`
- `hooks/use-story.ts`
- `lib/hn-api.ts`
- `lib/og-api.ts`
- `lib/utils/time.ts`
- `components/story-list-screen.tsx` (or tab screens)
- `components/link-preview.tsx`

## Benefits

- Self-documenting code
- Easy to tune performance
- Single source of truth
- Type-safe constants
- Easy to find and change values
- Better IDE autocomplete

## Testing Checklist

- [ ] All functionality works as before
- [ ] Cache behavior unchanged
- [ ] Scroll behavior unchanged
- [ ] Build completes without errors
- [ ] No TypeScript errors
