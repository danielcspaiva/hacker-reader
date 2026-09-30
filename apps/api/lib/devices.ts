import { entitlementKey } from "./entitlement";
import {
  isBoolean,
  isFiniteNumber,
  isJsonObject,
  isString,
  isStringArray,
  type JsonValue,
} from "./json";
import type { Store } from "./store";

export type Platform = "ios" | "android";

export type PrefValue = boolean | number | string | string[];
export type Prefs = { [key: string]: PrefValue };

export type Device = {
  installId: string;
  platform: Platform;
  appVersion: string;
  timezone: string;
  expoPushToken?: string;
  hnUsername?: string;
  prefs: Prefs;
  createdAt: string;
  updatedAt: string;
};

/**
 * Validated `POST /devices` body. For `expoPushToken` and `hnUsername`,
 * `undefined` keeps the stored value and `null` clears it.
 */
export type DeviceInput = {
  platform: Platform;
  appVersion: string;
  timezone: string;
  expoPushToken?: string | null;
  hnUsername?: string | null;
  prefs?: Prefs;
};

export type Validation<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

const APP_VERSION = /^[0-9A-Za-z.+-]{1,32}$/;
const PUSH_TOKEN = /^Expo(?:nent)?PushToken\[[A-Za-z0-9_-]{10,64}\]$/;
const HN_USERNAME = /^[A-Za-z0-9_-]{2,15}$/;
const PREF_KEY = /^[\w.-]{1,40}$/;
const MAX_PREF_KEYS = 20;
const MAX_PREF_STRING = 100;
const MAX_PREF_ARRAY = 50;

