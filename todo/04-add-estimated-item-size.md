# Add estimatedItemSize to FlashList

**Priority**: Immediate (High Impact, Low Effort)
**Category**: Performance
**Estimated Time**: 5 minutes

## Problem

The `FlashList` component is used in all story list screens but doesn't specify the `estimatedItemSize` prop.

From FlashList documentation:
> FlashList works best when you provide `estimatedItemSize`. Without it, the list has to measure items which can impact initial render performance and scroll behavior.

**Current issues**:
- Potentially slower initial render
- Scroll position jumping
- Over-rendering of items
- Inefficient memory usage

## Solution

Add `estimatedItemSize` prop to all FlashList instances with an approximate item height.

### Implementation Steps

#### 1. Measure StoryCard Height

The StoryCard component has:
- Vertical padding: 12px top + 12px bottom = 24px
- Title (3 lines max): ~66px (22px line height × 3)
- Domain: ~17px
- Metadata: ~18px (13px + spacing)
- Border: hairline
- **Total: ~125-130px approximately**

Account for variation (some have link previews, some don't):
- Base card: ~125px
- With thumbnail: ~130px (slightly taller due to flex alignment)

**Recommended value: 120px** (slightly under-estimated is better than over)

#### 2. Update StoryListScreen Component

If using the refactored component from Task #01:

```typescript
// components/story-list-screen.tsx

export function StoryListScreen({ title, useStoriesHook }: StoryListScreenProps) {
  // ... existing code ...

  return (
    <>
      <Stack.Screen options={{ title, headerShown: true }} />
      <FlashList
        data={stories}
        estimatedItemSize={120} // Add this line
        renderItem={({ item, index }) => (
          <StoryCard story={item} index={index + 1} />
        )}
        // ... rest of props ...
      />
    </>
  );
}
```

#### 3. Or Update Individual Tab Screens

If not yet refactored, update each file:

```typescript
// app/(tabs)/top/index.tsx
// app/(tabs)/new/index.tsx
// app/(tabs)/ask/index.tsx
// app/(tabs)/show/index.tsx
// app/(tabs)/jobs/index.tsx

<FlashList
  data={stories}
  estimatedItemSize={120} // Add this line
  renderItem={({ item, index }) => (
    <StoryCard story={item} index={index + 1} />
  )}
  // ... rest of props ...
/>
```

## Alternative: Use getItemType for Dynamic Heights

For even better performance with mixed content:

```typescript
<FlashList
  data={stories}
  estimatedItemSize={120}
  getItemType={(item) => {
    // Different types can have different estimated sizes
    return item.url ? 'with-url' : 'text-only';
  }}
  // ... rest of props ...
/>
```

## Files to Modify

- `components/story-list-screen.tsx` (if using refactored version)
- OR `app/(tabs)/*/index.tsx` (all 5 tab screens)

## Benefits

- Better initial render performance
- Smoother scrolling
- Fewer blank items during scroll
- More accurate scroll indicators
- Reduced over-rendering

## Performance Metrics to Check

Before/After comparison:
- Initial render time
- Scroll smoothness (FPS)
- Memory usage during long scrolls
- Blank items during fast scroll

## Testing Checklist

- [ ] Scroll smoothly through long lists
- [ ] Fast scroll doesn't show excessive blank items
- [ ] Scroll position maintains correctly
- [ ] Pull-to-refresh still works
- [ ] Infinite scroll still triggers correctly
- [ ] No visual regressions

## Additional Optimization (Future)

Consider adding `overrideItemLayout` for even more precise control:

```typescript
<FlashList
  estimatedItemSize={120}
  overrideItemLayout={(layout, item) => {
    // Provide exact size if known
    layout.size = item.url ? 130 : 110;
  }}
/>
```
