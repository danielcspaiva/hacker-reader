import { skipToken, useQuery } from "@tanstack/react-query";

import { getItem, getStoryWithComments, hnKeys, type HNItem } from "@/lib/hn";

const PARENT_STALE_TIME = 10 * 60 * 1000;

/** Story context already in hand (search hits carry it), so no lookups run. */
export interface KnownCommentContext {
  storyId?: number;
  storyTitle?: string;
}

function parentLabel(parent: HNItem | null | undefined): string | null {
  if (parent?.title) return parent.title;
  return parent?.by ? `Reply to ${parent.by}` : null;
}

/**
 * Where a submitted comment lives: a label for what it replies to, and the id
 * of the story it belongs to (resolved once, then kept). Anything in `known`
 * is used as is and not fetched.
 */
export function useCommentContext(
  comment: HNItem,
  known: KnownCommentContext = {}
) {
  const parentId = known.storyTitle ? undefined : comment.parent;

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
    queryFn:
      known.storyId !== undefined
        ? skipToken
        : async () => (await getStoryWithComments(comment.id)).story_id,
    staleTime: Infinity,
  });

  const label = known.storyTitle ?? parentLabel(parent);

  return { label, storyId: known.storyId ?? storyId };
}
