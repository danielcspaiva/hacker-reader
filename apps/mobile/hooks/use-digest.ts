import { useQuery } from "@tanstack/react-query";

import { getItems, hnKeys, type HNItem } from "@/lib/hn";
import { proApi } from "@/lib/pro/api";
import type { Digest } from "@/lib/pro/digest";
import { getInstallId } from "@/lib/pro/install-id";

/** One day's digest (Pro). A built digest never changes, so it is kept a while. */
export function useDigest(date: string) {
  return useQuery({
    queryKey: hnKeys.digest(date),
    queryFn: async (): Promise<Digest> =>
      proApi.getDigest(await getInstallId(), date),
    enabled: proApi.isConfigured,
    retry: false,
    staleTime: 60 * 60 * 1000,
  });
}

/**
 * The live HN items behind a digest's stories, in digest order, so the cards
 * show current points, comments and age. Deleted or dead stories drop out.
 */
export function useDigestStories(digest: Digest | undefined) {
  const ids = digest?.stories.map((story) => story.id) ?? [];
  return useQuery({
    queryKey: hnKeys.digestStories(digest?.date ?? ""),
    queryFn: async ({ signal }): Promise<HNItem[]> => {
      const items = await getItems(ids, signal);
      const byId = new Map(items.map((item) => [item.id, item]));
      return ids.flatMap((id) => {
        const item = byId.get(id);
        return item && !item.deleted && !item.dead ? [item] : [];
      });
    },
    enabled: digest !== undefined,
    staleTime: 5 * 60 * 1000,
  });
}
