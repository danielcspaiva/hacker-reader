/**
 * The Replies inbox: replies to the signed-in user's latest stories and
 * comments, fetched client-side from the public HN API (free, no server).
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useHNAuth } from "@/contexts/hn-auth-context";
import {
  buildReplies,
  collectReplyIds,
  getItems,
  getUser,
  hnKeys,
  isLiveItem,
  REPLIES_SUBMISSIONS_LIMIT,
  type HNItem,
  type ReplyEntry,
} from "@/lib/hn";

export function useReplies() {
  const { username, isAuthenticated } = useHNAuth();
  const queryClient = useQueryClient();

  return useQuery<ReplyEntry[]>({
    queryKey: hnKeys.replies(username),
    queryFn: async ({ signal }) => {
      if (!username) return [];
      const user = await getUser(username, signal);
      const ids = (user?.submitted ?? []).slice(0, REPLIES_SUBMISSIONS_LIMIT);
      const submissions = (await getItems(ids, signal)).filter(isLiveItem);
      const replies = await getItems(collectReplyIds(submissions), signal);

      // Seed the item cache so a row's context lookups (`useCommentContext`)
      // find its parent without another request.
      const seed = (items: HNItem[]) =>
        items.forEach((item) =>
          queryClient.setQueryData(hnKeys.item(item.id), item)
        );
      seed(submissions);
      seed(replies);

      return buildReplies(submissions, replies, username);
    },
    enabled: isAuthenticated && !!username,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
