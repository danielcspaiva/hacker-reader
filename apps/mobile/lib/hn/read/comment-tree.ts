import type { Comment } from "../types";

export interface FlatComment {
  comment: Comment;
  depth: number;
  /** Every descendant, including those hidden under a collapsed comment. */
  replyCount: number;
}

// Comment objects are immutable query data, so a count computed once stays valid.
const replyCounts = new WeakMap<Comment, number>();

function countReplies(comment: Comment): number {
  const cached = replyCounts.get(comment);
  if (cached !== undefined) return cached;
  let total = 0;
  for (const child of comment.children ?? []) {
    total += 1 + countReplies(child);
  }
  replyCounts.set(comment, total);
  return total;
}

/**
 * Flatten a comment tree depth-first, skipping the children of collapsed
 * comments. Iterative so a 3,000-comment thread is one linear pass.
 */
export function flattenComments(
  comments: Comment[],
  depth = 0,
  collapsedIds: Set<number>
): FlatComment[] {
  const result: FlatComment[] = [];
  const stack: { comment: Comment; depth: number }[] = [];
  for (let i = comments.length - 1; i >= 0; i--) {
    stack.push({ comment: comments[i], depth });
  }

  while (stack.length > 0) {
    const { comment, depth: level } = stack.pop()!;
    result.push({ comment, depth: level, replyCount: countReplies(comment) });

    const children = comment.children;
    if (children && children.length > 0 && !collapsedIds.has(comment.id)) {
      for (let i = children.length - 1; i >= 0; i--) {
        stack.push({ comment: children[i], depth: level + 1 });
      }
    }
  }

  return result;
}

export function addReplyToComment(
  comments: Comment[],
  parentId: number,
  newComment: Comment
): Comment[] {
  return comments.map((comment) => {
    if (comment.id === parentId) {
      return {
        ...comment,
        children: [...comment.children, newComment],
      };
    }
    if (comment.children.length > 0) {
      return {
        ...comment,
        children: addReplyToComment(comment.children, parentId, newComment),
      };
    }
    return comment;
  });
}

/** Remove the comment with id `commentId` (and its subtree) at any depth. */
export function removeComment(
  comments: Comment[],
  commentId: number
): Comment[] {
  return comments
    .filter((comment) => comment.id !== commentId)
    .map((comment) => ({
      ...comment,
      children: removeComment(comment.children, commentId),
    }));
}
