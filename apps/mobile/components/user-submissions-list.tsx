import { Stack } from "expo-router";
import { useState } from "react";
import { StyleSheet } from "react-native";

import { ErrorState } from "@/components/error-state";
import { StoryCard } from "@/components/story-card";
import { StoryCardSkeleton } from "@/components/story-card-skeleton";
import { SubmissionCommentCard } from "@/components/submission-comment-card";
import {
  Card,
  EmptyState,
  ListScreen,
  Segmented,
  Skeleton,
} from "@/components/ui";
import { CARD_GAP } from "@/constants/theme";
import {
  usePrefetchVisibleStories,
  visibleStoryId,
} from "@/hooks/use-prefetch-visible-stories";
import { useUser } from "@/hooks/use-user";
import { useUserSubmissions } from "@/hooks/use-user-submissions";
import type { HNItem } from "@/lib/hn";

type SubmissionType = "stories" | "comments";

const TYPE_OPTIONS: { value: SubmissionType; label: string }[] = [
  { value: "stories", label: "Stories" },
  { value: "comments", label: "Comments" },
];

function CommentSkeleton() {
  return (
    <Card style={styles.skeletonCard}>
      <Skeleton width="45%" height={12} />
      <Skeleton width="100%" height={16} />
      <Skeleton width="80%" height={16} />
    </Card>
  );
}

export function UserSubmissionsList({
  userId,
  title,
}: {
  userId: string | null;
  title: string;
}) {
  const [selectedType, setSelectedType] = useState<SubmissionType>("stories");
  const {
    data: user,
    isLoading: isLoadingUser,
    isError: isUserError,
    refetch: refetchUser,
  } = useUser(userId);
  const {
    data: submissions,
    isLoading: isLoadingSubmissions,
    isPlaceholderData,
    isError: isSubmissionsError,
    refetch: refetchSubmissions,
  } = useUserSubmissions(user?.submitted);

  const hasSubmissions = (user?.submitted?.length ?? 0) > 0;
  const isLoading =
    isLoadingUser ||
    isLoadingSubmissions ||
    (hasSubmissions && isPlaceholderData);
  const prefetchVisibleStories = usePrefetchVisibleStories(visibleStoryId);
  const itemType = selectedType === "stories" ? "story" : "comment";
  const items = (submissions ?? []).filter((item) => item.type === itemType);

  const header = (
    <Segmented
      options={TYPE_OPTIONS}
      value={selectedType}
      onChange={setSelectedType}
      style={styles.segmented}
    />
  );

  return (
    <>
      <Stack.Screen options={{ title }} />
      <ListScreen<HNItem>
        {...prefetchVisibleStories}
        data={items}
        isLoading={isLoading}
        skeleton={
          selectedType === "stories" ? (
            <StoryCardSkeleton />
          ) : (
            <CommentSkeleton />
          )
        }
        skeletonCount={4}
        extraData={selectedType}
        keyExtractor={(item) => item.id.toString()}
        getItemType={(item) => item.type}
        ListHeaderComponent={header}
        empty={
          isUserError || isSubmissionsError ? (
            <ErrorState
              title="Couldn't load submissions"
              onRetry={() => {
                void refetchUser();
                void refetchSubmissions();
              }}
            />
          ) : selectedType === "stories" ? (
            <EmptyState
              icon="document"
              title="No stories yet"
              message="Stories this user submits will show up here."
            />
          ) : (
            <EmptyState
              icon="comments"
              title="No comments yet"
              message="Comments this user posts will show up here."
            />
          )
        }
        renderItem={({ item }) =>
          item.type === "story" ? (
            <StoryCard story={item} />
          ) : (
            <SubmissionCommentCard comment={item} />
          )
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  segmented: {
    paddingBottom: 16,
  },
  skeletonCard: {
    gap: 10,
    marginBottom: CARD_GAP,
  },
});
