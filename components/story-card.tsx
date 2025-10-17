import { useThemeColor } from '@/hooks/use-theme-color';
import { HNItem } from '@/lib/hn-api';
import { timeAgo } from '@/lib/utils/time';
import { getDomain } from '@/lib/utils/url';
import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { LinkPreview } from './link-preview';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

interface StoryCardProps {
  story: HNItem;
  index: number;
}

export function StoryCard({ story, index }: StoryCardProps) {
  const separatorColor = useThemeColor({}, 'border');

  return (
    <ThemedView style={[styles.container, { borderBottomColor: separatorColor }]}>
      <Link href={`/story/${story.id}`}>
        <Link.Trigger>
          <View style={styles.header}>
            {/* <ThemedText style={styles.index}>{index}.</ThemedText> */}
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
        </Link.Trigger>
        <Link.Preview />
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    gap: 8,
  },
  index: {
    fontSize: 14,
    opacity: 0.5,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
    marginBottom: 4,
  },
  domain: {
    fontSize: 13,
    opacity: 0.5,
    marginBottom: 4,
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metadataText: {
    fontSize: 13,
    opacity: 0.5,
  },
});
