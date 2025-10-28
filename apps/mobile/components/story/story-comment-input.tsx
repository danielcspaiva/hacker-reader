import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { EVENTS, EVENT_PROPERTIES } from "@/constants/analytics-events";
import { Colors } from "@/constants/theme";
import { useColorSchemeContext } from "@/contexts/color-scheme-context";
import { useHNAuth } from "@/contexts/hn-auth-context";
import { useAnalytics } from "@/hooks/use-analytics";
import { useThemeColor } from "@/hooks/use-theme-color";
import { comment } from "@hn/shared/api";
import { isAuthError } from "@hn/shared/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
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
  const { colorScheme, colorPalette } = useColorSchemeContext();
  const { session, isAuthenticated, logout } = useHNAuth();
  const queryClient = useQueryClient();
  const analytics = useAnalytics();
  const { bottom } = useSafeAreaInsets();
  const isDark = colorScheme === "dark";
  const hasLiquidGlass = isLiquidGlassAvailable();
  const backgroundColor =
    colorScheme === "dark"
      ? Colors.dark[colorPalette].background
      : Colors.light[colorPalette].background;
  const borderColor =
    colorScheme === "dark"
      ? Colors.dark[colorPalette].border
      : Colors.light[colorPalette].border;

  const [commentText, setCommentText] = useState("");
  const [isCommentInputVisible, setIsCommentInputVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Auto-show input when a reply target is set
  useEffect(() => {
    if (replyTarget) {
      setIsCommentInputVisible(true);
    }
  }, [replyTarget]);

  // Focus input when it becomes visible
  useEffect(() => {
    if (isCommentInputVisible) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isCommentInputVisible]);

  // Determine parent ID based on whether we're replying to a comment or the story
  const parentId = replyTarget ? replyTarget.commentId : storyId;

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!session) throw new Error("Not authenticated");
      await comment(parentId, text, session);
    },
    onSuccess: async () => {
      // Track successful comment
      analytics.track(EVENTS.COMMENT_POSTED, {
        [EVENT_PROPERTIES.STORY_ID]: storyId,
        [EVENT_PROPERTIES.PARENT_ID]: parentId,
        [EVENT_PROPERTIES.COMMENT_DEPTH]: replyTarget ? 1 : 0,
      });

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
      // Track comment failure
      analytics.track(EVENTS.COMMENT_FAILED, {
        [EVENT_PROPERTIES.STORY_ID]: storyId,
        [EVENT_PROPERTIES.PARENT_ID]: parentId,
        [EVENT_PROPERTIES.ERROR_TYPE]: isAuthError(error) ? error.code : 'unknown',
        [EVENT_PROPERTIES.ERROR_MESSAGE]: error instanceof Error ? error.message : 'Unknown error',
      });

      if (isAuthError(error)) {
        switch (error.code) {
          case "NOT_LOGGED_IN":
            logout();
            Alert.alert("Session Expired", "Please log in again to continue", [
              { text: "OK" },
            ]);
            analytics.track(EVENTS.SESSION_EXPIRED);
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
    if (!commentText.trim() || commentMutation.isPending) {
      return;
    }
    Keyboard.dismiss();
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

  const placeholder = replyTarget
    ? `Reply to ${replyTarget.username}...`
    : "Add a comment...";

  return (
    <>
      {/* Floating comment button */}
      {!isCommentInputVisible && (
        <View
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
        <GlassView
          glassEffectStyle="clear"
          isInteractive
          style={[
            styles.floatingButtonGlass,
            !hasLiquidGlass && {
              backgroundColor,
              borderWidth: 1,
              borderColor,
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
        </View>
      )}

      {/* Comment Input */}
      {isCommentInputVisible && (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
          style={styles.keyboardAvoidingContainer}
        >
          <GlassView
            glassEffectStyle="regular"
            style={[
              styles.inputContainer,
              {
                paddingBottom: Platform.select({
                  ios: bottom || 8,
                  android: 8,
                  default: 8,
                }),
              },
              !hasLiquidGlass && {
                backgroundColor,
                borderWidth: 1,
                borderColor,
              },
            ]}
          >
            {/* Header with close button */}
            <View style={styles.inputHeader}>
              {replyTarget ? (
                <ThemedText type="caption" style={styles.replyContextText}>
                  Replying to {replyTarget.username}
                </ThemedText>
              ) : (
                <View style={styles.spacer} />
              )}
              <Pressable
                onPress={handleCloseCommentInput}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.closeButton}
              >
                <IconSymbol
                  name="xmark"
                  size={16}
                  color={`${textColor}40`}
                  weight="medium"
                />
              </Pressable>
            </View>

            <View style={styles.inputRow}>
              <TextInput
                ref={inputRef}
                style={[
                  styles.input,
                  {
                    color: textColor,
                  },
                ]}
                placeholder={placeholder}
                placeholderTextColor={isDark ? "#8E8E93" : "#8E8E93"}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={5000}
                editable={!commentMutation.isPending}
                returnKeyType="default"
                keyboardAppearance={colorScheme}
              />

              <Pressable
                onPress={handlePostComment}
                disabled={!commentText.trim() || commentMutation.isPending}
                style={styles.sendButton}
              >
                {commentMutation.isPending ? (
                  <ThemedText style={styles.sendButtonText}>...</ThemedText>
                ) : (
                  <IconSymbol
                    name="paperplane.fill"
                    size={20}
                    color={!commentText.trim() ? `${textColor}40` : "#FF6600"}
                  />
                )}
              </Pressable>
            </View>
          </GlassView>
        </KeyboardAvoidingView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  floatingButtonContainer: {
    position: "absolute",
    right: 16,
    zIndex: 100,
  },
  floatingButtonGlass: {
    borderRadius: 28,
  },
  floatingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  keyboardAvoidingContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 99,
  },
  inputContainer: {
    paddingHorizontal: 8,
    marginHorizontal: 4,
    borderRadius: 28,
    marginBottom: 6,
  },
  inputHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 8,
    marginBottom: 4,
  },
  replyContextText: {
    opacity: 0.7,
    fontWeight: "500",
    flex: 1,
  },
  spacer: {
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingLeft: 12,
    paddingRight: 4,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 17,
    minHeight: 36,
    maxHeight: 120,
  },
  sendButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  sendButtonText: {
    fontSize: 16,
  },
});
