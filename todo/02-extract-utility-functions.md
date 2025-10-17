# Extract Utility Functions

**Status**: ✅ COMPLETED
**Priority**: Immediate (High Impact, Low Effort)
**Category**: Code Duplication
**Estimated Time**: 20-30 minutes
**Actual Time**: ~15 minutes

## Problem

Several utility functions are duplicated across multiple files:

1. **`timeAgo` function** - Duplicated 3 times:
   - `components/story-card.tsx`
   - `app/story/[id].tsx` (2 instances - one in component, one in Comment)

2. **`parseHTMLWithLinks` function** - Duplicated 2 times:
   - `app/story/[id].tsx` (2 instances - ~100 lines total)

3. **`getDomain` function** - Only in `story-card.tsx` but could be useful elsewhere

This duplication causes:
- Inconsistent behavior if one implementation changes
- More code to maintain
- Harder to write tests (need to test each copy)

## Solution

Extract these functions into utility modules under `lib/utils/`.

### Implementation Steps

#### 1. Create `lib/utils/time.ts`

```typescript
/**
 * Converts a Unix timestamp to a human-readable relative time string
 * @param timestamp Unix timestamp in seconds
 * @returns Formatted string like "2m ago", "3h ago", "5d ago"
 */
export function timeAgo(timestamp: number): string {
  const now = Date.now() / 1000;
  const diff = now - timestamp;

  if (diff < 3600) {
    return `${Math.floor(diff / 60)}m ago`;
  }
  if (diff < 86400) {
    return `${Math.floor(diff / 3600)}h ago`;
  }
  return `${Math.floor(diff / 86400)}d ago`;
}
```

#### 2. Create `lib/utils/html.ts`

```typescript
interface ParsedHTMLPart {
  type: 'text' | 'link';
  content: string;
  url?: string;
}

/**
 * Decodes HTML entities to their character equivalents
 */
function decodeEntities(text: string): string {
  return text
    .replace(/&#x2F;/g, '/')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

/**
 * Parses HTML string and extracts text and links into structured parts
 * Handles HN comment/story HTML format with <p> tags and <a> tags
 * @param html Raw HTML string from HN API
 * @returns Array of parsed parts (text and links) or null if no HTML
 */
export function parseHTMLWithLinks(html?: string): ParsedHTMLPart[] | null {
  if (!html) return null;

  // Replace paragraph tags with newlines
  let processed = html
    .replace(/<p>/g, '\n\n')
    .replace(/<\/p>/g, '')
    .replace(/<i>/g, '')
    .replace(/<\/i>/g, '');

  // Match <a href="url">text</a> patterns
  const linkRegex = /<a\s+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/g;
  const parts: ParsedHTMLPart[] = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(processed)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      const textBefore = decodeEntities(processed.substring(lastIndex, match.index));
      if (textBefore) {
        parts.push({ type: 'text', content: textBefore });
      }
    }

    // Add the link
    parts.push({
      type: 'link',
      content: decodeEntities(match[2]),
      url: decodeEntities(match[1]),
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < processed.length) {
    const textAfter = decodeEntities(processed.substring(lastIndex));
    if (textAfter) {
      parts.push({ type: 'text', content: textAfter });
    }
  }

  return parts;
}
```

#### 3. Create `lib/utils/url.ts`

```typescript
/**
 * Extracts the domain from a URL, removing 'www.' prefix
 * @param url Full URL string
 * @returns Domain name or null if invalid URL
 */
export function getDomain(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return null;
  }
}
```

#### 4. Update `components/story-card.tsx`

```typescript
import { timeAgo } from '@/lib/utils/time';
import { getDomain } from '@/lib/utils/url';

// Remove local implementations, use imported functions
```

#### 5. Update `app/story/[id].tsx`

```typescript
import { timeAgo } from '@/lib/utils/time';
import { parseHTMLWithLinks } from '@/lib/utils/html';

// Remove local implementations, use imported functions
// Update Comment component to use imported functions
```

## Files Modified

- ✅ Created: `lib/utils/time.ts`
- ✅ Created: `lib/utils/html.ts`
- ✅ Created: `lib/utils/url.ts`
- ✅ Modified: `components/story-card.tsx`
- ✅ Modified: `app/story/[id].tsx`

## Benefits

- Reduces code duplication by ~150 lines
- Single source of truth for each utility
- Easier to test (test once, use everywhere)
- Can add more sophisticated logic later (e.g., "just now", "yesterday")
- Reusable across the app

## Testing Checklist

**Note**: Manual testing recommended to verify all functionality still works correctly.

- [ ] Story cards display correct time formatting
- [ ] Story detail page displays correct time formatting
- [ ] Comments display correct time formatting
- [ ] HTML links render and are clickable
- [ ] HTML entities decode correctly (&amp;, &quot;, etc.)
- [ ] Domain extraction works for various URL formats
- [ ] Edge cases handled (undefined/null inputs)

## Implementation Summary

Successfully extracted all duplicate utility functions into centralized modules:

1. **`timeAgo`** - Now shared from `lib/utils/time.ts` (removed 3 duplicate implementations)
2. **`parseHTMLWithLinks`** - Now shared from `lib/utils/html.ts` (removed 2 duplicate implementations, ~100 lines)
3. **`getDomain`** - Extracted to `lib/utils/url.ts` for reusability

Total code reduction: ~150 lines of duplicated code eliminated.
