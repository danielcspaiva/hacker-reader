/**
 * Blocked users, persisted in AsyncStorage. Blocked users' stories and
 * comments are filtered from the app.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

import { createJsonListStore } from "./json-list-store";

export const BLOCKED_USERS_KEY = "@blocked_users";

export interface BlockedUser {
  username: string;
  blockedAt: number;
}

function isBlockedUser(value: unknown): value is BlockedUser {
  if (typeof value !== "object" || value === null) return false;
  if (!("username" in value) || !("blockedAt" in value)) return false;
  return (
    typeof value.username === "string" && typeof value.blockedAt === "number"
  );
}

const store = createJsonListStore({
  key: BLOCKED_USERS_KEY,
  guard: isBlockedUser,
  storage: AsyncStorage,
});

/** Throws if storage fails. */
export function getBlockedUsers(): Promise<BlockedUser[]> {
  return store.read();
}

export async function blockUser(username: string): Promise<void> {
  await store.update((users) =>
    users.some((u) => u.username === username)
      ? users
      : [...users, { username, blockedAt: Date.now() }]
  );
}

export async function unblockUser(username: string): Promise<void> {
  await store.update((users) => users.filter((u) => u.username !== username));
}

/** Replaces the list (iCloud sync applying merged changes). */
export async function replaceBlockedUsers(users: BlockedUser[]): Promise<void> {
  await store.update(() => users);
}

export function isBlockedUserRecord(value: unknown): value is BlockedUser {
  return isBlockedUser(value);
}

export function clearBlockedUsers(): Promise<void> {
  return store.clear();
}
