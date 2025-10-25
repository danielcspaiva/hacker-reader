import { CommentInput } from "@/components/comment-input";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColorSchemeContext } from "@/contexts/color-scheme-context";
import { useHNAuth } from "@/contexts/hn-auth-context";
import { useThemeColor } from "@/hooks/use-theme-color";
import { comment } from "@hn/shared/api";
import { isAuthError } from "@hn/shared/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GlassView } from "expo-glass-effect";
import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ReplyTarget {
  commentId: number;
  username: string;
}

interface StoryCommentInputProps {
  storyId: number;
  replyTarget: ReplyTarget | null;
  onCancelReply: () => void;
}

export function StoryCommentInput({
  storyId,
  replyTarget,
  onCancelReply,
}: StoryCommentInputProps) {
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const { colorScheme } = useColorSchemeContext();
  const { session, isAuthenticated, logout } = useHNAuth();
  const queryClient = useQueryClient();
  const { bottom } = useSafeAreaInsets();

  const [commentText, setCommentText] = useState("");
  const [isCommentInputVisible, setIsCommentInputVisible] = useState(false);

  // Auto-show input when a reply target is set
  useEffect(() => {
    if (replyTarget) {
      setIsCommentInputVisible(true);
    }
  }, [replyTarget]);

  // Determine parent ID based on whether we're replying to a comment or the story
  const parentId = replyTarget ? replyTarget.commentId : storyId;

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!session) throw new Error("Not authenticated");
      await comment(parentId, text, session);
    },
    onSuccess: async () => {
      setCommentText("");
      setIsCommentInputVisible(false);
      if (replyTarget) {
        onCancelReply(); // Clear reply mode
      }

      // Wait a moment for HN's API to update (comments aren't instant)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Refetch story to show new comment
      queryClient.invalidateQueries({ queryKey: ["story", storyId] });
    },
    onError: (error) => {
      if (isAuthError(error)) {
        switch (error.code) {
          case "NOT_LOGGED_IN":
            logout();
            Alert.alert("Session Expired", "Please log in again to continue", [
              { text: "OK" },
            ]);
            break;
          case "RATE_LIMITED":
            Alert.alert(
              "Slow Down",
              "You're performing actions too quickly. Please wait a moment.",
              [{ text: "OK" }]
            );
            break;
          case "PARSE_ERROR":
            Alert.alert(
              "Something Went Wrong",
              "The app may need an update. Please try again later.",
              [{ text: "OK" }]
            );
            break;
          default:
            Alert.alert("Error", error.message);
        }
      } else {
        Alert.alert("Error", "Failed to post comment. Please try again.");
      }
    },
  });

  const handlePostComment = () => {
    if (!commentText.trim()) {
      Alert.alert("Error", "Please enter a comment");
      return;
    }
    commentMutation.mutate(commentText);
  };

  const handleCloseCommentInput = () => {
    setIsCommentInputVisible(false);
    setCommentText("");
    if (replyTarget) {
      onCancelReply(); // Clear reply mode when closing input
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Floating comment button */}
      {!isCommentInputVisible && (
        <GlassView
          glassEffectStyle="clear"
          isInteractive
          style={[
            styles.floatingButtonContainer,
            {
              bottom: Platform.select({
                ios: bottom + 16,
                android: bottom + 16,
                default: 16,
              }),
            },
          ]}
        >
          <Pressable
            onPress={() => setIsCommentInputVisible(true)}
            style={[styles.floatingButton]}
          >
            <IconSymbol
              name="bubble.left"
              size={24}
              color={textColor}
              weight="medium"
            />
          </Pressable>
        </GlassView>
      )}

      {/* Comment Input */}
      <CommentInput
        visible={isCommentInputVisible}
        value={commentText}
        onChangeText={setCommentText}
        onSubmit={handlePostComment}
        onClose={handleCloseCommentInput}
        isSubmitting={commentMutation.isPending}
        replyContext={
          replyTarget
            ? {
                username: replyTarget.username,
                onCancel: () => {
                  onCancelReply();
                  setCommentText(""); // Clear text when canceling reply
                },
              }
            : null
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  floatingButtonContainer: {
    position: "absolute",
    right: 16,
    zIndex: 100,
    borderRadius: 28,
  },
  floatingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
