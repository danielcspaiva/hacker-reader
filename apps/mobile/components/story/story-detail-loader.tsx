import { StyleSheet, View } from "react-native";

import { ErrorState } from "@/components/error-state";
import { StoryDetail } from "@/components/story/story-detail";
import { StoryDetailSkeleton } from "@/components/story/story-detail-skeleton";
import { EmptyState } from "@/components/ui";
import { useStory } from "@/hooks/use-story";
import { useTheme } from "@/hooks/use-theme";

interface StoryDetailLoaderProps {
  storyId: number;
  /** A comment to scroll to and highlight (deep link). */
  commentId?: string;
  isInsidePreview?: boolean;
  /** Rendered in the split view's detail pane, not as its own screen. */
  embedded?: boolean;
}

/** Fetches a story and shows its loading, error and not-found states. */
export function StoryDetailLoader({
  storyId,
  commentId,
  isInsidePreview = false,
  embedded = false,
}: StoryDetailLoaderProps) {
  const {
    data: story,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useStory(storyId);
  const { colors } = useTheme();

  let body;
  if (isLoading) {
    body = <StoryDetailSkeleton />;
  } else if (story) {
    body = (
      <StoryDetail
        story={story}
        commentId={commentId}
        isInsidePreview={isInsidePreview}
        embedded={embedded}
        onRefresh={() => void refetch()}
        isRefreshing={isRefetching}
      />
    );
  } else if (isError) {
    body = (
      <ErrorState
        title="Couldn't load this story"
        onRetry={() => void refetch()}
      />
    );
  } else {
    body = <EmptyState icon="warning" title="Story not found" />;
  }

  return (
    <View
      style={[
        styles.fill,
        {
          backgroundColor: isInsidePreview ? colors.card : colors.background,
        },
      ]}
    >
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
