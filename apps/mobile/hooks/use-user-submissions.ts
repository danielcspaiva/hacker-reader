import { useQuery } from "@tanstack/react-query";

import { getItems, hnKeys, type HNItem } from "@/lib/hn";

export function useUserSubmissions(submittedIds: number[] | undefined) {
  return useQuery<HNItem[]>({
    queryKey: hnKeys.submissions(submittedIds),
    queryFn: async () => {
      if (!submittedIds || submittedIds.length === 0) {
        return [];
      }
      const items = await getItems(submittedIds.slice(0, 50));
      // HN returns bare {id, type} stubs for purged items; they have no time.
      return items.filter(
        (item) => !item.deleted && !item.dead && item.time !== undefined
      );
    },
    enabled: !!submittedIds && submittedIds.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: [],
  });
}
