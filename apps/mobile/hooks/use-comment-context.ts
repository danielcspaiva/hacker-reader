import { skipToken, useQuery } from "@tanstack/react-query";

import { getItem, getStoryWithComments, hnKeys, type HNItem } from "@/lib/hn";

const PARENT_STALE_TIME = 10 * 60 * 1000;

/**
 * Where a submitted comment lives: a label for what it replies to, and the id
 * of the story it belongs to (resolved once, then kept).
 */
export function useCommentContext(comment: HNItem) {
  const parentId = comment.parent;

  const { data: parent } = useQuery({
    queryKey: hnKeys.item(parentId ?? -1),
    queryFn:
      parentId === undefined
        ? skipToken
        : ({ signal }) => getItem(parentId, signal),
    staleTime: PARENT_STALE_TIME,
  });

  const { data: storyId } = useQuery({
    queryKey: hnKeys.commentStory(comment.id),
    queryFn: async () => (await getStoryWithComments(comment.id)).story_id,
    staleTime: Infinity,
  });

  const label = parent?.title
    ? parent.title
    : parent?.by
      ? `Reply to ${parent.by}`
      : null;

  return { label, storyId };
}
