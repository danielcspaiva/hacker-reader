import { FlatList, StyleSheet, RefreshControl, ActivityIndicator, View, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { StoryCard } from '@/components/story-card';
import { useNewStories } from '@/hooks/use-stories';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NewStoriesScreen() {
  const { data: stories = [], isLoading, isRefetching, refetch } = useNewStories(30);

  const { bottom } = useSafeAreaInsets();
  const textColor = useThemeColor({}, 'text');

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'New Stories' }} />
        <ThemedView style={styles.centered}>
          <ActivityIndicator size="large" color={textColor} />
        </ThemedView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'New Stories' }} />
      <ThemedView style={styles.container}>
          <FlatList
            data={stories}
            keyExtractor={(item) => item.id.toString()}
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={{
              paddingBottom: Platform.select({
                android: 100 + bottom,
                default: 0,
              }),
            }}
            renderItem={({ item, index }) => <StoryCard story={item} index={index + 1} />}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={() => refetch()}
                tintColor={textColor}
              />
            }
            ListEmptyComponent={
              <View style={styles.centered}>
                <ThemedText>No stories found</ThemedText>
              </View>
            }
          />
      </ThemedView>
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
