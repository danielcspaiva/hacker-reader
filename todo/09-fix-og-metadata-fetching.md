# Fix OG Metadata Fetching

**Status**: ✅ COMPLETED
**Priority**: Short Term (High Impact, Medium Effort)
**Category**: Performance / Reliability
**Estimated Time**: 1-2 hours

## Implementation Summary

Implemented Option 3 (Improve Current Implementation) with the following enhancements:

### Changes Made

1. **Added Timeout Handling** ([lib/og-api.ts](lib/og-api.ts)):
   - 5 second timeout for all fetch requests
   - Proper AbortController usage with cleanup

2. **Added Request Cancellation Support**:
   - `fetchOGMetadata` now accepts optional `signal` parameter
   - Chains abort signals to support React Query cancellation
   - [hooks/use-og-metadata.ts](hooks/use-og-metadata.ts) passes abort signal from React Query

3. **Limited Response Size**:
   - Only reads first 50KB of response to avoid huge downloads
   - Uses blob slicing to truncate large responses

4. **Optimized HTML Parsing**:
   - Extracts only `<head>` section for parsing
   - Falls back to full response if head not found

5. **Better Error Handling**:
   - Distinguishes between abort/timeout and other errors
   - All errors return null gracefully (no crashes)
   - Dev-only logging with `__DEV__` checks

### Benefits Achieved

- ✅ Request timeout (5s) prevents indefinite hangs
- ✅ Request cancellation when component unmounts
- ✅ Response size limiting prevents excessive bandwidth usage
- ✅ Better performance with head-only parsing
- ✅ Graceful error handling (no crashes)
- ✅ Dev-friendly logging

### Notes

This implementation improves reliability and performance of the current direct-fetch approach. For production at scale, consider migrating to:
- **Option 1**: Microlink.io or similar OG scraping service (solves CORS for web)
- **Option 2**: Self-hosted serverless function (full control, no rate limits)

## Problem

Current OG metadata fetching in `lib/og-api.ts` has several critical issues:

### 1. **CORS Issues**
- Direct `fetch(url)` will fail in web browsers due to CORS
- External websites don't set CORS headers for random apps
- **Impact**: Link previews don't work on web platform

### 2. **Performance Issues**
- Fetches entire HTML page (can be MBs of data)
- Only needs `<head>` section with meta tags
- Wastes bandwidth and time
- **Impact**: Slow loading, data usage

### 3. **No Timeout**
- Fetch can hang indefinitely
- No timeout on slow/unresponsive servers
- **Impact**: App freezes waiting for response

### 4. **Fragile HTML Parsing**
- Uses regex to parse HTML (brittle)
- Doesn't handle all edge cases
- Can fail on malformed HTML
- **Impact**: Unpredictable failures

### 5. **No Request Cancellation**
- Doesn't cancel fetch when component unmounts
- Continues fetching even after user navigates away
- **Impact**: Memory leaks, wasted bandwidth

## Solutions

### Option 1: Use OG Scraping Service (Recommended)

Use a dedicated service that handles CORS, parsing, and caching.

**Services**:
- **microlink.io** - Free tier, 50 req/day
- **urlbox.io** - Screenshot + metadata
- **opengraph.io** - Dedicated OG scraping
- **Custom serverless function** - Full control

#### Implementation with Microlink.io

**File**: `lib/og-api.ts`

```typescript
export interface OGMetadata {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  siteName?: string;
}

const MICROLINK_API = 'https://api.microlink.io';
const TIMEOUT_MS = 5000; // 5 second timeout

export async function fetchOGMetadata(url: string): Promise<OGMetadata | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    if (__DEV__) {
      console.log('[OG] Fetching metadata for:', url);
    }

    const microlinkUrl = `${MICROLINK_API}?url=${encodeURIComponent(url)}&meta=false&screenshot=false&video=false&audio=false&palette=false`;

    const response = await fetch(microlinkUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (__DEV__) {
        console.log('[OG] Response not ok:', response.status);
      }
      return null;
    }

    const data = await response.json();

    if (!data.status === 'success' || !data.data) {
      if (__DEV__) {
        console.log('[OG] Invalid response data');
      }
      return null;
    }

    const { title, description, image, logo } = data.data;

    // Only return if we have at least an image
    if (!image?.url && !logo?.url) {
      if (__DEV__) {
        console.log('[OG] No image found');
      }
      return null;
    }

    return {
      title: title || undefined,
      description: description || undefined,
      image: image?.url || logo?.url || undefined,
      url,
      siteName: data.data.publisher || undefined,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      if (__DEV__) {
        console.log('[OG] Request timeout');
      }
      return null;
    }

    if (__DEV__) {
      console.error('[OG] Failed to fetch OG metadata:', error);
    }
    return null;
  }
}
```

**Pros**:
- ✅ Solves CORS issues
- ✅ Fast and optimized
- ✅ Handles caching
- ✅ Reliable parsing
- ✅ Free tier available

**Cons**:
- ❌ External dependency
- ❌ Rate limits (50/day on free tier)
- ❌ Privacy considerations (shares URLs)

### Option 2: Serverless Function (Self-Hosted)

