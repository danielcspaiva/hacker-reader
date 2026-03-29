import { useQuery } from "@tanstack/react-query";
import { loadJSON, saveJSON } from "@/lib/shared/storage/async-storage-utils";
import { queryKeys } from "@/lib/query-keys";

const VOTES_STORAGE_KEY = "hn-votes";

/**
 * Get all voted item IDs from storage
 */
async function getVotedIds(): Promise<number[]> {
  return loadJSON<number[]>(VOTES_STORAGE_KEY, []);
}

/**
 * Add a vote to storage
 */
export async function addVote(itemId: number): Promise<void> {
  const votes = await getVotedIds();
  if (!votes.includes(itemId)) {
    votes.push(itemId);
    await saveJSON(VOTES_STORAGE_KEY, votes);
  }
}

/**
 * Remove a vote from storage
 */
export async function removeVote(itemId: number): Promise<void> {
  const votes = await getVotedIds();
  const filtered = votes.filter((id) => id !== itemId);
  await saveJSON(VOTES_STORAGE_KEY, filtered);
}

/**
 * Check if an item has been voted on
 */
export async function hasVoted(itemId: number): Promise<boolean> {
  const votes = await getVotedIds();
  return votes.includes(itemId);
}

/**
 * Hook to get all voted item IDs
 */
export function useVotedIds() {
  return useQuery<number[], Error>({
    queryKey: queryKeys.votes,
    queryFn: getVotedIds,
    staleTime: 0, // Always fresh
  });
}

/**
 * Hook to check if a specific item has been voted on
 */
export function useHasVoted(itemId: number) {
  const { data: votedIds = [] } = useVotedIds();
  return votedIds.includes(itemId);
}
