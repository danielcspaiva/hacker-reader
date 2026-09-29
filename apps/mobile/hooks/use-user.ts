import { useQuery } from "@tanstack/react-query";

import { getUser, hnKeys, type HNUser } from "@/lib/hn";

/**
 * Hook for fetching HN user data from the API.
 * Only fetches when a username is provided.
 *
 * @param username - HN username to fetch data for
 * @returns React Query result with user data
 *
 * @example
 * ```tsx
 * function Profile() {
 *   const { username } = useHNAuth();
 *   const { data: user, isLoading } = useUser(username);
 *
 *   if (isLoading) return <Text>Loading...</Text>;
 *   return <Text>{user?.karma} karma</Text>;
 * }
 * ```
 */
export function useUser(username: string | null) {
  return useQuery<HNUser | null>({
    queryKey: hnKeys.user(username),
    queryFn: () => {
      if (!username) {
        throw new Error("Username is required");
      }
      return getUser(username);
    },
    enabled: !!username,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
