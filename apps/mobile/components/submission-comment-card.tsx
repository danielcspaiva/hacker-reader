import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Spacing } from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { type HNItem } from "@/lib/shared";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Link } from "expo-router";
import { StyleSheet, View } from "react-native";

/**
 * Parse HTML entities and basic tags from HN comment text
 */
function parseHTMLText(html: string): string {
  return html
    .replace(/<p>/g, "\n\n")
    .replace(/<\/p>/g, "")
    .replace(/<i>(.*?)<\/i>/g, "$1")
    .replace(/<b>(.*?)<\/b>/g, "$1")
    .replace(/<a[^>]*>(.*?)<\/a>/g, "$1")
    .replace(/&#x2F;/g, "/")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

/**
 * Format timestamp to readable string
 */
function timeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

interface SubmissionCommentCardProps {
  comment: HNItem;
}

/**
 * Comment card component for displaying user's comment submissions
 * Shows a preview of the comment text and links to the parent story/comment
 * Matches the styling of StoryCard with GlassView
 */
export function SubmissionCommentCard({ comment }: SubmissionCommentCardProps) {
  const borderColor = useThemeColor({}, "border");
  const mutedColor = useThemeColor({}, "tabIconDefault");

  // Parse and truncate comment text for preview
  const commentText = comment.text ? parseHTMLText(comment.text) : "";
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
