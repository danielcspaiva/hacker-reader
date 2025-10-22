import { StoryCard } from '@/components/story-card';
import { ThemedText } from '@/components/themed-text';
import {
  useAskStories,
  useJobStories,
  useNewStories,
  useShowStories,
  useTopStories,
} from '@/hooks/use-stories';
import { useThemeColor } from '@/hooks/use-theme-color';
import { HNItem } from '@/lib/hn-api';
import { Button, ContextMenu, Host } from '@expo/ui/swift-ui';
import { FlashList } from '@shopify/flash-list';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SFSymbol } from 'sf-symbols-typescript';

type Category = 'top' | 'new' | 'ask' | 'show' | 'jobs';

const CATEGORY_LABELS: Record<Category, string> = {
  top: 'Top Stories',
  new: 'New Stories',
  ask: 'Ask HN',
  show: 'Show HN',
  jobs: 'Jobs',
};

const CATEGORY_ICONS: Record<Category, SFSymbol> = {
  top: 'flame.fill',
  new: 'clock.fill',
  ask: 'questionmark.circle.fill',
  show: 'eye.fill',
  jobs: 'briefcase.fill',
};

export default function FeedScreen() {
  const [category, setCategory] = useState<Category>('top');

  // Call all hooks unconditionally at the top level
  const topStories = useTopStories();
  const newStories = useNewStories();
  const askStories = useAskStories();
  const showStories = useShowStories();
  const jobStories = useJobStories();

  // Select the appropriate query result based on category
  const queryResult = {
    top: topStories,
    new: newStories,
    ask: askStories,
    show: showStories,
    jobs: jobStories,
  }[category];

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = queryResult;

  const stories = data?.pages.flatMap((page) => page) ?? [];

  const { bottom } = useSafeAreaInsets();
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: CATEGORY_LABELS[category],
            headerShown: true,
            headerRight: () => <CategoryMenu category={category} onSelect={setCategory} />,
          }}
        />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={textColor} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: CATEGORY_LABELS[category],
          headerShown: true,
          headerRight: () => <CategoryMenu category={category} onSelect={setCategory} />,
        }}
      />
      <FlashList<HNItem>
        data={stories}
        renderItem={({ item, index }) => <StoryCard story={item} index={index + 1} />}
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

function CategoryMenu({
  category,
  onSelect,
}: {
  category: Category;
  onSelect: (category: Category) => void;
}) {
  const categories = Object.keys(CATEGORY_LABELS) as Category[];

  return (
    <Host style={{ width: 36, height: 36 }}>
      <ContextMenu>
        <ContextMenu.Items>
          {categories.map((cat) => (
            <Button
              key={cat}
              systemImage={cat === category ? 'checkmark' : CATEGORY_ICONS[cat]}
              onPress={() => onSelect(cat)}
            >
              {CATEGORY_LABELS[cat]}
            </Button>
          ))}
        </ContextMenu.Items>
        <ContextMenu.Trigger>
          <Button variant="plain" systemImage={CATEGORY_ICONS[category]} />
        </ContextMenu.Trigger>
      </ContextMenu>
    </Host>
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
  menuButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
