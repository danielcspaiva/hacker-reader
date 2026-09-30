import type { Prefs } from "../devices";
import {
  isBoolean,
  isFiniteNumber,
  isJsonObject,
  type JsonValue,
} from "../json";

/** `prefs.digest`: the daily digest switch and the preferred local hour. */
export type DigestPref = { enabled: boolean; hour: number };

export type DigestPrefResult =
  | { ok: true; value: DigestPref }
  | { ok: false; error: string };

/** Validates the `prefs.digest` value of `POST /devices`. */
export function parseDigestPref(
  value: JsonValue | undefined
): DigestPrefResult {
  if (!isJsonObject(value)) {
    return { ok: false, error: "prefs.digest must be an object" };
  }
  const { enabled, hour } = value;
  if (!isBoolean(enabled)) {
    return { ok: false, error: "prefs.digest.enabled must be a boolean" };
  }
  if (
    !isFiniteNumber(hour) ||
    !Number.isInteger(hour) ||
    hour < 0 ||
    hour > 23
  ) {
    return { ok: false, error: "prefs.digest.hour must be an integer 0 to 23" };
  }
  return { ok: true, value: { enabled, hour } };
}

/**
 * The stored digest preference when it is on and valid; null otherwise. Stored
 * prefs were validated on the way in, but the cron re-checks the shape.
 */
export function readDigestPref(prefs: Prefs): DigestPref | null {
  const parsed = parseDigestPref(prefs.digest);
  return parsed.ok && parsed.value.enabled ? parsed.value : null;
}
