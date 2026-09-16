import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Spacing } from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { stripHTML, timeAgo, type HNItem } from "@/lib/shared";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Link } from "expo-router";
import { StyleSheet, View } from "react-native";

interface SubmissionCommentCardProps {
  comment: HNItem;
}

export function SubmissionCommentCard({ comment }: SubmissionCommentCardProps) {
  const borderColor = useThemeColor({}, "border");
  const mutedColor = useThemeColor({}, "tabIconDefault");

  // Parse and truncate comment text for preview
  const commentText = comment.text ? stripHTML(comment.text) : "";
  const preview =
    commentText.length > 200
      ? commentText.substring(0, 200) + "..."
      : commentText;

  return (
    <GlassView
      glassEffectStyle="regular"
      style={[styles.container, { borderColor }]}
    >
      <Link href={`/story/${comment.parent}?commentId=${comment.id}`}>
        <Link.Trigger>
          <View style={styles.content}>
            {/* Comment type indicator */}
            <View style={styles.header}>
              <IconSymbol
                name="bubble.left.and.bubble.right"
                size={14}
                color={mutedColor}
              />
              <ThemedText type="caption" style={styles.typeLabel}>
                Comment
              </ThemedText>
              {comment.deleted && (
                <ThemedText
                  type="caption"
                  style={[styles.deletedBadge, { color: "red" }]}
                >
                  Deleted
                </ThemedText>
              )}
            </View>

            {/* Comment preview */}
            {!comment.deleted && (
              <ThemedText
                type="body"
                style={styles.commentText}
                numberOfLines={4}
              >
                {preview}
              </ThemedText>
            )}

            {/* Metadata */}
            <View style={styles.metadata}>
              <ThemedText type="caption" style={styles.metadataText}>
                {timeAgo(comment.time || 0)}
              </ThemedText>
            </View>
          </View>
        </Link.Trigger>

        {/* Preview modal */}
        <Link.Preview />
      </Link>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
    borderRadius: 16,
    borderCurve: "continuous",
    borderWidth: isLiquidGlassAvailable() ? 0 : StyleSheet.hairlineWidth,
    marginBottom: Spacing.lg,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  typeLabel: {
    fontWeight: "600",
    opacity: 0.6,
  },
  deletedBadge: {
    fontWeight: "600",
    marginLeft: "auto",
  },
  commentText: {
    marginBottom: Spacing.sm,
    lineHeight: 22,
  },
  metadata: {
    flexDirection: "row",
    alignItems: "center",
  },
  metadataText: {
    opacity: 0.6,
  },
});
