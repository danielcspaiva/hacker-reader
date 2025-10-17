# Add React.memo to Components

**Priority**: Short Term (High Impact, Medium Effort)
**Category**: Performance
**Estimated Time**: 30 minutes

## Problem

Several components re-render unnecessarily when their parent updates:

1. **`StoryCard`** - Renders in FlashList, re-renders when:
   - Parent list state changes
   - Sibling items update
   - Infinite scroll triggers
   - Pull-to-refresh occurs

2. **`Comment`** - Recursive component that can have many instances:
   - Deep comment threads cause cascading re-renders
   - Collapsing one comment can re-render siblings
   - Parent story updates trigger all comment re-renders

3. **`LinkPreview`** - Expensive component with image loading:
   - Re-renders when parent card updates
   - Network requests may be duplicated

**Impact**:
- Wasted render cycles
- Slower scroll performance
- Unnecessary network requests
- Battery drain on mobile
- Janky UI on lower-end devices

## Solution

Wrap expensive components with `React.memo` to prevent unnecessary re-renders.

### Implementation Steps

#### 1. Add React.memo to StoryCard

**File**: `components/story-card.tsx`

```typescript
import { memo } from 'react';
import { useThemeColor } from '@/hooks/use-theme-color';
import { HNItem } from '@/lib/hn-api';
import { router } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinkPreview } from './link-preview';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

interface StoryCardProps {
  story: HNItem;
  index: number;
}

// Wrap with memo and provide display name
export const StoryCard = memo(function StoryCard({ story, index }: StoryCardProps) {
  const separatorColor = useThemeColor({}, 'border');

  const timeAgo = (timestamp: number) => {
    const now = Date.now() / 1000;
    const diff = now - timestamp;

    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const getDomain = (url?: string) => {
    if (!url) return null;
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return null;
    }
  };

  const handlePress = () => {
    router.push(`/story/${story.id}`);
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <ThemedView style={[styles.container, { borderBottomColor: separatorColor }]}>
        <View style={styles.header}>
          <ThemedText style={styles.index}>{index}.</ThemedText>
          <View style={styles.content}>
            <ThemedText style={styles.title} numberOfLines={3}>
              {story.title}
            </ThemedText>
            {getDomain(story.url) && (
              <ThemedText style={styles.domain}>({getDomain(story.url)})</ThemedText>
            )}
            <View style={styles.metadata}>
              <ThemedText style={styles.metadataText}>
                {story.score} points by {story.by}
              </ThemedText>
              <ThemedText style={styles.metadataText}> • </ThemedText>
              <ThemedText style={styles.metadataText}>
                {timeAgo(story.time || 0)}
              </ThemedText>
              <ThemedText style={styles.metadataText}> • </ThemedText>
              <ThemedText style={styles.metadataText}>
                {story.descendants || 0} comments
              </ThemedText>
            </View>
          </View>
          {story.url && <LinkPreview url={story.url} compact />}
        </View>
      </ThemedView>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  // ... existing styles ...
});
```

#### 2. Add React.memo to LinkPreview

**File**: `components/link-preview.tsx`

```typescript
import { memo } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useOGMetadata } from '@/hooks/use-og-metadata';

interface LinkPreviewProps {
  url: string;
  compact?: boolean;
}

export const LinkPreview = memo(function LinkPreview({ url, compact = false }: LinkPreviewProps) {
  const { data: metadata, isLoading } = useOGMetadata(url);
  const borderColor = useThemeColor({}, 'border');
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  // ... rest of component logic ...
});

const styles = StyleSheet.create({
  // ... existing styles ...
});
```

#### 3. Add React.memo to Comment Component

**File**: `app/story/[id].tsx`

```typescript
import { memo, useState } from 'react';
// ... other imports ...

// Extract Comment component and memoize it
const Comment = memo(function Comment({ commentId }: { commentId: number }) {
  const { data: comment, isLoading } = useComment(commentId);
  const [showReplies, setShowReplies] = useState(true);
  const borderColor = useThemeColor({}, 'border');
  const tintColor = useThemeColor({}, 'tint');

  if (isLoading) {
    return null;
  }

  if (!comment || comment.deleted || comment.dead) {
    return null;
  }

  // ... rest of Comment logic ...

  return (
    <View style={[styles.comment, { borderLeftColor: borderColor }]}>
      {/* ... component JSX ... */}
    </View>
  );
});

export default function StoryDetailScreen() {
  // ... rest of screen logic ...
}
```

#### 4. Optional: Add Memoization to Themed Components

If these components cause performance issues:

**`components/themed-text.tsx`**:
```typescript
import { memo } from 'react';

export const ThemedText = memo(function ThemedText({
  style,
  lightColor,
  darkColor,
  ...rest
}: ThemedTextProps) {
  // ... existing logic ...
});
```

**`components/themed-view.tsx`**:
```typescript
import { memo } from 'react';

export const ThemedView = memo(function ThemedView({
  style,
  lightColor,
  darkColor,
  ...rest
}: ThemedViewProps) {
  // ... existing logic ...
});
```

## Understanding React.memo

React.memo performs a **shallow comparison** of props. It only re-renders when props change.

**Works well with**:
- Primitive props (strings, numbers, booleans)
- Stable object references (from useMemo, useState)
- Callbacks wrapped in useCallback

**May not help if**:
- Props are new objects every render
- Parent creates new inline functions
- Props change frequently anyway

## Custom Comparison Function (If Needed)

If default shallow comparison isn't enough:

```typescript
export const StoryCard = memo(
  function StoryCard({ story, index }: StoryCardProps) {
    // ... component logic ...
  },
  (prevProps, nextProps) => {
    // Return true if props are equal (skip re-render)
    return (
      prevProps.story.id === nextProps.story.id &&
      prevProps.index === nextProps.index
    );
  }
);
```

## Files to Modify

- `components/story-card.tsx`
- `components/link-preview.tsx`
- `app/story/[id].tsx`
- Optional: `components/themed-text.tsx`
- Optional: `components/themed-view.tsx`

## Measuring Performance Impact

Use React DevTools Profiler:

1. **Before memo**: Profile scrolling through story list
2. **After memo**: Profile same action
3. **Compare**:
   - Render count
   - Render duration
   - Commits count

Expected improvements:
- 50-70% fewer renders on scroll
- Faster comment tree updates
- Smoother infinite scroll

## Testing Checklist

- [ ] Story cards render correctly
- [ ] Story cards respond to taps
- [ ] Link previews load and display
- [ ] Comments expand/collapse
- [ ] Comment links work
- [ ] Pull-to-refresh works
- [ ] Infinite scroll works
- [ ] No visual regressions
- [ ] Performance improved (check with Profiler)

## Potential Issues & Solutions

**Issue**: StoryCard doesn't update when expected
**Solution**: Check that story object reference changes when data updates

**Issue**: Comment doesn't re-render when it should
**Solution**: Verify React Query cache is updating correctly

**Issue**: Theme changes don't update memoized components
**Solution**: Theme color hooks should trigger re-renders automatically via context

## Additional Optimizations

If needed, add useCallback for event handlers:

```typescript
const handlePress = useCallback(() => {
  router.push(`/story/${story.id}`);
}, [story.id]);
```

And useMemo for expensive computations:

```typescript
const domain = useMemo(() => getDomain(story.url), [story.url]);
const relativeTime = useMemo(() => timeAgo(story.time || 0), [story.time]);
```
