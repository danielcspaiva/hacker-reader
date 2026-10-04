/**
 * Muted keywords and sites: the persisted list, add/remove mutations and a
 * compiled `isMuted` filter. The feed filters on the client, so a change only
 * needs the list refreshed.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAnalytics } from "@/hooks/use-analytics";
import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { AnalyticsProperty } from "@/lib/analytics/posthog-properties";
import { createMuteFilter, hnKeys, type Mute, type MuteKind } from "@/lib/hn";
import { addMute, getMutes, removeMute } from "@/lib/hn/local/mutes";
import { reportError } from "@/lib/observability/report-error";

export type MuteSource = "story_card" | "story_detail" | "settings";

/**
 * Add-only mutation, without the list query: cheap enough for every story
 * card's menu. Resolves to the stored value, or null for invalid input.
 */
export function useAddMute() {
  const queryClient = useQueryClient();
  const analytics = useAnalytics();

  const addMutation = useMutation({
    mutationFn: ({
      kind,
      value,
    }: {
      kind: MuteKind;
      value: string;
      source: MuteSource;
    }) => addMute(kind, value),
    onSuccess: (value, { kind, source }) => {
      void queryClient.invalidateQueries({ queryKey: hnKeys.mutes() });
      if (value) {
        analytics.track(AnalyticsEvent.MUTE_ADDED, {
          [AnalyticsProperty.MUTE_KIND]: kind,
          [AnalyticsProperty.MUTE_SOURCE]: source,
        });
      }
    },
    onError: (error, { kind }) =>
      reportError(error, { operation: "addMute", kind }),
  });

  return addMutation.mutateAsync;
}

export function useMutes() {
  const queryClient = useQueryClient();
  const analytics = useAnalytics();
  const addMute = useAddMute();

  const { data: mutes = [], isLoading: loading } = useQuery<Mute[]>({
    queryKey: hnKeys.mutes(),
    queryFn: async () => {
      try {
        return await getMutes();
      } catch (error) {
        reportError(error, { operation: "getMutes" });
        throw error;
      }
    },
    staleTime: Number.POSITIVE_INFINITY, // local data: only our own mutations change it
    retry: false,
  });

  // Compiled once per list change (React Compiler), not per card.
  const isMuted = createMuteFilter(mutes);

  const refreshList = () =>
    queryClient.invalidateQueries({ queryKey: hnKeys.mutes() });

  const removeMutation = useMutation({
    mutationFn: ({ kind, value }: { kind: MuteKind; value: string }) =>
      removeMute(kind, value),
    onSuccess: (_, { kind }) => {
      void refreshList();
      analytics.track(AnalyticsEvent.MUTE_REMOVED, {
        [AnalyticsProperty.MUTE_KIND]: kind,
      });
    },
    onError: (error, { kind }) =>
      reportError(error, { operation: "removeMute", kind }),
  });

  return {
    mutes,
    loading,
    isMuted,
    addMute,
    removeMute: removeMutation.mutateAsync,
  };
}
