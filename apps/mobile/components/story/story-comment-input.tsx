import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputInstance,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, Text } from "@/components/ui";
import { Radius, withAlpha } from "@/constants/theme";
import { useHNAuth } from "@/contexts/hn-auth-context";
import {
  useCommentMutation,
  type ReplyTarget,
} from "@/hooks/use-comment-mutation";
import { useTheme } from "@/hooks/use-theme";
import { hapticImpact, hapticSelection } from "@/lib/haptics";

/** The open comment box: replying to a comment, or (null) commenting on the story. */
export interface Composer {
  replyTo: ReplyTarget | null;
}

interface StoryCommentInputProps {
  storyId: number;
  /** Null while the box is closed and only the compose button shows. */
  composer: Composer | null;
  onOpen: () => void;
  onClose: () => void;
}

export function StoryCommentInput({
  storyId,
  composer,
  onOpen,
  onClose,
}: StoryCommentInputProps) {
  const { scheme, colors } = useTheme();
  const { isAuthenticated } = useHNAuth();
  const { bottom } = useSafeAreaInsets();

  const hasLiquidGlass = isLiquidGlassAvailable();
  const [keyboardShown, setKeyboardShown] = useState(false);
  const [commentText, setCommentText] = useState("");
  const inputRef = useRef<TextInputInstance>(null);

  const replyTarget = composer?.replyTo ?? null;
  const isCommentInputVisible = composer !== null;

  const commentMutation = useCommentMutation({
    storyId,
    replyTarget,
    onSuccess: () => {
      setCommentText("");
      onClose();
    },
  });

  // KeyboardAvoidingView already lifts the card to the top of the keyboard,
  // which covers the home indicator area. The safe-area margin only applies
  // while the keyboard is down, otherwise it is added on top as a dead strip.
  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, () => setKeyboardShown(true));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardShown(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (!isCommentInputVisible) return;
    const timeout = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timeout);
  }, [isCommentInputVisible]);

  const handlePostComment = () => {
    if (!commentText.trim() || commentMutation.isPending) {
      return;
    }
    hapticImpact();
    Keyboard.dismiss();
    commentMutation.mutate(commentText);
  };

  const handleCloseCommentInput = () => {
    setCommentText("");
    onClose();
  };

  if (!isAuthenticated) {
    return null;
  }

  const placeholder = replyTarget
    ? `Reply to ${replyTarget.username}...`
    : "Add a comment...";
  const canSend = commentText.trim().length > 0 && !commentMutation.isPending;

  return (
    <>
      {!isCommentInputVisible && (
        <View style={[styles.fabContainer, { bottom: bottom + 16 }]}>
          <GlassView
            glassEffectStyle="regular"
            // A translucent tint keeps the glass visible; an opaque one reads
            // as a flat orange disc.
            tintColor={withAlpha(colors.primary, 0.75)}
            isInteractive
            style={[
              styles.fab,
              !hasLiquidGlass && { backgroundColor: colors.primary },
            ]}
          >
            <Pressable
              onPress={() => {
                hapticSelection();
                onOpen();
              }}
              accessibilityRole="button"
              accessibilityLabel="Add a comment"
              style={({ pressed }) => [
                styles.fabPress,
                !hasLiquidGlass && {
                  opacity: pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                },
              ]}
            >
              <Icon
                name="compose"
                size={24}
                weight="medium"
                color={colors.primaryForeground}
              />
            </Pressable>
          </GlassView>
        </View>
      )}

      {isCommentInputVisible && (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
          style={styles.keyboardAvoidingContainer}
        >
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: colors.card,
                marginBottom: keyboardShown ? 8 : Math.max(bottom, 8),
                shadowColor: colors.foreground,
              },
            ]}
          >
            <View style={styles.inputHeader}>
              <Text
                variant="caption"
                tone="muted"
                weight="medium"
                numberOfLines={1}
                style={styles.replyContext}
              >
                {replyTarget
                  ? `Replying to ${replyTarget.username}`
                  : "New comment"}
              </Text>
              <Pressable
                onPress={handleCloseCommentInput}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close comment box"
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Icon
                  name="close"
                  size={12}
                  weight="semibold"
                  color={colors.mutedForeground}
                />
              </Pressable>
            </View>

            <View style={styles.inputRow}>
              <TextInput
                ref={inputRef}
                style={[
                  styles.input,
                  { color: colors.foreground, backgroundColor: colors.muted },
                ]}
                placeholder={placeholder}
                placeholderTextColor={colors.tertiaryForeground}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={5000}
                editable={!commentMutation.isPending}
                returnKeyType="default"
                keyboardAppearance={scheme}
                selectionColor={colors.primary}
              />

              <Pressable
                onPress={handlePostComment}
                disabled={!canSend}
                accessibilityRole="button"
                accessibilityLabel="Post comment"
                accessibilityState={{ disabled: !canSend }}
                style={({ pressed }) => [
                  styles.sendButton,
                  {
                    backgroundColor: canSend
                      ? colors.primary
                      : withAlpha(colors.tertiaryForeground, 0.25),
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                {commentMutation.isPending ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.primaryForeground}
                  />
                ) : (
                  <Icon
                    name="send"
                    size={16}
                    color={
                      canSend
                        ? colors.primaryForeground
                        : colors.mutedForeground
                    }
                  />
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: "absolute",
    right: 16,
    zIndex: 100,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  fabPress: {
    width: 56,
    height: 56,
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
    marginHorizontal: 8,
    paddingHorizontal: 10,
    paddingBottom: 10,
    borderRadius: Radius.card,
    borderCurve: "continuous",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  inputHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 8,
    minHeight: 36,
  },
  replyContext: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  },
  closeButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 17,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: Radius.list,
    borderCurve: "continuous",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
});
