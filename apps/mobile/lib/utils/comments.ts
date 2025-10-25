import type { Comment } from "@/hooks/use-story";

export interface FlatComment {
  comment: Comment;
  depth: number;
}

/**
 * Flatten nested comment tree into array with depth tracking
 * @param comments Array of nested comments
 * @param depth Current nesting depth (default 0)
 * @param collapsedIds Set of comment IDs that are collapsed
 * @returns Flattened array of comments with depth information
 */
export function flattenComments(
  comments: Comment[],
  depth: number = 0,
  collapsedIds: Set<number>
): FlatComment[] {
  const result: FlatComment[] = [];

  for (const comment of comments) {
    result.push({ comment, depth });

    // Only include children if this comment is not collapsed
    if (
      comment.children &&
      comment.children.length > 0 &&
      !collapsedIds.has(comment.id)
    ) {
      result.push(
        ...flattenComments(comment.children, depth + 1, collapsedIds)
      );
    }
  }

  return result;
}