export function isValidTimezone(value: string): boolean {
  if (value.length === 0 || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function isPlatform(value: JsonValue | undefined): value is Platform {
  return value === "ios" || value === "android";
}

function isPrefValue(value: JsonValue | undefined): value is PrefValue {
  if (isBoolean(value) || isFiniteNumber(value)) return true;
  if (isString(value)) return value.length <= MAX_PREF_STRING;
  return (
    isStringArray(value) &&
    value.length <= MAX_PREF_ARRAY &&
    value.every((item) => item.length <= MAX_PREF_STRING)
  );
}

type Field<T> = { ok: true; value: T } | { ok: false };

/** A string matching `test`, or `null` (clear) / `undefined` (keep). */
function optionalString(
  value: JsonValue | undefined,
  pattern: RegExp
): Field<string | null | undefined> {
  if (value === undefined || value === null) return { ok: true, value };
  if (isString(value) && pattern.test(value)) return { ok: true, value };
  return { ok: false };
}

function parsePrefs(
  value: JsonValue | undefined
): Validation<Prefs | undefined> {
  if (value === undefined) return { ok: true, value: undefined };
  if (!isJsonObject(value)) {
    return { ok: false, errors: ["prefs must be an object"] };
  }
  const entries = Object.entries(value);
  if (entries.length > MAX_PREF_KEYS) {
    return { ok: false, errors: ["prefs has too many keys"] };
  }

  const prefs: Prefs = {};
  for (const [key, entry] of entries) {
    if (!PREF_KEY.test(key)) {
      return {
        ok: false,
        errors: [`prefs key "${key.slice(0, 20)}" is invalid`],
      };
    }
    if (!isPrefValue(entry)) {
      return {
        ok: false,
        errors: [
          `prefs.${key} must be a boolean, number, string or string list`,
        ],
      };
    }
    prefs[key] = entry;
  }
  return { ok: true, value: prefs };
}

/** Hand-written validator for the `POST /api/v1/devices` body. */
export function parseDeviceInput(body: JsonValue): Validation<DeviceInput> {
  if (!isJsonObject(body)) {
    return { ok: false, errors: ["body must be a JSON object"] };
  }
  const errors: string[] = [];

  const { platform, appVersion, timezone } = body;
  if (!isPlatform(platform)) errors.push('platform must be "ios" or "android"');
  if (!isString(appVersion) || !APP_VERSION.test(appVersion)) {
    errors.push("appVersion must be a version string");
  }
  if (!isString(timezone) || !isValidTimezone(timezone)) {
    errors.push("timezone must be an IANA time zone");
  }

  const token = optionalString(body.expoPushToken, PUSH_TOKEN);
  if (!token.ok) errors.push("expoPushToken must be an Expo push token");
  const username = optionalString(body.hnUsername, HN_USERNAME);
  if (!username.ok) errors.push("hnUsername must be a Hacker News username");
  const prefs = parsePrefs(body.prefs);
  if (!prefs.ok) errors.push(...prefs.errors);

  if (
    errors.length > 0 ||
    !isPlatform(platform) ||
    !isString(appVersion) ||
    !isString(timezone) ||
    !token.ok ||
    !username.ok ||
    !prefs.ok
  ) {
    return { ok: false, errors };
  }

  const value: DeviceInput = { platform, appVersion, timezone };
  if (token.value !== undefined) value.expoPushToken = token.value;
  if (username.value !== undefined) value.hnUsername = username.value;
  if (prefs.value !== undefined) value.prefs = prefs.value;
  return { ok: true, value };
}

export const DEVICE_INDEX_KEY = "devices";

/**
 * Device records expire 45 days after the last upsert. A Pro app registers on
 * every launch and foreground, so lapsed users' records disappear by themselves.
 */
export const DEVICE_TTL_SECONDS = 45 * 24 * 60 * 60;
const DEVICE_TTL = { ttlSeconds: DEVICE_TTL_SECONDS };

export const deviceKey = (installId: string) => `device:${installId}`;
const pushTokenKey = (token: string) => `pushtoken:${token}`;

export async function getDevice(
  store: Store,
  installId: string
): Promise<Device | null> {
  return store.get<Device>(deviceKey(installId));
}

function withoutPushToken(device: Device): Device {
  const copy = { ...device };
  delete copy.expoPushToken;
  return copy;
}

/** Creates or updates the device for an install id and keeps the indexes. */
export async function upsertDevice(
  store: Store,
  installId: string,
  input: DeviceInput,
  now: Date = new Date()
): Promise<Device> {
  const existing = await getDevice(store, installId);
  const timestamp = now.toISOString();

  const device: Device = {
    installId,
    platform: input.platform,
    appVersion: input.appVersion,
    timezone: input.timezone,
    // Merged, so a feature toggling its own pref leaves the others alone.
    prefs: { ...existing?.prefs, ...input.prefs },
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
  const expoPushToken =
    input.expoPushToken === undefined
      ? existing?.expoPushToken
      : input.expoPushToken;
  if (expoPushToken) device.expoPushToken = expoPushToken;
  const hnUsername =
    input.hnUsername === undefined ? existing?.hnUsername : input.hnUsername;
  if (hnUsername) device.hnUsername = hnUsername;

  await store.set(deviceKey(installId), device, DEVICE_TTL);
  await store.sadd(DEVICE_INDEX_KEY, installId);

  // A token belongs to one install: drop the reverse entry of a replaced
  // token, and let a reinstall that reuses a token take it over.
  if (existing?.expoPushToken && existing.expoPushToken !== expoPushToken) {
    await store.del(pushTokenKey(existing.expoPushToken));
  }
  if (expoPushToken) {
    const previousOwner = await store.get<string>(pushTokenKey(expoPushToken));
    if (previousOwner && previousOwner !== installId) {
      const other = await getDevice(store, previousOwner);
      if (other?.expoPushToken === expoPushToken) {
        await store.set(
          deviceKey(previousOwner),
          withoutPushToken(other),
          DEVICE_TTL
        );
      }
    }
    await store.set(pushTokenKey(expoPushToken), installId, DEVICE_TTL);
  }

  return device;
}

/** Forgets everything stored for an install id (privacy: "Delete my Pro data"). */
export async function deleteDeviceData(
  store: Store,
  installId: string
): Promise<void> {
  const existing = await getDevice(store, installId);
  if (existing?.expoPushToken) {
    await store.del(pushTokenKey(existing.expoPushToken));
  }
  await store.del(deviceKey(installId), entitlementKey(installId));
  await store.srem(DEVICE_INDEX_KEY, installId);
}

/** Removes a dead push token (Expo said `DeviceNotRegistered`) from its device. */
export async function removePushToken(
  store: Store,
  token: string
): Promise<void> {
  const owner = await store.get<string>(pushTokenKey(token));
  await store.del(pushTokenKey(token));
  if (!owner) return;
  const device = await getDevice(store, owner);
  if (device?.expoPushToken === token) {
    await store.set(deviceKey(owner), withoutPushToken(device), DEVICE_TTL);
  }
}

/**
 * Drops index members whose device record has expired or been deleted. The
 * index itself never expires, so the cron PRs that iterate it call this first.
 * Returns how many ids were removed.
 */
export async function pruneDeviceIndex(store: Store): Promise<number> {
  const ids = await store.smembers(DEVICE_INDEX_KEY);
  const dangling: string[] = [];
  for (const id of ids) {
    if ((await getDevice(store, id)) === null) dangling.push(id);
  }
  await store.srem(DEVICE_INDEX_KEY, ...dangling);
  return dangling.length;
}
