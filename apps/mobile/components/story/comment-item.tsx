import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useHNAuth } from "@/contexts/hn-auth-context";
import { useBlockedUsers } from "@/hooks/use-blocked-users";
import type { Comment as CommentType } from "@/hooks/use-story";
import { useThemeColor } from "@/hooks/use-theme-color";
import { timeAgo } from "@/lib/shared";
import { ContextMenu, Host, Button as SwiftUIButton } from "@expo/ui/swift-ui";
import { frame } from "@expo/ui/swift-ui/modifiers";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import { HTMLText } from "./html-text";

interface CommentItemProps {
  comment: CommentType;
  depth: number;
  isCollapsed: boolean;
  onToggleCollapse: (id: number) => void;
  onReply: (commentId: number, username: string) => void;
}

export function CommentItem({
  comment,
  depth,
  isCollapsed,
  onToggleCollapse,
  onReply,
}: CommentItemProps) {
  const borderColor = useThemeColor({}, "border");
  const { isAuthenticated } = useHNAuth();
  const { blockUser } = useBlockedUsers();
  const textColor = useThemeColor({}, "text");

  const handleBlockUser = async () => {
    try {
      await blockUser(comment.by);
      Alert.alert(
        "User Blocked",
        `You will no longer see content from ${comment.by}. You can unblock them in Settings.`,
        [{ text: "OK" }]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to block user. Please try again.", [
        { text: "OK" },
      ]);
    }
  };

  if (!comment.text) {
    return null;
  }

  let content = (
    <View
      style={[
        styles.comment,
        {
          borderLeftColor: borderColor,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <ThemedText type="bodySmall" style={styles.author}>
            {comment.by}
          </ThemedText>
          <ThemedText type="caption" style={styles.time}>
            {" "}
            • {timeAgo(comment.time)}
          </ThemedText>
          {comment.children && comment.children.length > 0 && (
            <TouchableOpacity
              onPress={() => onToggleCollapse(comment.id)}
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
                  onPress={() => onReply(comment.id, comment.by)}
                >
                  Reply
                </SwiftUIButton>
              )}
              <SwiftUIButton
                systemImage="nosign"
                onPress={handleBlockUser}
                role="destructive"
              >
                Block User
              </SwiftUIButton>
            </ContextMenu.Items>
            <ContextMenu.Trigger>
              <SwiftUIButton
                // variant="borderless"
                color={textColor}
                systemImage="ellipsis"
                // role="default"
                controlSize="small"
                modifiers={[frame({ width: 24, height: 24 })]}
              />
            </ContextMenu.Trigger>
          </ContextMenu>
        </Host>
      </View>
      {!isCollapsed && <HTMLText html={comment.text} style={styles.text} />}
    </View>
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
