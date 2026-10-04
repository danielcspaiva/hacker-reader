/**
 * The persisted search sort, scope and filters. Falls back to the defaults
 * when storage fails; `isLoaded` lets the screen wait for the stored choice so
 * it doesn't search twice on launch.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { DEFAULT_SEARCH_OPTIONS, hnKeys, type SearchOptions } from "@/lib/hn";
import {
  getSearchOptions,
  saveSearchOptions,
} from "@/lib/hn/local/search-options";
import { reportError } from "@/lib/observability/report-error";

export function useSearchOptions() {
  const queryClient = useQueryClient();
  const queryKey = hnKeys.searchOptions();

  const { data, isPending } = useQuery({
    queryKey,
    queryFn: async () => {
      try {
        return await getSearchOptions();
      } catch (error) {
        reportError(error, { operation: "getSearchOptions" });
        return DEFAULT_SEARCH_OPTIONS;
      }
    },
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });

  const options = data ?? DEFAULT_SEARCH_OPTIONS;

  const saveMutation = useMutation({
    mutationFn: saveSearchOptions,
    onMutate: (next) => queryClient.setQueryData(queryKey, next),
    onError: (error) => reportError(error, { operation: "saveSearchOptions" }),
  });

  return {
    options,
    isLoaded: !isPending,
    setOptions: (change: Partial<SearchOptions>) =>
      saveMutation.mutate({ ...options, ...change }),
  };
}
