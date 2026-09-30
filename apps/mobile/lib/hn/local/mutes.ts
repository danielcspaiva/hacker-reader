/**
 * Muted keywords and sites, persisted in AsyncStorage. Matching stories are
 * filtered from the feed (see `lib/hn/mutes-match.ts`).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

import { normalizeMuteValue, type Mute, type MuteKind } from "../mutes-match";
import { createJsonListStore } from "./json-list-store";

export const MUTES_KEY = "@mutes";

function isMute(value: unknown): value is Mute {
  if (typeof value !== "object" || value === null) return false;
  if (!("kind" in value) || !("value" in value) || !("createdAt" in value)) {
    return false;
  }
  return (
    (value.kind === "keyword" || value.kind === "domain") &&
    typeof value.value === "string" &&
    typeof value.createdAt === "number"
  );
}

const store = createJsonListStore({
  key: MUTES_KEY,
  guard: isMute,
  storage: AsyncStorage,
});

/** Throws if storage fails. */
export function getMutes(): Promise<Mute[]> {
  return store.read();
}

/**
 * Adds a mute; a duplicate is a no-op. Resolves to the normalised value, or
 * null when the input is empty or not a valid host.
 */
export async function addMute(
  kind: MuteKind,
  raw: string
): Promise<string | null> {
  const value = normalizeMuteValue(kind, raw);
  if (!value) return null;
  await store.update((mutes) =>
    mutes.some((m) => m.kind === kind && m.value === value)
      ? mutes
      : [...mutes, { kind, value, createdAt: Date.now() }]
  );
  return value;
}

/** Replaces the list (iCloud sync applying merged changes). */
export async function replaceMutes(mutes: Mute[]): Promise<void> {
  await store.update(() => mutes);
}

export function isMuteRecord(value: unknown): value is Mute {
  return isMute(value);
}

export async function removeMute(kind: MuteKind, value: string): Promise<void> {
  await store.update((mutes) =>
    mutes.filter((m) => !(m.kind === kind && m.value === value))
  );
}
