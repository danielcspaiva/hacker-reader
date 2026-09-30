/**
 * Blocked users: the persisted list plus block/unblock/clear mutations.
 * The feed filters on the client, so a change only needs the list refreshed.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { hnKeys } from "@/lib/hn";
import {
  blockUser as storageBlockUser,
  clearBlockedUsers,
  getBlockedUsers,
  unblockUser as storageUnblockUser,
  type BlockedUser,
} from "@/lib/hn/local/blocked-users";
import { reportError } from "@/lib/observability/report-error";

export function useBlockedUsers() {
  const queryClient = useQueryClient();

  const { data: blockedUsers = [], isLoading: loading } = useQuery<
    BlockedUser[]
  >({
    queryKey: hnKeys.blockedUsers(),
    queryFn: async () => {
      try {
        return await getBlockedUsers();
      } catch (error) {
        reportError(error, { operation: "getBlockedUsers" });
        throw error;
      }
    },
    staleTime: Number.POSITIVE_INFINITY, // local data: only our own mutations change it
    retry: false,
  });

  const blockedUsernames = new Set(blockedUsers.map((u) => u.username));

  // Callers surface failures to the user; reporting happens here, once.
  const refreshList = () =>
    queryClient.invalidateQueries({ queryKey: hnKeys.blockedUsers() });

  const blockMutation = useMutation({
    mutationFn: storageBlockUser,
    onSuccess: refreshList,
    onError: (error, username) =>
      reportError(error, { operation: "blockUser", username }),
  });

  const unblockMutation = useMutation({
    mutationFn: storageUnblockUser,
    onSuccess: refreshList,
    onError: (error, username) =>
      reportError(error, { operation: "unblockUser", username }),
  });

  const clearAllMutation = useMutation({
    mutationFn: clearBlockedUsers,
    onSuccess: refreshList,
    onError: (error) => reportError(error, { operation: "clearBlockedUsers" }),
  });

  return {
    blockedUsers,
    blockedUsernames,
    loading,
    blockUser: blockMutation.mutateAsync,
    unblockUser: unblockMutation.mutateAsync,
    clearAll: clearAllMutation.mutateAsync,
    isBlocked: (username: string) => blockedUsernames.has(username),
  };
}
