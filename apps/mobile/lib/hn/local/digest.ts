/** The daily digest setting persisted in AsyncStorage (one entry). */

import AsyncStorage from "@react-native-async-storage/async-storage";

import { isDigestSettingsEntry, type DigestSettingsEntry } from "../digest";
import { createJsonListStore } from "./json-list-store";

export const DAILY_DIGEST_KEY = "@daily_digest";

const store = createJsonListStore({
  key: DAILY_DIGEST_KEY,
  guard: isDigestSettingsEntry,
  storage: AsyncStorage,
});

/** Throws if storage fails. Empty when the digest was never set up. */
export function getDigestSettings(): Promise<DigestSettingsEntry[]> {
  return store.read();
}

export function setDigestSettings(
  entry: DigestSettingsEntry | null
): Promise<DigestSettingsEntry[]> {
  return store.update(() => (entry ? [entry] : []));
}
