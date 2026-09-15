import { useHNAuth } from "@/contexts/hn-auth-context";
import type { Comment, StoryWithComments } from "@/hooks/use-story";
import { reportError } from "@/lib/observability";
import { comment } from "@/lib/shared/api";
import { isAuthError } from "@/lib/shared/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";

interface ReplyTarget {
  commentId: number;
  username: string;
}

interface UseCommentMutationOptions {
  storyId: number;
  replyTarget: ReplyTarget | null;
  onSuccess?: () => void;
}

/**
 * Hook for posting comments with optimistic cache updates
 *
 * Provides mutation logic for posting comments to HN:
 * - Posts comment to HN API
 * - Optimistically updates React Query cache
 * - Handles auth errors and rate limiting
 * - Falls back to query invalidation if cache update fails
 *
 * @param options - Configuration for the comment mutation
 * @returns Mutation object with mutate, isPending, etc.
 *
 * @example
 * ```tsx
 * function CommentInput({ storyId, replyTarget }) {
 *   const commentMutation = useCommentMutation({
 *     storyId,
 *     replyTarget,
 *     onSuccess: () => console.log('Comment posted!'),
 *   });
 *
 *   const handleSubmit = () => {
 *     commentMutation.mutate('This is my comment');
 *   };
 * }
 * ```
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
    mutationFn: async (text: string) => {
      if (!session) {
        throw new Error("Not authenticated");
      }
      const newCommentId = await comment(parentId, text, session);
      return newCommentId;
    },
    onSuccess: async (newCommentId, postedText) => {
      // Call the provided onSuccess callback
      onSuccess?.();

      if (newCommentId) {
        // We have the comment ID and text! Add directly to cache without waiting for HN API
        try {
          // Add the comment directly to the cache using the data we already have
          queryClient.setQueryData<StoryWithComments>(
            ["story", storyId],
            (oldData) => {
              if (!oldData) return oldData;

              const newComment: Comment = {
                id: newCommentId,
                by: username || "unknown", // Use username from auth context
                time: Math.floor(Date.now() / 1000), // Current time
                text: postedText, // The text we just posted
                children: [],
              };

              // If replying to story, add to top-level
              if (!replyTarget) {
                return {
                  ...oldData,
                  comments: [...oldData.comments, newComment],
                  descendants: (oldData.descendants || 0) + 1,
                };
              }

              // If replying to comment, find parent and add as child
              const addReplyToComment = (comments: Comment[]): Comment[] => {
                return comments.map((comment) => {
                  if (comment.id === replyTarget.commentId) {
                    return {
                      ...comment,
                      children: [...comment.children, newComment],
                    };
                  }
                  if (comment.children.length > 0) {
                    return {
                      ...comment,
                      children: addReplyToComment(comment.children),
                    };
                  }
                  return comment;
                });
              };

              return {
                ...oldData,
                comments: addReplyToComment(oldData.comments),
                descendants: (oldData.descendants || 0) + 1,
              };
            }
          );
        } catch (error) {
          // Updating the cache in place is best-effort; if it throws something
          // unexpected, report it and fall back to refetching from the server.
          reportError(error, { operation: "commentCacheUpdate", storyId });
          await new Promise<void>((resolve) => setTimeout(resolve, 8000));
          queryClient.invalidateQueries({ queryKey: ["story", storyId] });
        }
      } else {
        // Couldn't extract comment ID, fall back to waiting
        await new Promise<void>((resolve) => setTimeout(resolve, 5000));
        queryClient.invalidateQueries({ queryKey: ["story", storyId] });
      }
    },
    onError: (error) => {
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
              "Something Went Wrong",
              "The app may need an update. Please try again later.",
              [{ text: "OK" }]
            );
            break;
          default:
            Alert.alert("Error", error.message);
        }
      } else {
        // Unexpected failure (not an expected auth case) — report it.
        reportError(error, { operation: "postComment", storyId });
        Alert.alert("Error", "Failed to post comment. Please try again.");
      }
    },
  });
}
