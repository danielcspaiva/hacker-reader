/** The local daily digest setting: whether it is on and the delivery hour. */

export interface DigestSettingsEntry {
  enabled: boolean;
  /** Preferred local hour, 0-23. */
  hour: number;
}

export function isDigestSettingsEntry(
  value: unknown
): value is DigestSettingsEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    "enabled" in value &&
    typeof value.enabled === "boolean" &&
    "hour" in value &&
    typeof value.hour === "number" &&
    Number.isInteger(value.hour) &&
    value.hour >= 0 &&
    value.hour <= 23
  );
}
