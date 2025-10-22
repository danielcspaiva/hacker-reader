import { useThemeColor } from '@/hooks/use-theme-color';
import { HNItem } from '@/lib/hn-api';
import { timeAgo } from '@/lib/utils/time';
import { getDomain } from '@/lib/utils/url';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';
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
  const iconColor = useThemeColor({}, 'icon');

  return (
    <ThemedView style={[styles.container, { borderBottomColor: separatorColor }]}>
      <Link href={`/story/${story.id}?title=${encodeURIComponent(story.title || '')}`}>
        <Link.Trigger>
          <View style={styles.header}>
            {/* <ThemedText style={styles.index}>{index}.</ThemedText> */}
            <View style={styles.content}>
              <ThemedText style={styles.title} numberOfLines={3}>
                {story.title}
              </ThemedText>
              {getDomain(story.url) && (
                <View style={styles.domainContainer}>
                  <Image
                    source={{ uri: `https://www.google.com/s2/favicons?domain=${getDomain(story.url)}&sz=16` }}
                    style={styles.favicon}
                    contentFit="contain"
                  />
                  <ThemedText style={styles.domain}>{getDomain(story.url)}</ThemedText>
                </View>
              )}
              <View style={styles.metadata}>
                <View style={styles.metadataItem}>
                  <IconSymbol name="arrowtriangle.up" size={12} color={iconColor} />
                  <ThemedText style={styles.metadataText}>
                    {story.score}
                  </ThemedText>
                </View>
                <ThemedText style={styles.metadataText}> • </ThemedText>
                <View style={styles.metadataItem}>
                  <IconSymbol name="person" size={12} color={iconColor} />
                  <ThemedText style={styles.metadataText}>
                    {story.by}
                  </ThemedText>
                </View>
                <ThemedText style={styles.metadataText}> • </ThemedText>
                <View style={styles.metadataItem}>
                  <IconSymbol name="clock" size={12} color={iconColor} />
                  <ThemedText style={styles.metadataText}>
                    {timeAgo(story.time || 0)}
                  </ThemedText>
                </View>
                <ThemedText style={styles.metadataText}> • </ThemedText>
                <View style={styles.metadataItem}>
                  <IconSymbol name="bubble.left.and.bubble.right" size={12} color={iconColor} />
                  <ThemedText style={styles.metadataText}>
                    {story.descendants || 0}
                  </ThemedText>
                </View>
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
  domainContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -4,
    marginBottom: 4,
  },
  favicon: {
    width: 10,
    height: 10,
  },
  domain: {
    fontSize: 13,
    opacity: 0.5,
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metadataText: {
    fontSize: 13,
    opacity: 0.5,
  },
});
