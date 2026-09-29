import {
  Alert,
  Button as SwiftUIButton,
  ConfirmationDialog,
  Host,
  Image,
  Menu,
  Text,
} from "@expo/ui/swift-ui";
import { frame } from "@expo/ui/swift-ui/modifiers";
import { Link } from "expo-router";
import { useState, type ReactNode } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useHNAuth } from "@/contexts/hn-auth-context";
import { useBlockedUsers } from "@/hooks/use-blocked-users";
import { useDeleteCommentMutation } from "@/hooks/use-delete-comment-mutation";
import type { Comment as CommentType } from "@/hooks/use-story";
import { useThemeColor } from "@/hooks/use-theme-color";
import { hapticImpact, hapticSelection, Haptics } from "@/lib/haptics";
import { timeAgo } from "@/lib/shared";

import { HTMLText } from "./html-text";

interface CommentItemProps {
  comment: CommentType;
  depth: number;
  isCollapsed: boolean;
  onToggleCollapse: (id: number) => void;
  onReply: (commentId: number, username: string) => void;
  storyId: number;
}

function CommentOverflowMenu({
  textColor,
  isAuthenticated,
  onReply,
  children,
}: {
  textColor: string;
  isAuthenticated: boolean;
  onReply: () => void;
  children: ReactNode;
}) {
  return (
    <Menu
      label={<Image systemName="ellipsis" color={textColor} size={18} />}
      modifiers={[frame({ width: 32, height: 32 })]}
    >
      {isAuthenticated ? (
        <SwiftUIButton
          systemImage="arrowshape.turn.up.left"
          onPress={onReply}
          label="Reply"
        />
      ) : null}
      {children}
    </Menu>
  );
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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [notice, setNotice] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const isOwnComment = username && comment.by === username;

  const handleBlockUser = async () => {
    hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await blockUser(comment.by);
      setNotice({
        title: "User Blocked",
        message: `You will no longer see content from ${comment.by}. You can unblock them in Settings.`,
      });
    } catch {
      setNotice({
        title: "Error",
        message: "Failed to block user. Please try again.",
      });
    }
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
        <Host matchContents style={styles.moreButton}>
          {isOwnComment ? (
            <ConfirmationDialog
              title="Delete Comment"
              isPresented={deleteOpen}
              onIsPresentedChange={setDeleteOpen}
            >
              <ConfirmationDialog.Trigger>
                <CommentOverflowMenu
                  textColor={textColor}
                  isAuthenticated={isAuthenticated}
                  onReply={handleReply}
                >
                  <SwiftUIButton
                    systemImage="trash"
                    onPress={() => setDeleteOpen(true)}
                    role="destructive"
                    label="Delete Comment"
                  />
                </CommentOverflowMenu>
              </ConfirmationDialog.Trigger>
              <ConfirmationDialog.Message>
                <Text>
                  Are you sure you want to delete this comment? This action
                  cannot be undone.
                </Text>
              </ConfirmationDialog.Message>
              <ConfirmationDialog.Actions>
                <SwiftUIButton label="Cancel" role="cancel" />
                <SwiftUIButton
                  label="Delete"
                  role="destructive"
                  onPress={() => {
                    hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
                    deleteCommentMutation.mutate(comment.id);
                  }}
                />
              </ConfirmationDialog.Actions>
            </ConfirmationDialog>
          ) : (
            <Alert
              title={notice?.title ?? ""}
              isPresented={notice !== null}
              onIsPresentedChange={(presented) => {
                if (!presented) setNotice(null);
              }}
            >
              <Alert.Trigger>
                <CommentOverflowMenu
                  textColor={textColor}
                  isAuthenticated={isAuthenticated}
                  onReply={handleReply}
                >
                  <SwiftUIButton
                    systemImage="nosign"
                    onPress={handleBlockUser}
                    role="destructive"
                    label="Block User"
                  />
                </CommentOverflowMenu>
              </Alert.Trigger>
              <Alert.Message>
                <Text>{notice?.message ?? ""}</Text>
              </Alert.Message>
              <Alert.Actions>
                <SwiftUIButton label="OK" role="cancel" />
              </Alert.Actions>
            </Alert>
          )}
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
  moreButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
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
