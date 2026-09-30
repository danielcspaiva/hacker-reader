import { Stack, useIsPreview, useLocalSearchParams } from "expo-router";

import { StoryDetailLoader } from "@/components/story/story-detail-loader";

export default function StoryDetailScreen() {
  const { id, commentId } = useLocalSearchParams<{
    id: string;
    commentId?: string;
  }>();
  const isInsidePreview = useIsPreview();

  return (
    <>
      {isInsidePreview ? null : (
        <Stack.Screen
          options={{ title: "", scrollEdgeEffects: { top: "hard" } }}
        />
      )}
      <StoryDetailLoader
        storyId={Number(id)}
        commentId={commentId}
        isInsidePreview={isInsidePreview}
      />
    </>
  );
}
