import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useHNAuth } from "@/contexts/hn-auth-context";
import { presentHNWriteError } from "@/hooks/present-hn-write-error";
import { useAnalytics } from "@/hooks/use-analytics";
import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { AnalyticsProperty } from "@/lib/analytics/posthog-properties";
import { hapticNotify, Haptics } from "@/lib/haptics";
import { hnKeys, requireSession, unvote, vote } from "@/lib/hn";
import { addVote, getVotedIds, removeVote } from "@/lib/hn/local/votes";
import { reportError } from "@/lib/observability/report-error";

/**
 * Hook to get all voted item IDs
 */
export function useVotedIds() {
  return useQuery<number[], Error>({
    queryKey: hnKeys.votes(),
    queryFn: async () => {
      try {
        return await getVotedIds();
      } catch (error) {
        reportError(error, { operation: "getVotedIds" });
        throw error;
      }
    },
    staleTime: 0, // Always fresh
    retry: false,
  });
}

/**
 * Hook to check if a specific item has been voted on
 */
export function useHasVoted(itemId: number) {
  const { data: votedIds = [] } = useVotedIds();
  return votedIds.includes(itemId);
}

/**
 * Upvote or unvote an item on HN, with an optimistic update of the local vote
 * list. `mutate(wasVoted)` takes the state being toggled away from.
 */
export function useToggleVote(itemId: number) {
  const queryClient = useQueryClient();
  const { session, logout } = useHNAuth();
  const analytics = useAnalytics();

  return useMutation<void, unknown, boolean, { previousVotes?: number[] }>({
    // Reconcile the persisted vote list after success; the visible HN score
    // isn't updated live, so nothing else needs invalidating.
    meta: { invalidates: [hnKeys.votes()] },
    mutationFn: async (wasVoted) => {
      const activeSession = requireSession(session);
      await (wasVoted
        ? unvote(itemId, activeSession)
        : vote(itemId, activeSession));

      // HN already has the vote; a local persistence failure must not read as a
      // failed vote, so it is reported and otherwise ignored.
      try {
        await (wasVoted ? removeVote(itemId) : addVote(itemId));
      } catch (error) {
        reportError(error, { operation: "persistVote", itemId });
      }
    },

    onMutate: async (wasVoted) => {
      await queryClient.cancelQueries({ queryKey: hnKeys.votes() });
      const previousVotes = queryClient.getQueryData<number[]>(hnKeys.votes());

      queryClient.setQueryData<number[]>(hnKeys.votes(), (old = []) =>
        wasVoted ? old.filter((id) => id !== itemId) : [...old, itemId]
      );

      return { previousVotes };
    },

    onError: (error, _wasVoted, context) => {
      hapticNotify(Haptics.NotificationFeedbackType.Error);
      if (context?.previousVotes) {
        queryClient.setQueryData(hnKeys.votes(), context.previousVotes);
      } else {
        // Nothing was cached to restore: reload the persisted list instead.
        void queryClient.invalidateQueries({ queryKey: hnKeys.votes() });
      }
      presentHNWriteError(error, {
        logout,
        operation: "vote",
        context: { itemId },
        failureMessage: "Failed to vote. Please try again.",
      });
    },

    onSuccess: (_data, wasVoted) => {
      analytics.track(
        wasVoted ? AnalyticsEvent.STORY_UNVOTED : AnalyticsEvent.STORY_UPVOTED,
        { [AnalyticsProperty.STORY_ID]: itemId }
      );
    },
  });
}
