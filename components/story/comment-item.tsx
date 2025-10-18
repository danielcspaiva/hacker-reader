import { ThemedText } from "@/components/themed-text";
import type { Comment as CommentType } from "@/hooks/use-story";
import { useThemeColor } from "@/hooks/use-theme-color";
import { timeAgo } from "@/lib/utils/time";
import { StyleSheet, TouchableOpacity, View } from "react-native";
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

  // Build the innermost comment content
  let content = (
    <Animated.View
      style={[styles.comment, { borderLeftColor: borderColor }]}
      layout={LinearTransition.duration(200)}
    >
      <View style={styles.header}>
        <ThemedText style={styles.author}>{comment.by}</ThemedText>
        <ThemedText style={styles.time}>
          {" "}
          • {timeAgo(comment.time)}
        </ThemedText>
        {comment.children && comment.children.length > 0 && (
          <TouchableOpacity onPress={() => onToggleCollapse(comment.id)}>
            <ThemedText style={styles.collapseButton}>
              {" "}
              [{isCollapsed ? `+${comment.children.length}` : "−"}]
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>
      {!isCollapsed && (
        <Animated.View
          entering={FadeIn.duration(200)}
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
      <Animated.View
        key={i}
        style={[styles.nestedBorder, { borderLeftColor: borderColor }]}
        layout={LinearTransition.duration(200)}
      >
        {content}
      </Animated.View>
    );
  }

  return <View style={styles.container}>{content}</View>;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  nestedBorder: {
    paddingLeft: 12,
    borderLeftWidth: 2,
  },
  comment: {
    marginBottom: 16,
    paddingLeft: 12,
    borderLeftWidth: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  author: {
    fontSize: 13,
    fontWeight: "600",
  },
  time: {
    fontSize: 12,
    opacity: 0.5,
  },
  collapseButton: {
    fontSize: 12,
    opacity: 0.5,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
});
