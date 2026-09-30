/**
 * When the signed-in user last opened the Replies inbox, kept in AsyncStorage
 * and React Query, plus the unread count the Profile row shows.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useHNAuth } from "@/contexts/hn-auth-context";
import { useReplies } from "@/hooks/use-replies";
import {
  countUnread,
  hnKeys,
  seenAtFor,
  type RepliesSeenEntry,
} from "@/lib/hn";
import { getRepliesSeen, markRepliesSeen } from "@/lib/hn/local/replies";
import { reportError } from "@/lib/observability/report-error";

const seenOptions = {
  queryKey: hnKeys.repliesSeen(),
  queryFn: async (): Promise<RepliesSeenEntry[]> => {
    try {
      return await getRepliesSeen();
    } catch (error) {
      reportError(error, { operation: "getRepliesSeen" });
      throw error;
    }
  },
  staleTime: Number.POSITIVE_INFINITY, // local data: only our own mutations change it
  retry: false,
} as const;

/** `seenAt` is undefined until loaded and for a user who never opened the inbox. */
export function useRepliesSeen() {
  const { username } = useHNAuth();
  const queryClient = useQueryClient();
  const { data: entries, isSuccess } = useQuery(seenOptions);

  const mutation = useMutation({
    mutationFn: ({ user, seenAt }: { user: string; seenAt: number }) =>
      markRepliesSeen(user, seenAt),
    onSuccess: (next) => queryClient.setQueryData(hnKeys.repliesSeen(), next),
    onError: (error) => reportError(error, { operation: "markRepliesSeen" }),
  });

  return {
    isLoaded: isSuccess,
    seenAt: username && entries ? seenAtFor(entries, username) : undefined,
    markSeen: (seenAt: number) => {
      if (username) mutation.mutate({ user: username, seenAt });
    },
  };
}

/**
 * Unread replies for the Profile row. The first time a user is seen, the
 * inbox is treated as read from now on, so a fresh sign-in does not start with
 * a badge for old replies.
 */
export function useUnreadReplies(): number {
  const { data } = useReplies();
  const { isLoaded, seenAt, markSeen } = useRepliesSeen();
  const needsBaseline = isLoaded && seenAt === undefined && data !== undefined;

  useEffect(() => {
    if (needsBaseline) markSeen(Math.floor(Date.now() / 1000));
    // `markSeen` is recreated every render; the baseline is written once.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [needsBaseline]);

  if (!data || seenAt === undefined) return 0;
  return countUnread(data, seenAt);
}
