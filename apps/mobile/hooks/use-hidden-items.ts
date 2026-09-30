/**
 * Hidden stories, persisted in AsyncStorage and held in React Query. The feed
 * filters on the client, so a change only needs this list updated.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { hnKeys } from "@/lib/hn";
import { clearHiddenIds, getHiddenIds, hideId } from "@/lib/hn/local/hidden";
import { reportError } from "@/lib/observability/report-error";

export function useHiddenStories() {
  const queryClient = useQueryClient();
  const queryKey = hnKeys.hidden();

  const { data: hiddenIds = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      try {
        return await getHiddenIds();
      } catch (error) {
        reportError(error, { operation: "getHiddenIds" });
        throw error;
      }
    },
    staleTime: Number.POSITIVE_INFINITY, // local data: only our own mutations change it
    retry: false,
  });

  const hideMutation = useMutation({
    mutationFn: hideId,
    onSuccess: (ids) => queryClient.setQueryData(queryKey, ids),
    onError: (error, itemId) =>
      reportError(error, { operation: "hideStory", itemId }),
  });

  const clearAllMutation = useMutation({
    mutationFn: clearHiddenIds,
    onSuccess: () => queryClient.setQueryData(queryKey, []),
    onError: (error) => reportError(error, { operation: "clearHiddenStories" }),
  });

  return {
    hiddenIds,
    isHidden: (itemId: number) => hiddenIds.includes(itemId),
    hideItem: hideMutation.mutate,
    clearAll: clearAllMutation.mutateAsync,
    isLoading,
    count: hiddenIds.length,
  };
}
