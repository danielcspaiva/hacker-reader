import { useQuery } from "@tanstack/react-query";
import { fetchOGMetadata, type OGMetadata } from "@/lib/shared";
import { queryKeys } from "@/lib/query-keys";

export function useOGMetadata(url?: string) {
  return useQuery<OGMetadata | null, Error>({
    queryKey: queryKeys.ogMetadata(url!),
    queryFn: ({ signal }) =>
      url ? fetchOGMetadata(url, signal) : Promise.resolve(null),
    enabled: !!url,
    staleTime: 60 * 60 * 1000, // 1 hour - OG data rarely changes
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: 1, // Only retry once for OG metadata
  });
}
