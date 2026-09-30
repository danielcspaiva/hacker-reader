/**
 * Recent searches: the persisted list plus add/clear mutations. Local data,
 * so only our own mutations change it.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { hnKeys } from "@/lib/hn";
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
} from "@/lib/hn/local/recent-searches";
import { reportError } from "@/lib/observability/report-error";

export function useRecentSearches() {
  const queryClient = useQueryClient();
  const queryKey = hnKeys.recentSearches();

  const { data: recentSearches = [] } = useQuery({
    queryKey,
    queryFn: async () => {
      try {
        return await getRecentSearches();
      } catch (error) {
        reportError(error, { operation: "getRecentSearches" });
        throw error;
      }
    },
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });

  const addMutation = useMutation({
    mutationFn: addRecentSearch,
    onSuccess: (terms) => queryClient.setQueryData(queryKey, terms),
    onError: (error) => reportError(error, { operation: "addRecentSearch" }),
  });

  const clearMutation = useMutation({
    mutationFn: clearRecentSearches,
    onSuccess: () => queryClient.setQueryData(queryKey, []),
    onError: (error) =>
      reportError(error, { operation: "clearRecentSearches" }),
  });

  return {
    recentSearches,
    addSearch: addMutation.mutate,
    clearSearches: clearMutation.mutate,
  };
}
