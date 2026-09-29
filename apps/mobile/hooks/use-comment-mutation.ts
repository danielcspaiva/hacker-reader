import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useHNAuth } from "@/contexts/hn-auth-context";
import { presentHNWriteError } from "@/hooks/present-hn-write-error";
import type { Comment, StoryWithComments } from "@/lib/hn";
import { addReplyToComment, comment, hnKeys, requireSession } from "@/lib/hn";

/** How long HN needs before a refetch would show a comment we couldn't add locally. */
const REFETCH_DELAY_MS = 5000;

export interface ReplyTarget {
  commentId: number;
  username: string;
}

interface UseCommentMutationOptions {
  storyId: number;
  replyTarget: ReplyTarget | null;
  onSuccess?: () => void;
}

/**
 * Posts a comment and adds it to the story cache optimistically, falling back
 * to a delayed refetch when HN gives no comment id back.
 */
export function useCommentMutation({
  storyId,
  replyTarget,
  onSuccess,
}: UseCommentMutationOptions) {
  const { session, username, logout } = useHNAuth();
  const queryClient = useQueryClient();

  // Determine parent ID based on whether we're replying to a comment or the story
  const parentId = replyTarget ? replyTarget.commentId : storyId;

  return useMutation({
    // No meta.invalidates: this mutation reconciles the cache itself (optimistic
    // in-place update, with a delayed refetch fallback) because HN's API needs a
    // moment before a refetch would reflect the new comment.
    mutationFn: (text: string) =>
      comment(parentId, text, requireSession(session)),
    onSuccess: (newCommentId, postedText) => {
      onSuccess?.();

      if (!newCommentId) {
        // Couldn't extract the comment id: refetch once HN has caught up. The
        // input unlocks now rather than after the delay.
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: hnKeys.story(storyId) });
        }, REFETCH_DELAY_MS);
        return;
      }

      const newComment: Comment = {
        id: newCommentId,
        by: username || "unknown",
        time: Math.floor(Date.now() / 1000),
        text: postedText,
        children: [],
      };

      queryClient.setQueryData<StoryWithComments>(
        hnKeys.story(storyId),
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            comments: replyTarget
              ? addReplyToComment(
                  oldData.comments,
                  replyTarget.commentId,
                  newComment
                )
              : [...oldData.comments, newComment],
            descendants: (oldData.descendants || 0) + 1,
          };
        }
      );
    },
    onError: (error) =>
      presentHNWriteError(error, {
        logout,
        operation: "postComment",
        context: { storyId },
        failureMessage: "Failed to post comment. Please try again.",
        karmaMessage: "You need more karma on Hacker News to comment.",
      }),
  });
}