Create your own metadata scraping endpoint.

**File**: `api/og-metadata.ts` (Vercel/Netlify Functions)

```typescript
import { parse } from 'node-html-parser';

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parameter required' });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HNClient/1.0)',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch' });
    }

    const html = await response.text();
    const root = parse(html);

    const getMeta = (property: string) => {
      const tag = root.querySelector(`meta[property="${property}"], meta[name="${property}"]`);
      return tag?.getAttribute('content') || undefined;
    };

    const ogImage = getMeta('og:image');
    const ogTitle = getMeta('og:title');
    const ogDescription = getMeta('og:description');
    const ogSiteName = getMeta('og:site_name');

    const metadata = {
      title: ogTitle || getMeta('twitter:title'),
      description: ogDescription || getMeta('twitter:description') || getMeta('description'),
      image: ogImage || getMeta('twitter:image'),
      siteName: ogSiteName,
      url,
    };

    // Cache for 1 hour
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).json(metadata);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

Then update client:

```typescript
export async function fetchOGMetadata(url: string): Promise<OGMetadata | null> {
  const apiUrl = `${process.env.EXPO_PUBLIC_API_URL}/api/og-metadata?url=${encodeURIComponent(url)}`;
  // ... fetch from your API
}
```

**Pros**:
- ✅ Full control
- ✅ No rate limits
- ✅ Privacy-friendly
- ✅ Custom caching

**Cons**:
- ❌ Need to deploy/maintain
- ❌ Server costs
- ❌ More complex setup

### Option 3: Improve Current Implementation

If you must keep direct fetching (not recommended for production):

**File**: `lib/og-api.ts`

```typescript
import { parse } from 'node-html-parser'; // Note: This won't work in React Native without polyfills

const TIMEOUT_MS = 5000;

export async function fetchOGMetadata(
  url: string,
  signal?: AbortSignal
): Promise<OGMetadata | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  // Chain the abort signals
  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  try {
    if (__DEV__) {
      console.log('[OG] Fetching metadata for:', url);
    }

    // Add timeout to fetch
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HNClient/1.0)',
        // Only request HTML head (some servers support Range header)
        'Range': 'bytes=0-4096',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (__DEV__) {
        console.log('[OG] Response not ok:', response.status);
      }
      return null;
    }

    // Only read first 50KB to avoid huge downloads
    const blob = await response.blob();
    if (blob.size > 50000) {
      if (__DEV__) {
        console.log('[OG] Response too large, truncating');
      }
    }

    const text = await blob.slice(0, 50000).text();

    // Extract just the head section
    const headMatch = text.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    const headContent = headMatch ? headMatch[1] : text;

    // ... rest of parsing logic ...

    return metadata;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      if (__DEV__) {
        console.log('[OG] Request aborted or timeout');
      }
      return null;
    }

    if (__DEV__) {
      console.error('[OG] Failed to fetch OG metadata:', error);
    }
    return null;
  }
}
```

Update hook to support cancellation:

**File**: `hooks/use-og-metadata.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { fetchOGMetadata, OGMetadata } from '@/lib/og-api';

export function useOGMetadata(url?: string) {
  return useQuery<OGMetadata | null, Error>({
    queryKey: ['og-metadata', url],
    queryFn: ({ signal }) => (url ? fetchOGMetadata(url, signal) : Promise.resolve(null)),
    enabled: !!url,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
}
```

## Recommendation

**For production**: Use **Option 1** (Microlink.io) or **Option 2** (serverless function)
**For MVP/testing**: Improve current implementation with **Option 3**

## Implementation Steps (Using Microlink)

1. Update `lib/og-api.ts` with Microlink implementation
2. Update `hooks/use-og-metadata.ts` to pass abort signal
3. Test with various URLs
4. Monitor rate limits
5. Consider upgrading to paid plan or self-hosting if needed

## Files to Modify

- `lib/og-api.ts`
- `hooks/use-og-metadata.ts`

## Benefits

- ✅ Works on all platforms (including web)
- ✅ Faster metadata fetching
- ✅ More reliable parsing
- ✅ Proper timeout handling
- ✅ Request cancellation
- ✅ Better error handling

## Testing Checklist

- [ ] Link previews load on iOS
- [ ] Link previews load on Android
- [ ] Link previews load on web
- [ ] Timeout works (test with slow server)
- [ ] Request cancellation works (navigate away quickly)
- [ ] Error handling works (test with invalid URLs)
- [ ] Rate limits respected
- [ ] Loading states display correctly
- [ ] Failed fetches don't crash app

## Environment Variables (If Using API)

Add to `.env`:

```bash
EXPO_PUBLIC_MICROLINK_API_KEY=your_api_key_here # If using paid tier
EXPO_PUBLIC_API_URL=https://your-api.vercel.app # If self-hosting
```

## Cost Considerations

**Microlink.io Free Tier**:
- 50 requests/day
- Perfect for development
- May need paid tier for production

**Paid Tier** ($9-49/mo):
- 10,000-100,000 requests/month
- Better for production

**Self-Hosted**:
- Free (minus server costs)
- Unlimited requests
- Full control
