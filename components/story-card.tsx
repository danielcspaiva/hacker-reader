import { useBookmarkMutation, useIsBookmarked } from '@/hooks/use-bookmarks';
import { useThemeColor } from '@/hooks/use-theme-color';
import { HNItem } from '@/lib/hn-api';
import { timeAgo } from '@/lib/utils/time';
import { getDomain } from '@/lib/utils/url';
import { Link } from 'expo-router';
import { Platform, Share, StyleSheet, View } from 'react-native';
import { LinkPreview } from './link-preview';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { IconSymbol } from './ui/icon-symbol';

interface StoryCardProps {
  story: HNItem;
  index: number;
}

export function StoryCard({ story, index }: StoryCardProps) {
  const separatorColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const { data: isBookmarked = false } = useIsBookmarked(story.id);
  const bookmarkMutation = useBookmarkMutation();

  const handleBookmark = () => {
    bookmarkMutation.mutate({ storyId: story.id, add: !isBookmarked });
  };

  const handleShare = async () => {
    try {
      const url = story.url || `https://news.ycombinator.com/item?id=${story.id}`;
      await Share.share({
        message: Platform.OS === 'ios' ? (story.title || '') : `${story.title || ''}\n${url}`,
        url: Platform.OS === 'ios' ? url : undefined,
        title: story.title || '',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <ThemedView style={[styles.container, { borderBottomColor: separatorColor }]}>
      <Link href={`/story/${story.id}?title=${encodeURIComponent(story.title || '')}`}>
        <Link.Trigger>
          <View style={styles.header}>
            {/* <ThemedText style={styles.index}>{index}.</ThemedText> */}
            <View style={styles.content}>
              <View style={styles.titleRow}>
                <ThemedText style={styles.title} numberOfLines={3}>
                  {story.title}
                </ThemedText>
                {isBookmarked && (
                  <IconSymbol
                    name="bookmark.fill"
                    size={16}
                    color={textColor}
                    style={styles.bookmarkIndicator}
                  />
                )}
              </View>
              {getDomain(story.url) && (
                <ThemedText style={styles.domain}>{getDomain(story.url)}</ThemedText>
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
        <Link.Menu>
          <Link.MenuAction
            title={isBookmarked ? 'Remove Bookmark' : 'Bookmark'}
            icon={isBookmarked ? 'bookmark.fill' : 'bookmark'}
            onPress={handleBookmark}
          />
          <Link.MenuAction
            title="Share"
            icon="square.and.arrow.up"
            onPress={handleShare}
          />
        </Link.Menu>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  title: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
    marginBottom: 4,
  },
  bookmarkIndicator: {
    opacity: 0.6,
    marginTop: 2,
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
