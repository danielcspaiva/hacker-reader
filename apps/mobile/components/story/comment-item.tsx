import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useHNAuth } from "@/contexts/hn-auth-context";
import type { Comment as CommentType } from "@/hooks/use-story";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Spacing } from "@/constants/theme";
import { timeAgo } from "@hn/shared";
import { StyleSheet, TouchableOpacity, View } from "react-native";
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
  const textColor = useThemeColor({}, "text");
  const { isAuthenticated } = useHNAuth();

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
        <ThemedText type="bodySmall" style={styles.author}>{comment.by}</ThemedText>
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
      {!isCollapsed && (
        <>
          <HTMLText html={comment.text} style={styles.text} />
          {isAuthenticated && (
            <TouchableOpacity
              onPress={() => onReply(comment.id, comment.by)}
              style={styles.replyButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <IconSymbol
                name="arrowshape.turn.up.left"
                size={14}
                color={textColor}
                weight="medium"
              />
              <ThemedText type="caption" style={styles.replyButtonText}>
                Reply
              </ThemedText>
            </TouchableOpacity>
          )}
        </>
      )}
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
    borderLeftWidth: 2,
  },
  comment: {
    marginBottom: Spacing.lg,
    paddingLeft: Spacing.md,
    borderLeftWidth: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
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
  replyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  replyButtonText: {
    opacity: 0.6,
  },
});
