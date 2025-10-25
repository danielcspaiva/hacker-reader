import { ThemedText } from "@/components/themed-text";
import type { Comment as CommentType } from "@/hooks/use-story";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Spacing } from "@/constants/theme";
import { timeAgo } from "@/lib/utils/time";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { HTMLText } from "./html-text";

interface CommentItemProps {
  comment: CommentType;
  depth: number;
  isCollapsed: boolean;
  onToggleCollapse: (id: number) => void;
}

export function CommentItem({
  comment,
  depth,
  isCollapsed,
  onToggleCollapse,
}: CommentItemProps) {
  const borderColor = useThemeColor({}, "border");

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
});
