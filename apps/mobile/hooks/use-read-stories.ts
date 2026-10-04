/**
 * Stories you have opened, persisted in AsyncStorage and held in React Query.
 * One query feeds every card: per-card reads go through `select` on an id ->
 * entry index built once per data change.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { hnKeys, readEntryIndex, type ReadStoryEntry } from "@/lib/hn";
import {
  clearReadStories,
  getReadStories,
  markStoryRead,
  markStoryUnread,
  recordStoryVisit,
} from "@/lib/hn/local/read-stories";
import { reportError } from "@/lib/observability/report-error";

const readStoriesOptions = {
  queryKey: hnKeys.readStories(),
  queryFn: async (): Promise<ReadStoryEntry[]> => {
    try {
      return await getReadStories();
    } catch (error) {
      reportError(error, { operation: "getReadStories" });
      throw error;
    }
  },
  staleTime: Number.POSITIVE_INFINITY, // local data: only our own mutations change it
  retry: false,
} as const;

/** The read entry for one story (undefined when unread); O(1) per card. */
export function useReadEntry(storyId: number) {
  return useQuery<ReadStoryEntry[], Error, ReadStoryEntry | undefined>({
    ...readStoriesOptions,
    select: (entries) => readEntryIndex(entries).get(storyId),
  });
}

/** Read-state writes: record a visit, mark read/unread, clear everything. */
export function useReadStories() {
  const queryClient = useQueryClient();
  const queryKey = hnKeys.readStories();
  const { data: entries = [], isSuccess } = useQuery(readStoriesOptions);

  const setEntries = (next: ReadStoryEntry[]) =>
    queryClient.setQueryData(queryKey, next);

  const visitMutation = useMutation({
    mutationFn: recordStoryVisit,
    onSuccess: setEntries,
    onError: (error, { id }) =>
      reportError(error, { operation: "recordStoryVisit", storyId: id }),
  });

  const markReadMutation = useMutation({
    mutationFn: markStoryRead,
    onSuccess: setEntries,
    onError: (error, { id }) =>
      reportError(error, { operation: "markStoryRead", storyId: id }),
  });

  const markUnreadMutation = useMutation({
    mutationFn: markStoryUnread,
    onSuccess: setEntries,
    onError: (error, id) =>
      reportError(error, { operation: "markStoryUnread", storyId: id }),
  });

  const clearMutation = useMutation({
    mutationFn: clearReadStories,
    onSuccess: () => setEntries([]),
    onError: (error) => reportError(error, { operation: "clearReadStories" }),
  });

  return {
    /** False until the stored list has loaded (a visit must not be recorded before). */
    isLoaded: isSuccess,
    count: entries.length,
    getEntry: (storyId: number) => readEntryIndex(entries).get(storyId),
    recordVisit: visitMutation.mutate,
    markRead: markReadMutation.mutate,
    markUnread: markUnreadMutation.mutate,
    clearAll: clearMutation.mutateAsync,
  };
}
