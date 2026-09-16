import { getItems } from "@/lib/shared/api/hn-api";
import type { HNItem } from "@/lib/shared/types";
import { useQuery } from "@tanstack/react-query";

export function useUserSubmissions(submittedIds: number[] | undefined) {
  return useQuery<HNItem[]>({
    queryKey: ["submissions", submittedIds],
    queryFn: async () => {
      if (!submittedIds || submittedIds.length === 0) {
        return [];
      }
      const items = await getItems(submittedIds.slice(0, 50));
      return items.filter((item) => !item.deleted && !item.dead);
    },
    enabled: !!submittedIds && submittedIds.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: [],
  });
}
