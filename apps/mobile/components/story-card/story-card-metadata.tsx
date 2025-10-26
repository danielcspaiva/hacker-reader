import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { timeAgo, type HNItem } from '@hn/shared';
import { StyleSheet, View } from 'react-native';

interface StoryCardMetadataProps {
  story: HNItem;
  hasVoted: boolean;
}

/**
 * Story metadata display (points, author, time, comments)
 */
export function StoryCardMetadata({ story, hasVoted }: StoryCardMetadataProps) {
  const iconColor = useThemeColor({}, 'icon');

  return (
    <View style={styles.metadata}>
      <View style={styles.metadataItem}>
        <IconSymbol
          name={hasVoted ? 'arrowtriangle.up.fill' : 'arrowtriangle.up'}
          size={13}
          color={iconColor}
        />
        <ThemedText type="bodySmall" style={styles.metadataText}>
          {story.score}
        </ThemedText>
      </View>

      <ThemedText type="bodySmall" style={styles.metadataText}>
        {' '}
        •{' '}
      </ThemedText>

      <View style={styles.metadataItem}>
        <IconSymbol name="person" size={13} color={iconColor} />
        <ThemedText type="bodySmall" style={styles.metadataText}>
          {story.by}
        </ThemedText>
      </View>

      <ThemedText type="bodySmall" style={styles.metadataText}>
        {' '}
        •{' '}
      </ThemedText>

      <View style={styles.metadataItem}>
        <IconSymbol name="clock" size={13} color={iconColor} />
        <ThemedText type="bodySmall" style={styles.metadataText}>
          {timeAgo(story.time || 0)}
        </ThemedText>
      </View>

      <ThemedText type="bodySmall" style={styles.metadataText}>
        {' '}
        •{' '}
      </ThemedText>

      <View style={styles.metadataItem}>
        <IconSymbol
          name="bubble.left.and.bubble.right"
          size={13}
          color={iconColor}
        />
        <ThemedText type="bodySmall" style={styles.metadataText}>
          {story.descendants || 0}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    opacity: 0.6,
  },
});

