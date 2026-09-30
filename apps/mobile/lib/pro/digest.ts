/**
 * The daily digest: the response shape of `GET /api/v1/digest/:date`, the
 * `prefs.digest` value, and the small pure rules around them. No React Native
 * imports (node tests).
 */

import { isValidDay } from "@/lib/format/day";

import {
  isJsonNumber,
  isJsonObject,
  isJsonString,
  type JsonValue,
} from "./json";

export interface DigestStory {
  id: number;
  title: string;
  url: string;
  domain: string;
  points: number;
  comments: number;
  /** One AI sentence on why it matters; empty when there is none. */
  blurb: string;
}

export interface Digest {
  /** UTC day, `YYYY-MM-DD`. */
  date: string;
  stories: DigestStory[];
  generatedAt: string;
}

/** `prefs.digest` as the API stores it. */
export interface DigestPrefValue {
  enabled: boolean;
  /** Preferred local hour, 0-23. */
  hour: number;
}

export const DEFAULT_DIGEST_HOUR = 8;

/** Hours offered where there is no native picker. */
export const COMMON_DIGEST_HOURS: readonly number[] = [6, 7, 8, 9, 12, 18];

export function isDigestHour(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 23
  );
}

/** "8 AM" / "20:00", following the device locale's 12 or 24 hour clock. */
export function formatDigestHour(hour: number, locale?: string): string {
  return new Date(2000, 0, 1, hour).toLocaleTimeString(locale, {
    hour: "numeric",
  });
}

/** "Wednesday, September 30", always the digest's UTC day. */
export function formatDigestDate(date: string): string {
  if (!isValidDay(date)) return date;
  const [year, month, day] = date.split("-").map(Number);
  return new Date(
    Date.UTC(year ?? 0, (month ?? 1) - 1, day)
  ).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function parseStory(value: JsonValue): DigestStory | null {
  if (!isJsonObject(value)) return null;
  const { id, title, url, domain, points, comments, blurb } = value;
  if (!isJsonNumber(id) || !Number.isInteger(id) || id <= 0) return null;
  if (!isJsonString(title) || !title.trim()) return null;
  return {
    id,
    title,
    url: isJsonString(url) ? url : "",
    domain: isJsonString(domain) ? domain : "",
    points: isJsonNumber(points) ? points : 0,
    comments: isJsonNumber(comments) ? comments : 0,
    blurb: isJsonString(blurb) ? blurb.trim() : "",
  };
}

/** Validates the API body; null when it is not a digest with stories. */
export function parseDigest(body: JsonValue): Digest | null {
  if (!isJsonObject(body)) return null;
  const { date, stories, generatedAt } = body;
  if (!isJsonString(date) || !isValidDay(date)) return null;
  if (!Array.isArray(stories)) return null;
  const parsed = stories.flatMap((story) => {
    const item = parseStory(story);
    return item ? [item] : [];
  });
  if (parsed.length === 0) return null;
  return {
    date,
    stories: parsed,
    generatedAt: isJsonString(generatedAt) ? generatedAt : "",
  };
}

export interface DigestFailure {
  title: string;
  message: string;
  needsPro: boolean;
  retryable: boolean;
}

/** What the digest screen says when loading failed. */
export function describeDigestFailure(
  status: number | undefined
): DigestFailure {
  if (status === 402) {
    return {
      title: "Daily digest is a Pro feature",
      message:
        "Hacker Reader Pro adds a morning digest of the day's best stories.",
      needsPro: true,
      retryable: false,
    };
  }
  if (status === 404) {
    return {
      title: "No digest for this day",
      message: "That day's digest isn't available. They are kept for a week.",
      needsPro: false,
      retryable: false,
    };
  }
  return {
    title: "Couldn't load the digest",
    message: "Check your connection and try again.",
    needsPro: false,
    retryable: true,
  };
}
