import { useHNAuth } from "@/contexts/hn-auth-context";
import { useBlockUserWithFeedback } from "@/hooks/use-block-user";
import type { ReplyTarget } from "@/hooks/use-comment-mutation";
import { useDeleteCommentMutation } from "@/hooks/use-delete-comment-mutation";
import { confirmDestructive } from "@/lib/confirm-destructive";
import type { Comment } from "@/lib/hn";
import { showActionSheet, type SheetAction } from "@/lib/show-action-sheet";

/**
 * Returns the handler that opens a comment's action sheet: reply (signed in),
 * then delete for your own comment or block for anyone else's. One sheet built
 * on demand, instead of a menu in every row.
 */
export function useCommentActions({
  storyId,
  onReply,
}: {
  storyId: number;
  onReply: (target: ReplyTarget) => void;
}) {
  const { isAuthenticated, username } = useHNAuth();
  const deleteComment = useDeleteCommentMutation({ storyId });
  const blockUserWithFeedback = useBlockUserWithFeedback();

  return (comment: Comment) => {
    const isOwn = !!username && comment.by === username;
    const actions: SheetAction[] = [];

    if (isAuthenticated) {
      actions.push({
        label: "Reply",
        run: () => onReply({ commentId: comment.id, username: comment.by }),
      });
    }

    actions.push(
      isOwn
        ? {
            label: "Delete Comment",
            destructive: true,
            run: () =>
              confirmDestructive({
                title: "Delete Comment",
                message:
                  "Are you sure you want to delete this comment? This action cannot be undone.",
                confirmLabel: "Delete",
                onConfirm: () => {
                  if (!deleteComment.isPending)
                    deleteComment.mutate(comment.id);
                },
              }),
          }
        : {
            label: "Block User",
            destructive: true,
            run: () => blockUserWithFeedback(comment.by),
          }
    );

    showActionSheet({ title: comment.by, actions });
  };
}
