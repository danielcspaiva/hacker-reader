import { useCallback } from 'react';
import { Platform, Share, Alert } from 'react-native';
import type { HNItem } from '@hn/shared';

type ShareableStory = Pick<HNItem, 'id' | 'title' | 'url'>;

/**
 * Hook for sharing HN stories via native share sheet.
 * Handles platform differences (iOS vs Android share format).
 *
 * @returns Share function that accepts a story object
 *
 * @example
 * ```tsx
 * function StoryCard({ story }) {
 *   const shareStory = useShareStory();
 *
 *   return (
 *     <button onPress={() => shareStory(story)}>
 *       Share
 *     </button>
 *   );
 * }
 * ```
 */
export function useShareStory() {
  return useCallback(async (story: ShareableStory) => {
    try {
      const url = story.url || `https://news.ycombinator.com/item?id=${story.id}`;
      const title = story.title || 'Hacker News Story';

      const result = await Share.share({
        // iOS: Native share sheet handles both title and URL
        // Android: Needs combined message
        message: Platform.select({
          ios: title,
          android: `${title}\n\n${url}`,
          default: `${title}\n\n${url}`,
        }),
        // iOS: URL shown separately in share sheet
        url: Platform.OS === 'ios' ? url : undefined,
        title,
      });

      // Optional: Track successful shares
      if (result.action === Share.sharedAction) {
        console.log('Story shared successfully');
      }
    } catch (error) {
      console.error('Error sharing story:', error);
      Alert.alert(
        'Share Failed',
        'Could not share this story. Please try again.'
      );
    }
  }, []);
}
