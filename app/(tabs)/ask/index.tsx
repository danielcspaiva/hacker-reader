import { useState, useEffect } from 'react';
import { FlatList, StyleSheet, RefreshControl, ActivityIndicator, View, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { StoryCard } from '@/components/story-card';
import { getAskStories, getItems, HNItem } from '@/lib/hn-api';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AskStoriesScreen() {
  const [stories, setStories] = useState<HNItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { bottom } = useSafeAreaInsets();
  const textColor = useThemeColor({}, 'text');

  const loadStories = async () => {
    try {
      const ids = await getAskStories(30);
      const items = await getItems(ids);
      setStories(items);
    } catch (error) {
      console.error('Failed to load stories:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStories();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadStories();
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Ask HN' }} />
        <ThemedView style={styles.centered}>
          <ActivityIndicator size="large" color={textColor} />
        </ThemedView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Ask HN' }} />
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
                refreshing={refreshing}
                onRefresh={onRefresh}
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
