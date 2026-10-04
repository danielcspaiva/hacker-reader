import { useQuery } from "@tanstack/react-query";

import { getStoriesByUrl, hnKeys } from "@/lib/hn";

/** Stories already on HN for a link, highest score first. */
export function useDiscussions(url: string | undefined) {
  return useQuery({
    queryKey: hnKeys.discussions(url ?? ""),
    queryFn: ({ signal }) => getStoriesByUrl(url ?? "", signal),
    enabled: !!url,
  });
}
