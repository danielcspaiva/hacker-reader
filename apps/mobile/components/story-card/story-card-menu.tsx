import { useIsBookmarked } from '@/hooks/use-bookmarks';
import type { HNItem } from '@hn/shared';
import { Link } from 'expo-router';
import type { StoryActions } from './use-story-actions';

interface StoryCardMenuProps {
  story: HNItem;
  actions: StoryActions;
}

/**
 * Context menu for story card actions
 * iOS: Long press menu with icons
 * Android: Fallback to inline buttons
 */
export function StoryCardMenu({ story, actions }: StoryCardMenuProps) {
  const { data: isBookmarked = false } = useIsBookmarked(story.id);

  return (
    <Link.Menu>
      {/* Vote action */}
      <Link.MenuAction
        title={actions.hasVoted ? 'Unvote' : 'Upvote'}
        icon={actions.hasVoted ? 'arrowtriangle.up.fill' : 'arrowtriangle.up'}
        onPress={actions.handleVote}
      />

      {/* Bookmark action */}
      <Link.MenuAction
        title={isBookmarked ? 'Remove Bookmark' : 'Bookmark'}
        icon={isBookmarked ? 'bookmark.fill' : 'bookmark'}
        onPress={() => actions.handleBookmark(isBookmarked)}
      />

      {/* Share action */}
      <Link.MenuAction
        title="Share"
        icon="square.and.arrow.up"
        onPress={actions.handleShare}
      />
    </Link.Menu>
  );
}

