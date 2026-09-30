import { Stack, useIsPreview, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";

import { ErrorState } from "@/components/error-state";
import { StoryDetail } from "@/components/story/story-detail";
import { StoryDetailSkeleton } from "@/components/story/story-detail-skeleton";
import { EmptyState } from "@/components/ui";
import { useStory } from "@/hooks/use-story";
import { useTheme } from "@/hooks/use-theme";

export default function StoryDetailScreen() {
  const { id, commentId } = useLocalSearchParams<{
    id: string;
    commentId?: string;
  }>();
  const {
    data: story,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useStory(Number(id));
  const { colors } = useTheme();
  const isInsidePreview = useIsPreview();

  let body;
  if (isLoading) {
    body = <StoryDetailSkeleton />;
  } else if (story) {
    body = (
      <StoryDetail
        story={story}
        commentId={commentId}
        isInsidePreview={isInsidePreview}
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
    <>
      {isInsidePreview ? null : (
        <Stack.Screen
          options={{ title: "", scrollEdgeEffects: { top: "hard" } }}
        />
      )}
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
    </>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
