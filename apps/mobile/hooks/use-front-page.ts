import { useQuery } from "@tanstack/react-query";

import { dayRange, todayDay } from "@/lib/format/day";
import { getFrontPageStories, hnKeys } from "@/lib/hn";

/** One UTC day's front page from Algolia. Finished days barely change. */
export function useFrontPage(day: string) {
  return useQuery({
    queryKey: hnKeys.frontPage(day),
    queryFn: ({ signal }) => {
      const { start, end } = dayRange(day);
      return getFrontPageStories(start, end, 30, signal);
    },
    staleTime: day < todayDay() ? 60 * 60 * 1000 : undefined,
  });
}
