/**
 * Time helpers for the daily digest. Everything goes through `Intl`, so DST and
 * half-hour zones (Asia/Kolkata) come out right without a tz database here.
 */

/** The push goes out in the first 15 minutes of the chosen hour. */
export const WINDOW_MINUTES = 15;

export interface LocalTime {
  /** `YYYY-MM-DD` on the device's wall clock. */
  date: string;
  hour: number;
  minute: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/** Wall-clock date and time in `timeZone`; null for an unknown zone. */
export function localTime(nowMs: number, timeZone: string): LocalTime | null {
  try {
    const parts: Record<string, string> = {};
    for (const part of formatterFor(timeZone).formatToParts(nowMs)) {
      parts[part.type] = part.value;
    }
    const hour = Number(parts.hour);
    const minute = Number(parts.minute);
    if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
    return {
      date: `${parts.year}-${parts.month}-${parts.day}`,
      hour: hour === 24 ? 0 : hour,
      minute,
    };
  } catch {
    return null;
  }
}

/** True when the local time is in `[hour:00, hour:15)`. */
export function inDeliveryWindow(
  nowMs: number,
  timeZone: string,
  hour: number
): boolean {
  const local = localTime(nowMs, timeZone);
  return local !== null && local.hour === hour && local.minute < WINDOW_MINUTES;
}

export const utcDate = (nowMs: number) =>
  new Date(nowMs).toISOString().slice(0, 10);

export function previousUtcDate(nowMs: number): string {
  return utcDate(nowMs - 24 * 60 * 60 * 1000);
}

/** `YYYY-MM-DD` that is a real calendar date (no 2026-02-30). */
export function isValidDigestDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
