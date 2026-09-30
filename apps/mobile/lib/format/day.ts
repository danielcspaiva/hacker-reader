/**
 * UTC calendar days as `YYYY-MM-DD` strings (the format of HN's `/front?day=`).
 * Pure helpers for the past front pages screen; no React Native imports.
 */

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const SECONDS_PER_DAY = 86_400;
const MS_PER_DAY = SECONDS_PER_DAY * 1000;

function utcMs(day: string): number {
  const match = DAY_RE.exec(day);
  if (!match) return Number.NaN;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** True for a real calendar day (rejects `2026-02-30`, `2026-9-1`, junk). */
export function isValidDay(day: string): boolean {
  const ms = utcMs(day);
  return !Number.isNaN(ms) && formatDay(new Date(ms)) === day;
}

/** `YYYY-MM-DD` of the UTC day containing `date`. */
export function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayDay(now: Date = new Date()): string {
  return formatDay(now);
}

export function yesterdayDay(now: Date = new Date()): string {
  return addDays(todayDay(now), -1);
}

export function addDays(day: string, delta: number): string {
  return formatDay(new Date(utcMs(day) + delta * MS_PER_DAY));
}

/** Unix-second bounds `[start, end)` of a UTC day. */
export function dayRange(day: string) {
  const start = utcMs(day) / 1000;
  return { start, end: start + SECONDS_PER_DAY };
}

/** A valid day no later than today; anything else becomes yesterday. */
export function resolveDay(
  day: string | undefined,
  now: Date = new Date()
): string {
  if (!day || !isValidDay(day)) return yesterdayDay(now);
  const today = todayDay(now);
  return day > today ? today : day;
}

/** "Sep 1, 2026", always the UTC day. */
export function formatDayLabel(day: string): string {
  return new Date(utcMs(day)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * A local-midnight `Date` showing the same Y/M/D, for native date pickers
 * (which work in the device time zone).
 */
export function dayToPickerDate(day: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date);
}

/** Inverse of `dayToPickerDate`: the picker's local Y/M/D as a day string. */
export function pickerDateToDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${String(date.getFullYear()).padStart(4, "0")}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
