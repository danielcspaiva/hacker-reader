import { useHNAuth } from "@/contexts/hn-auth-context";
import type { Comment, StoryWithComments } from "@/hooks/use-story";
import { deleteComment } from "@/lib/shared/api/hn-write-api";
import { isAuthError } from "@/lib/shared/auth";
import { queryKeys } from "@/lib/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";

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
      if (!session) {
        throw new Error("Not authenticated");
      }
      await deleteComment(commentId, session);
      return commentId;
    },
    onMutate: async (commentId) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.story(storyId) });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<StoryWithComments>([
        "story",
        storyId,
      ]);

      // Optimistically remove the comment from cache
      queryClient.setQueryData<StoryWithComments>(
        queryKeys.story(storyId),
        (oldData) => {
          if (!oldData) return oldData;

          // Recursively remove the comment from the tree
          const removeComment = (comments: Comment[]): Comment[] => {
            return comments
              .filter((comment) => comment.id !== commentId)
              .map((comment) => ({
                ...comment,
                children: removeComment(comment.children),
              }));
          };

          return {
            ...oldData,
            comments: removeComment(oldData.comments),
            descendants: Math.max(0, (oldData.descendants || 0) - 1),
          };
        }
      );

      return { previousData };
    },
    onSuccess: (deletedCommentId) => {
      // Call the provided onSuccess callback
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
        queryClient.setQueryData(queryKeys.story(storyId), context.previousData);
      }

      if (isAuthError(error)) {
        switch (error.code) {
          case "NOT_LOGGED_IN":
            logout();
            Alert.alert("Session Expired", "Please log in again to continue", [
              { text: "OK" },
            ]);
            break;
          case "RATE_LIMITED":
            Alert.alert(
              "Slow Down",
              "You're performing actions too quickly. Please wait a moment.",
              [{ text: "OK" }]
            );
            break;
          case "PARSE_ERROR":
            Alert.alert(
              "Cannot Delete",
              error.message || "This comment cannot be deleted at this time.",
              [{ text: "OK" }]
            );
            break;
          default:
            Alert.alert("Error", error.message, [{ text: "OK" }]);
        }
      } else {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to delete comment. Please try again.";
        Alert.alert("Error", errorMessage, [{ text: "OK" }]);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency (but don't wait for it)
      queryClient.invalidateQueries({ queryKey: queryKeys.story(storyId) });
    },
  });
}
