import { reportError } from "@/lib/observability";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";

const VOTES_STORAGE_KEY = "hn-votes";

/**
 * Get all voted item IDs from storage
 */
async function getVotedIds(): Promise<number[]> {
  try {
    const json = await AsyncStorage.getItem(VOTES_STORAGE_KEY);
    if (!json) return [];

    // Validate at the boundary: keep only numeric IDs.
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is number => typeof id === "number")
      : [];
  } catch (error) {
    reportError(error, { operation: "getVotedIds" });
    return [];
  }
}

/**
 * Add a vote to storage
 */
export async function addVote(itemId: number): Promise<void> {
  try {
    const votes = await getVotedIds();
    if (!votes.includes(itemId)) {
      votes.push(itemId);
      await AsyncStorage.setItem(VOTES_STORAGE_KEY, JSON.stringify(votes));
    }
  } catch (error) {
    reportError(error, { operation: "addVote", itemId });
  }
}

/**
 * Remove a vote from storage
 */
export async function removeVote(itemId: number): Promise<void> {
  try {
    const votes = await getVotedIds();
    const filtered = votes.filter((id) => id !== itemId);
    await AsyncStorage.setItem(VOTES_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    reportError(error, { operation: "removeVote", itemId });
  }
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
    queryKey: ["votes"],
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
