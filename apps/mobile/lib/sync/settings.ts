/** iCloud sync preference and status, kept in AsyncStorage (per device, not synced). */

import AsyncStorage from "@react-native-async-storage/async-storage";

import { SYNCED_COLLECTIONS } from "./collections";

const ENABLED_KEY = "@icloud_sync_enabled";
const LAST_SYNCED_KEY = "@icloud_last_synced";

/** Null when the user never chose: on by default whenever iCloud is available. */
export async function getICloudSyncPreference(): Promise<boolean | null> {
  try {
    const value = await AsyncStorage.getItem(ENABLED_KEY);
    return value === null ? null : value === "1";
  } catch {
    return null;
  }
}

export async function setICloudSyncPreference(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(ENABLED_KEY, enabled ? "1" : "0");
}

export async function getLastSyncedAt(): Promise<number | null> {
  try {
    const value = await AsyncStorage.getItem(LAST_SYNCED_KEY);
    const parsed = value === null ? Number.NaN : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function setLastSyncedAt(at: number): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_SYNCED_KEY, String(at));
  } catch {
    // Only affects the "last synced" label.
  }
}

/**
 * Forgets the last-synced state of every collection. Needed after an iCloud
 * account change: the old state describes another account's data, and diffing
 * against it would turn items the new account never had into deletions.
 */
export async function resetSyncBases(): Promise<void> {
  await AsyncStorage.multiRemove(
    SYNCED_COLLECTIONS.map(({ baseKey }) => baseKey)
  );
}
