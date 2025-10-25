import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { GlassView } from "expo-glass-effect";
import { useEffect, useRef } from "react";
import {
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    TextInput,
    View,
    useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ReplyContext {
  username: string;
  onCancel: () => void;
}

interface CommentInputProps {
  visible: boolean;
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  isSubmitting?: boolean;
  disabled?: boolean;
  replyContext?: ReplyContext | null; // Context for replying to a specific comment
}

export function CommentInput({
  visible,
  value,
  onChangeText,
  onSubmit,
  onClose,
  isSubmitting = false,
  disabled = false,
  replyContext,
}: CommentInputProps) {
  const textColor = useThemeColor({}, "text");
  const { bottom } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const inputRef = useRef<TextInput>(null);

  // Auto-focus input when it becomes visible
  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [visible]);

  const handleSubmit = () => {
    if (!value.trim() || isSubmitting || disabled) {
      return;
    }
    Keyboard.dismiss();
    onSubmit();
  };

  if (!visible) {
    return null;
  }

  const placeholder = replyContext
    ? `Reply to ${replyContext.username}...`
    : "Add a comment...";

  return (
    <KeyboardAvoidingView
      behavior="position"
      keyboardVerticalOffset={0}
      contentContainerStyle={styles.keyboardAvoidingContainer}
    >
      <GlassView
        glassEffectStyle="regular"
        style={[
          styles.container,
          {
            paddingBottom: Platform.select({
              ios: bottom || 8,
              android: 8,
              default: 8,
            }),
          },
        ]}
      >
        {/* Reply Context Header */}
        {replyContext && (
          <View style={styles.replyContextHeader}>
            <ThemedText type="caption" style={styles.replyContextText}>
              Replying to {replyContext.username}
            </ThemedText>
            <Pressable
              onPress={replyContext.onCancel}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <IconSymbol
                name="xmark.circle.fill"
                size={18}
                color={textColor}
                weight="medium"
              />
            </Pressable>
          </View>
        )}

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
            value={value}
            onChangeText={onChangeText}
            multiline
            maxLength={5000}
            editable={!disabled && !isSubmitting}
            returnKeyType="default"
          />

          <Pressable
            onPress={handleSubmit}
            disabled={!value.trim() || isSubmitting || disabled}
            style={styles.sendButton}
          >
            {isSubmitting ? (
              <ThemedText style={styles.sendButtonText}>...</ThemedText>
            ) : (
              <IconSymbol
                name="paperplane.fill"
                size={20}
                color={(!value.trim() || disabled) ? `${textColor}40` : "#FF6600"}
              />
            )}
          </Pressable>
        </View>
      </GlassView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  container: {
    paddingHorizontal: 8,
    paddingTop: 8,
    marginHorizontal: 4,
    marginBottom: 8,
    borderRadius: 28,
  },
  replyContextHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 4,
  },
  replyContextText: {
    opacity: 0.7,
    fontWeight: "500",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 4,
    gap: 8,
  },
  input: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 8,
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

