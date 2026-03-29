import { useQuery } from "@tanstack/react-query";
import { getItems } from "@/lib/shared/api/hn-api";
import { queryKeys } from "@/lib/query-keys";
import type { HNItem } from "@/lib/shared/types";

/**
 * Hook to fetch user's submissions (stories and comments).
 * Shared between profile screen (for count) and submissions screen (for list).
 */
export function useUserSubmissions(submittedIds: number[] | undefined) {
  return useQuery<HNItem[]>({
    queryKey: queryKeys.submissions(submittedIds ?? []),
    queryFn: async () => {
      if (!submittedIds || submittedIds.length === 0) {
        return [];
      }
      // Fetch first 50 submissions (can be paginated later)
      const ids = submittedIds.slice(0, 50);
      return getItems(ids);
    },
    enabled: !!submittedIds && submittedIds.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    // Return empty array when query is disabled
    placeholderData: [],
  });
}
