/** Replies inbox state persisted in AsyncStorage: last-seen time and the notifications opt-in. */

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  isRepliesSeenEntry,
  isReplyNotificationsEntry,
  withSeenAt,
  type RepliesSeenEntry,
  type ReplyNotificationsEntry,
} from "../replies";
import { createJsonListStore } from "./json-list-store";

export const REPLIES_SEEN_KEY = "@replies_seen";
export const REPLY_NOTIFICATIONS_KEY = "@reply_notifications";

const seenStore = createJsonListStore({
  key: REPLIES_SEEN_KEY,
  guard: isRepliesSeenEntry,
  storage: AsyncStorage,
});

const notificationsStore = createJsonListStore({
  key: REPLY_NOTIFICATIONS_KEY,
  guard: isReplyNotificationsEntry,
  storage: AsyncStorage,
});

/** Throws if storage fails. */
export function getRepliesSeen(): Promise<RepliesSeenEntry[]> {
  return seenStore.read();
}

export function markRepliesSeen(
  username: string,
  seenAt: number
): Promise<RepliesSeenEntry[]> {
  return seenStore.update((entries) => withSeenAt(entries, username, seenAt));
}

/** Throws if storage fails. */
export function getReplyNotifications(): Promise<ReplyNotificationsEntry[]> {
  return notificationsStore.read();
}

/** One account at a time: enabling replaces any earlier entry. */
export function setReplyNotifications(
  username: string | null
): Promise<ReplyNotificationsEntry[]> {
  return notificationsStore.update(() => (username ? [{ username }] : []));
}
