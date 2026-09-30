import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";

import { useHNAuth } from "@/contexts/hn-auth-context";
import { presentHNWriteError } from "@/hooks/present-hn-write-error";
import type { StoryWithComments } from "@/lib/hn";
import { deleteComment, hnKeys, removeComment, requireSession } from "@/lib/hn";

interface UseDeleteCommentMutationOptions {
  storyId: number;
  onSuccess?: () => void;
}

/**
 * Hook for deleting comments with optimistic cache updates
 *
 * Provides mutation logic for deleting comments on HN:
 * - Deletes comment via HN API
 * - Optimistically updates React Query cache
 * - Handles auth errors and rate limiting
 * - Falls back to query invalidation if cache update fails
 *
 * @param options - Configuration for the delete mutation
 * @returns Mutation object with mutate, isPending, etc.
 *
 * @example
 * ```tsx
 * function CommentItem({ comment, storyId }) {
 *   const deleteCommentMutation = useDeleteCommentMutation({
 *     storyId,
 *     onSuccess: () => console.log('Comment deleted!'),
 *   });
 *
 *   const handleDelete = () => {
 *     deleteCommentMutation.mutate(comment.id);
 *   };
 * }
 * ```
 */
export function useDeleteCommentMutation({
  storyId,
  onSuccess,
}: UseDeleteCommentMutationOptions) {
  const { session, logout } = useHNAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: number) => {
      await deleteComment(commentId, requireSession(session));
      return commentId;
    },
    onMutate: async (commentId) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: hnKeys.story(storyId) });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<StoryWithComments>(
        hnKeys.story(storyId)
      );

      // Optimistically remove the comment from cache
      queryClient.setQueryData<StoryWithComments>(
        hnKeys.story(storyId),
        (oldData) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            comments: removeComment(oldData.comments, commentId),
            descendants: Math.max(0, (oldData.descendants || 0) - 1),
          };
        }
      );

      return { previousData };
    },
    onSuccess: (_deletedCommentId) => {
      onSuccess?.();

      Alert.alert(
        "Comment Deleted",
        "Your comment has been deleted successfully.",
        [{ text: "OK" }]
      );
    },
    onError: (error, _commentId, context) => {
      // Rollback optimistic update on error
      if (context?.previousData) {
        queryClient.setQueryData(hnKeys.story(storyId), context.previousData);
      }

      presentHNWriteError(error, {
        logout,
        operation: "deleteComment",
        context: { storyId },
        failureMessage: "Failed to delete comment. Please try again.",
      });
    },
    onSettled: () => {
      // Refetch to ensure consistency (but don't wait for it)
      queryClient.invalidateQueries({ queryKey: hnKeys.story(storyId) });
    },
  });
}
