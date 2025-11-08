/**
 * Blocked Users Storage Utilities
 *
 * Manages the list of blocked users in AsyncStorage.
 * Blocked users' stories and comments are filtered from the app.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const BLOCKED_USERS_KEY = "@blocked_users";

export interface BlockedUser {
  username: string;
  blockedAt: number; // timestamp
}

/**
 * Get the list of blocked users
 */
export async function getBlockedUsers(): Promise<BlockedUser[]> {
  try {
    const json = await AsyncStorage.getItem(BLOCKED_USERS_KEY);
    if (!json) {
      return [];
    }
    const users = JSON.parse(json);
    return Array.isArray(users) ? users : [];
  } catch (error) {
    console.error("Failed to get blocked users:", error);
    return [];
  }
}

/**
 * Get the list of blocked usernames (for quick lookup)
 */
export async function getBlockedUsernames(): Promise<Set<string>> {
  const users = await getBlockedUsers();
  return new Set(users.map((u) => u.username));
}

/**
 * Check if a user is blocked
 */
export async function isUserBlocked(username: string): Promise<boolean> {
  const blockedUsernames = await getBlockedUsernames();
  return blockedUsernames.has(username);
}

/**
 * Block a user
 */
export async function blockUser(username: string): Promise<void> {
  try {
    const users = await getBlockedUsers();

    // Check if already blocked
    if (users.some((u) => u.username === username)) {
      return;
    }

    // Add to blocked list
    const newUser = {
      username,
      blockedAt: Date.now(),
    };
    users.push(newUser);

    await AsyncStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(users));
  } catch (error) {
    console.error("[BlockedUsers] Failed to block user:", error);
    throw error;
  }
}

/**
 * Unblock a user
 */
export async function unblockUser(username: string): Promise<void> {
  try {
    const users = await getBlockedUsers();
    const filtered = users.filter((u) => u.username !== username);
    await AsyncStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to unblock user:", error);
    throw error;
  }
}

/**
 * Clear all blocked users
 */
export async function clearBlockedUsers(): Promise<void> {
  try {
    await AsyncStorage.removeItem(BLOCKED_USERS_KEY);
  } catch (error) {
    console.error("Failed to clear blocked users:", error);
    throw error;
  }
}
