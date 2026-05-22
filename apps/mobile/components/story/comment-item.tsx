import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useHNAuth } from "@/contexts/hn-auth-context";
import { useBlockedUsers } from "@/hooks/use-blocked-users";
import { useDeleteCommentMutation } from "@/hooks/use-delete-comment-mutation";
import type { Comment as CommentType } from "@/hooks/use-story";
import { useThemeColor } from "@/hooks/use-theme-color";
import { hapticImpact, hapticSelection, Haptics } from "@/lib/haptics";
import { timeAgo } from "@/lib/shared";
import { ContextMenu, Host, Button as SwiftUIButton } from "@expo/ui/swift-ui";
import {
  controlSize,
  frame,
  labelStyle,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { Link } from "expo-router";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import { HTMLText } from "./html-text";

interface CommentItemProps {
  comment: CommentType;
  depth: number;
  isCollapsed: boolean;
  onToggleCollapse: (id: number) => void;
  onReply: (commentId: number, username: string) => void;
  storyId: number;
}

export function CommentItem({
  comment,
  depth,
  isCollapsed,
  onToggleCollapse,
  onReply,
  storyId,
}: CommentItemProps) {
  const borderColor = useThemeColor({}, "border");
  const { isAuthenticated, username } = useHNAuth();
  const { blockUser } = useBlockedUsers();
  const textColor = useThemeColor({}, "text");
  const deleteCommentMutation = useDeleteCommentMutation({ storyId });

  // Check if this is the logged-in user's own comment
  const isOwnComment = username && comment.by === username;

  const handleBlockUser = async () => {
    hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await blockUser(comment.by);
      Alert.alert(
        "User Blocked",
        `You will no longer see content from ${comment.by}. You can unblock them in Settings.`,
        [{ text: "OK" }]
      );
    } catch {
      Alert.alert("Error", "Failed to block user. Please try again.", [
        { text: "OK" },
      ]);
    }
  };

  const handleDeleteComment = () => {
    if (!isAuthenticated) {
      Alert.alert(
        "Login Required",
        "You must be logged in to delete comments.",
        [{ text: "OK" }]
      );
      return;
    }

    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
            deleteCommentMutation.mutate(comment.id);
          },
        },
      ]
    );
  };

  const handleReply = () => {
    hapticSelection();
    onReply(comment.id, comment.by);
  };

  if (!comment.text) {
    return null;
  }

  let content = (
    <Animated.View
      layout={LinearTransition.duration(200)}
      style={[
        styles.comment,
        {
          borderLeftColor: borderColor,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Link href={`/user/${comment.by}`}>
            <Link.Trigger>
              <ThemedText type="bodySmall" style={styles.author}>
                {comment.by}
              </ThemedText>
            </Link.Trigger>
            <Link.Preview />
          </Link>
          <ThemedText type="caption" style={styles.time}>
            {" "}
            • {timeAgo(comment.time)}
          </ThemedText>
          {comment.children && comment.children.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                hapticSelection();
                onToggleCollapse(comment.id);
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ThemedText type="caption" style={styles.collapseButton}>
                {" "}
                [{isCollapsed ? `+${comment.children.length}` : "−"}]
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
        <Host matchContents style={{ width: 24, height: 24 }}>
          <ContextMenu>
            <ContextMenu.Items>
              {isAuthenticated && (
                <SwiftUIButton
                  systemImage="arrowshape.turn.up.left"
                  onPress={handleReply}
                  label="Reply"
                />
              )}
              {isOwnComment ? (
                <SwiftUIButton
                  systemImage="trash"
                  onPress={handleDeleteComment}
                  role="destructive"
                  label="Delete Comment"
                />
              ) : (
                <SwiftUIButton
                  systemImage="nosign"
                  onPress={handleBlockUser}
                  role="destructive"
                  label="Block User"
                />
              )}
            </ContextMenu.Items>
            <ContextMenu.Trigger>
              <SwiftUIButton
                label="More"
                systemImage="ellipsis"
                modifiers={[
                  labelStyle("iconOnly"),
                  tint(textColor),
                  controlSize("small"),
                  frame({ width: 24, height: 24 }),
                ]}
              />
            </ContextMenu.Trigger>
          </ContextMenu>
        </Host>
      </View>
      {!isCollapsed && (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(150)}
        >
          <HTMLText html={comment.text} style={styles.text} />
        </Animated.View>
      )}
    </Animated.View>
  );

  // Wrap with nested borders for each depth level
  for (let i = depth - 1; i >= 0; i--) {
    content = (
      <View
        key={i}
        style={[styles.nestedBorder, { borderLeftColor: borderColor }]}
      >
        {content}
      </View>
    );
  }

  return <View style={styles.container}>{content}</View>;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
  },
  nestedBorder: {
    paddingLeft: Spacing.md,
    borderLeftWidth: 1,
  },
  comment: {
    marginBottom: Spacing.lg,
    paddingLeft: Spacing.md,
    borderLeftWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  author: {
    fontWeight: "600",
  },
  time: {
    opacity: 0.6,
  },
  collapseButton: {
    opacity: 0.6,
  },
  text: {
    marginBottom: Spacing.sm,
  },
});
