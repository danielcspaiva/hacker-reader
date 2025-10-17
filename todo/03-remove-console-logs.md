# Remove/Guard Console Logs

**Priority**: Immediate (High Impact, Low Effort)
**Category**: Best Practices / Security
**Estimated Time**: 10 minutes

## Problem

The `lib/og-api.ts` file contains 5+ console.log statements in production code:

```typescript
console.log('[OG] Fetching metadata for:', url);
console.log('[OG] Response not ok:', response.status);
console.log('[OG] Fetched HTML length:', html.length);
console.log('[OG] Extracted - title:', title, 'image:', image);
console.log('[OG] No image found, returning null');
console.error('[OG] Failed to fetch OG metadata:', error);
```

**Issues**:
- Pollutes production console logs
- May expose sensitive URLs or user data
- Performance impact (minimal but measurable)
- Not configurable (always on)
- Unprofessional in production apps

## Solution

Guard console logs with `__DEV__` flag or create a debug utility.

### Option 1: Simple __DEV__ Guards (Recommended)

Update `lib/og-api.ts`:

```typescript
export async function fetchOGMetadata(url: string): Promise<OGMetadata | null> {
  try {
    if (__DEV__) {
      console.log('[OG] Fetching metadata for:', url);
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HNClient/1.0)',
      },
    });

    if (!response.ok) {
      if (__DEV__) {
        console.log('[OG] Response not ok:', response.status);
      }
      return null;
    }

    const html = await response.text();
    if (__DEV__) {
      console.log('[OG] Fetched HTML length:', html.length);
    }

    // Extract OpenGraph meta tags
    const ogImage = extractMetaTag(html, 'og:image');
    const ogTitle = extractMetaTag(html, 'og:title');
    const ogDescription = extractMetaTag(html, 'og:description');
    const ogSiteName = extractMetaTag(html, 'og:site_name');

    const title = ogTitle || extractMetaTag(html, 'twitter:title');
    const description = ogDescription || extractMetaTag(html, 'twitter:description') || extractMetaTag(html, 'description');
    const image = ogImage || extractMetaTag(html, 'twitter:image');

    if (__DEV__) {
      console.log('[OG] Extracted - title:', title, 'image:', image);
    }

    if (!image) {
      if (__DEV__) {
        console.log('[OG] No image found, returning null');
      }
      return null;
    }

    return {
      title: title || undefined,
      description: description || undefined,
      image: image || undefined,
      url,
      siteName: ogSiteName || undefined,
    };
  } catch (error) {
    if (__DEV__) {
      console.error('[OG] Failed to fetch OG metadata:', error);
    }
    return null;
  }
}
```

### Option 2: Debug Logger Utility (More Scalable)

Create `lib/utils/logger.ts`:

```typescript
type LogLevel = 'log' | 'warn' | 'error' | 'info';

class Logger {
  private enabled = __DEV__;

  log(...args: unknown[]) {
    if (this.enabled) {
      console.log(...args);
    }
  }

  warn(...args: unknown[]) {
    if (this.enabled) {
      console.warn(...args);
    }
  }

  error(...args: unknown[]) {
    if (this.enabled) {
      console.error(...args);
    }
  }

  info(...args: unknown[]) {
    if (this.enabled) {
      console.info(...args);
    }
  }
}

export const logger = new Logger();
```

Then in `lib/og-api.ts`:

```typescript
import { logger } from '@/lib/utils/logger';

export async function fetchOGMetadata(url: string): Promise<OGMetadata | null> {
  try {
    logger.log('[OG] Fetching metadata for:', url);
    // ... rest of code using logger.log, logger.error, etc.
  }
}
```

## Recommendation

Use **Option 1** for immediate fix (5 minutes).
Consider **Option 2** for future scalability if more debug logging is needed.

## Files to Modify

- `lib/og-api.ts`
- Optional: Create `lib/utils/logger.ts`

## Benefits

- Clean production console
- No exposed URLs/data in production
- Maintains debug capability in development
- Professional code quality
- Easy to extend with log levels later

## Testing Checklist

- [ ] Run app in development mode - logs should appear
- [ ] Build production bundle - verify logs don't appear
- [ ] OG metadata still fetches correctly
- [ ] Error handling still works
