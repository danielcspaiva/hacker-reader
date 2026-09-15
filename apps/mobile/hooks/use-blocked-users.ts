/**
 * Hook for managing blocked users
 *
 * Provides functions to block/unblock users and get the list of blocked users.
 * Uses React Query for state management and AsyncStorage for persistence.
 */

import {
  blockUser as storageBlockUser,
  getBlockedUsers,
  unblockUser as storageUnblockUser,
  type BlockedUser,
} from "@/lib/storage/blocked-users";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

const BLOCKED_USERS_QUERY_KEY = ["blockedUsers"];

export function useBlockedUsers() {
  const queryClient = useQueryClient();

  // Load blocked users with React Query
  const { data: blockedUsers = [], isLoading: loading } = useQuery<
    BlockedUser[]
  >({
    queryKey: BLOCKED_USERS_QUERY_KEY,
    queryFn: async () => {
      return await getBlockedUsers();
    },
    staleTime: Number.POSITIVE_INFINITY, // Never consider stale (manual invalidation only)
  });

  // Create a Set of blocked usernames for fast lookup
  const blockedUsernames = useMemo(() => {
    return new Set(blockedUsers.map((u) => u.username));
  }, [blockedUsers]);

  // Block a user mutation
  const blockMutation = useMutation({
    mutationFn: async (username: string) => {
      await storageBlockUser(username);
    },
    onSuccess: () => {
      // Invalidate and refetch blocked users across all components
      queryClient.invalidateQueries({ queryKey: BLOCKED_USERS_QUERY_KEY });
      // Invalidate stories to force feed to re-filter and remove blocked user's content
      queryClient.invalidateQueries({ queryKey: ["stories"] });
    },
    // Errors are reported by the storage layer (blockUser) and surfaced to the
    // user by the calling component, so no onError handler is needed here.
  });

  // Unblock a user mutation
  const unblockMutation = useMutation({
    mutationFn: async (username: string) => {
      await storageUnblockUser(username);
    },
    onSuccess: () => {
      // Invalidate and refetch blocked users across all components
      queryClient.invalidateQueries({ queryKey: BLOCKED_USERS_QUERY_KEY });
      // Invalidate stories to force feed to re-filter and show unblocked user's content
      queryClient.invalidateQueries({ queryKey: ["stories"] });
    },
    // Errors are reported by the storage layer (unblockUser) and surfaced to the
    // user by the calling component, so no onError handler is needed here.
  });

  // Block a user
  const blockUser = useCallback(
    async (username: string) => {
      await blockMutation.mutateAsync(username);
    },
    [blockMutation]
  );

  // Unblock a user
  const unblockUser = useCallback(
    async (username: string) => {
      await unblockMutation.mutateAsync(username);
    },
    [unblockMutation]
  );

  // Check if a user is blocked
  const isBlocked = useCallback(
    (username: string) => {
      return blockedUsernames.has(username);
    },
    [blockedUsernames]
  );

  // Manual refresh function
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: BLOCKED_USERS_QUERY_KEY });
  }, [queryClient]);

  return {
    blockedUsers,
    blockedUsernames,
    loading,
    blockUser,
    unblockUser,
    isBlocked,
    refresh,
  };
}
