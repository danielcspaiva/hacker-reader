import { StoryCard } from '@/components/story-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useShowStories } from '@/hooks/use-stories';
import { useThemeColor } from '@/hooks/use-theme-color';
import { FlashList } from '@shopify/flash-list';
import { Stack } from 'expo-router';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ShowStoriesScreen() {
  const { data: stories = [], isLoading, isRefetching, refetch } = useShowStories(30);

  const { bottom } = useSafeAreaInsets();
  const textColor = useThemeColor({}, 'text');

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Show HN' }} />
        <ThemedView style={styles.centered}>
          <ActivityIndicator size="large" color={textColor} />
        </ThemedView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Show HN' }} />
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
        ListEmptyComponent={
          <View style={styles.centered}>
            <ThemedText>No stories found</ThemedText>
          </View>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
