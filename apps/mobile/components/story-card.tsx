import { Spacing } from '@/constants/theme';
import { useHNAuth } from '@/contexts/hn-auth-context';
import { useBookmarkMutation, useIsBookmarked } from '@/hooks/use-bookmarks';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getDomain, type HNItem, isAuthError, timeAgo, unvote, vote } from '@hn/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Share, StyleSheet, View } from 'react-native';
import { LinkPreview } from './link-preview';
import { ThemedText } from './themed-text';
import { IconSymbol } from './ui/icon-symbol';

interface StoryCardProps {
  story: HNItem;
  index: number;
}

export function StoryCard({ story, index }: StoryCardProps) {
  const separatorColor = useThemeColor({}, "border");
  const textColor = useThemeColor({}, "text");
  const iconColor = useThemeColor({}, "icon");
  const { data: isBookmarked = false } = useIsBookmarked(story.id);
  const bookmarkMutation = useBookmarkMutation();
  const { session, isAuthenticated, logout } = useHNAuth();
  const queryClient = useQueryClient();
  const [hasVoted, setHasVoted] = useState(false);

  const voteMutation = useMutation<
    void,
    unknown,
    boolean,
    { previousHasVoted: boolean; previousItem?: HNItem }
  >({
    mutationFn: async (wasVoted: boolean) => {
      if (!isAuthenticated || !session) {
        Alert.alert(
          "Login Required",
          "Please login to Hacker News in Settings to vote on stories.",
          [{ text: "OK" }]
        );
        throw new Error("Not authenticated");
      }
      if (wasVoted) {
        await unvote(story.id, session);
      } else {
        await vote(story.id, session);
      }
    },
    onMutate: async (wasVoted) => {
      const previousHasVoted = wasVoted;
      const newHasVoted = !wasVoted;
      const previousItem = queryClient.getQueryData<HNItem>(["item", story.id]);

      setHasVoted(newHasVoted);
      if (previousItem) {
        queryClient.setQueryData(["item", story.id], {
          ...previousItem,
          score: (previousItem.score ?? 0) + (newHasVoted ? 1 : -1),
        });
      }

      return { previousHasVoted, previousItem };
    },
    onError: (error, _variables, context) => {
      const previousHasVoted = context?.previousHasVoted ?? false;
      setHasVoted(previousHasVoted);

      if (context?.previousItem) {
        queryClient.setQueryData(["item", story.id], context.previousItem);
      } else {
        queryClient.invalidateQueries({ queryKey: ["item", story.id] });
      }

      if (isAuthError(error) && error.code === "NOT_LOGGED_IN") {
        logout();
        Alert.alert("Session Expired", "Please log in again to continue", [
          { text: "OK" },
        ]);
      } else if (isAuthError(error) && error.code === "RATE_LIMITED") {
        Alert.alert(
          "Slow Down",
          "You're performing actions too quickly. Please wait a moment.",
          [{ text: "OK" }]
        );
      } else {
        console.error("Vote error:", error);
        Alert.alert("Error", "Failed to vote. Please try again.");
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["item", story.id] });
    },
  });

  const handleBookmark = () => {
    bookmarkMutation.mutate({ storyId: story.id, add: !isBookmarked });
  };

  const handleVote = () => {
    voteMutation.mutate(hasVoted);
  };

  const handleShare = async () => {
    try {
      const url =
        story.url || `https://news.ycombinator.com/item?id=${story.id}`;
      await Share.share({
        message:
          Platform.OS === "ios"
            ? story.title || ""
            : `${story.title || ""}\n${url}`,
        url: Platform.OS === "ios" ? url : undefined,
        title: story.title || "",
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  return (
    <View style={[styles.container, { borderBottomColor: separatorColor }]}>
      <Link
        href={`/story/${story.id}?title=${encodeURIComponent(
          story.title || ""
        )}`}
      >
        <Link.Trigger>
          <View style={styles.header}>
            <View style={styles.content}>
              <View style={styles.titleRow}>
                <ThemedText
                  type="bodyLarge"
                  style={styles.title}
                  numberOfLines={3}
                >
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
                <View style={styles.domainContainer}>
                  <Image
                    source={{
                      uri: `https://www.google.com/s2/favicons?domain=${getDomain(
                        story.url
                      )}&sz=16`,
                    }}
                    style={styles.favicon}
                    contentFit="contain"
                  />
                  <ThemedText type="caption" style={styles.domain}>
                    {getDomain(story.url)}
                  </ThemedText>
                </View>
              )}
              {/* Metadata: all on one line */}
              <View style={styles.metadata}>
                <View style={styles.metadataItem}>
                  <IconSymbol
                    name={
                      hasVoted ? "arrowtriangle.up.fill" : "arrowtriangle.up"
                    }
                    size={13}
                    color={iconColor}
                  />
                  <ThemedText type="bodySmall" style={styles.metadataText}>
                    {story.score}
                  </ThemedText>
                </View>
                <ThemedText type="bodySmall" style={styles.metadataText}>
                  {" "}
                  •{" "}
                </ThemedText>
                <View style={styles.metadataItem}>
                  <IconSymbol name="person" size={13} color={iconColor} />
                  <ThemedText type="bodySmall" style={styles.metadataText}>
                    {story.by}
                  </ThemedText>
                </View>
                <ThemedText type="bodySmall" style={styles.metadataText}>
                  {" "}
                  •{" "}
                </ThemedText>
                <View style={styles.metadataItem}>
                  <IconSymbol name="clock" size={13} color={iconColor} />
                  <ThemedText type="bodySmall" style={styles.metadataText}>
                    {timeAgo(story.time || 0)}
                  </ThemedText>
                </View>
                <ThemedText type="bodySmall" style={styles.metadataText}>
                  {" "}
                  •{" "}
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
            </View>
            {story.url && <LinkPreview url={story.url} compact />}
          </View>
        </Link.Trigger>
        <Link.Menu>
          <Link.MenuAction
            title={hasVoted ? "Unvote" : "Upvote"}
            icon={hasVoted ? "arrowtriangle.up.fill" : "arrowtriangle.up"}
            onPress={handleVote}
          />
          <Link.MenuAction
            title={isBookmarked ? "Remove Bookmark" : "Bookmark"}
            icon={isBookmarked ? "bookmark.fill" : "bookmark"}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.lg,
    marginHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  title: {
    flex: 1,
  },
  bookmarkIndicator: {
    opacity: 0.6,
    marginTop: 2,
  },
  domainContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: Spacing.sm,
  },
  favicon: {
    width: 12,
    height: 12,
  },
  domain: {
    opacity: 0.6,
  },
  metadata: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  metadataItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metadataText: {
    opacity: 0.6,
  },
});
