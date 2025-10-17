# Extract Story List Screen Component

**Priority**: Immediate (High Impact, Low Effort)
**Category**: Code Duplication
**Estimated Time**: 30-45 minutes

## Problem

All 5 tab screens (`app/(tabs)/top/index.tsx`, `new/index.tsx`, `ask/index.tsx`, `show/index.tsx`, `jobs/index.tsx`) contain ~93 lines of **identical code**. The only differences are:
- The hook being called (`useTopStories` vs `useNewStories`, etc.)
- The screen title (`"Top Stories"` vs `"New Stories"`, etc.)

This results in:
- ~400 lines of duplicated code
- Bug fixes requiring 5x repetition
- Difficult to maintain consistency
- Higher chance of bugs/regressions

## Solution

Create a reusable `StoryListScreen` component that accepts the hook and title as props.

### Implementation Steps

1. **Create `components/story-list-screen.tsx`**:
```typescript
import { StoryCard } from '@/components/story-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { HNItem } from '@/lib/hn-api';
import { useThemeColor } from '@/hooks/use-theme-color';
import { FlashList } from '@shopify/flash-list';
import { Stack } from 'expo-router';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemo } from 'react';
import { UseInfiniteQueryResult } from '@tanstack/react-query';

interface StoryListScreenProps {
  title: string;
  useStoriesHook: () => UseInfiniteQueryResult<HNItem[], Error>;
}

export function StoryListScreen({ title, useStoriesHook }: StoryListScreenProps) {
  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useStoriesHook();

  const stories = useMemo(() => data?.pages.flatMap((page) => page) ?? [], [data]);

  const { bottom } = useSafeAreaInsets();
  const textColor = useThemeColor({}, 'text');

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title, headerShown: true }} />
        <ThemedView style={styles.centered}>
          <ActivityIndicator size="large" color={textColor} />
        </ThemedView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title, headerShown: true }} />
      <FlashList
        data={stories}
        renderItem={({ item, index }) => (
          <StoryCard story={item} index={index + 1} />
        )}
        keyExtractor={(item) => item.id.toString()}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingBottom: Platform.select({
            android: 100 + bottom,
            default: 0,
          }),
        }}
        onRefresh={() => refetch()}
        refreshing={isRefetching}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.centered}>
            <ThemedText>No stories found</ThemedText>
          </View>
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={textColor} />
            </View>
          ) : null
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
```

2. **Update each tab screen** to use the new component:

```typescript
// app/(tabs)/top/index.tsx
import { StoryListScreen } from '@/components/story-list-screen';
import { useTopStories } from '@/hooks/use-stories';

export default function TopStoriesScreen() {
  return <StoryListScreen title="Top Stories" useStoriesHook={useTopStories} />;
}
```

```typescript
// app/(tabs)/new/index.tsx
import { StoryListScreen } from '@/components/story-list-screen';
import { useNewStories } from '@/hooks/use-stories';

export default function NewStoriesScreen() {
  return <StoryListScreen title="New Stories" useStoriesHook={useNewStories} />;
}
```

```typescript
// app/(tabs)/ask/index.tsx
import { StoryListScreen } from '@/components/story-list-screen';
import { useAskStories } from '@/hooks/use-stories';

export default function AskStoriesScreen() {
  return <StoryListScreen title="Ask HN" useStoriesHook={useAskStories} />;
}
```

```typescript
// app/(tabs)/show/index.tsx
import { StoryListScreen } from '@/components/story-list-screen';
import { useShowStories } from '@/hooks/use-stories';

export default function ShowStoriesScreen() {
  return <StoryListScreen title="Show HN" useStoriesHook={useShowStories} />;
}
```

```typescript
// app/(tabs)/jobs/index.tsx
import { StoryListScreen } from '@/components/story-list-screen';
import { useJobStories } from '@/hooks/use-stories';

export default function JobStoriesScreen() {
  return <StoryListScreen title="Jobs" useStoriesHook={useJobStories} />;
}
```

## Benefits

- Reduces codebase by ~350 lines
- Single source of truth for story list logic
- Bug fixes only need to be made once
- Easier to add new features (pull-to-refresh improvements, search, filters, etc.)
- Type-safe with TypeScript

## Testing Checklist

- [ ] All 5 tabs still load and display stories
- [ ] Infinite scrolling works on all tabs
- [ ] Pull-to-refresh works on all tabs
- [ ] Loading states display correctly
- [ ] Error states work (test by disconnecting network)
- [ ] Android tab bar padding still correct

## Status

✅ **COMPLETED**

**Implementation Details:**
- Created `components/story-list-screen.tsx` with proper TypeScript types (`InfiniteData<HNItem[], unknown>`)
- Updated all 5 tab screens to use the new component
- Reduced each tab file from ~93-103 lines to just 6 lines
- Total code reduction: ~450 lines eliminated
- TypeScript compilation: ✅ Passing
- ESLint: ✅ Passing

**Files Modified:**
- ✅ `components/story-list-screen.tsx` (created)
- ✅ `app/(tabs)/top/index.tsx`
- ✅ `app/(tabs)/new/index.tsx`
- ✅ `app/(tabs)/ask/index.tsx`
- ✅ `app/(tabs)/show/index.tsx`
- ✅ `app/(tabs)/jobs/index.tsx`
