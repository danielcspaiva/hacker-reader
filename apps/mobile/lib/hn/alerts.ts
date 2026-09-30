/**
 * Keyword alerts (Pro): the rule shape, input normalisation and list rules.
 * Pure (no React Native), so it is node-tested. The server re-validates the
 * same limits in `apps/api/lib/alerts-match.ts`.
 */

import { normalizeMuteValue } from "./mutes-match";

/** `minPoints` choices, in the order the form shows them. */
export const ALERT_MIN_POINTS = [10, 50, 100, 250, 500] as const;
export type AlertMinPoints = (typeof ALERT_MIN_POINTS)[number];

export const MAX_ALERTS = 20;
export const MAX_ALERT_QUERY = 60;
export const DEFAULT_ALERT_MIN_POINTS: AlertMinPoints = 100;

const SITE_PREFIX = "site:";

export interface Alert {
  id: string;
  /** A keyword or phrase, or `site:example.com`. */
  query: string;
  minPoints: AlertMinPoints;
}

export type AlertKind = "keyword" | "site";

export function isAlertMinPoints(value: unknown): value is AlertMinPoints {
  return ALERT_MIN_POINTS.some((allowed) => allowed === value);
}

export function isAlert(value: unknown): value is Alert {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "query" in value &&
    "minPoints" in value &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.query === "string" &&
    value.query.length > 0 &&
    isAlertMinPoints(value.minPoints)
  );
}

export function isSiteQuery(query: string): boolean {
  return query.toLowerCase().startsWith(SITE_PREFIX);
}

/** The query to store and show ("SQLite", "site:example.com"), without the prefix for sites. */
export function alertLabel(query: string): string {
  return isSiteQuery(query) ? query.slice(SITE_PREFIX.length) : query;
}

/**
 * The query to store for user input, or null when it is empty, too long or (for
 * a site) not a host. Keywords keep their casing (matching ignores it) with
 * whitespace collapsed; a site is reduced to its bare host like a muted site.
 */
export function normalizeAlertQuery(
  kind: AlertKind,
  raw: string
): string | null {
  if (kind === "site") {
    const host = normalizeMuteValue("domain", raw.replace(/^site:/i, ""));
    const query = host ? `${SITE_PREFIX}${host}` : null;
    return query && query.length <= MAX_ALERT_QUERY ? query : null;
  }
  const query = raw.trim().replace(/\s+/g, " ");
  if (!query || query.length > MAX_ALERT_QUERY) return null;
  // A typed "site:x.com" keeps working as a site alert.
  return isSiteQuery(query) ? normalizeAlertQuery("site", query) : query;
}

/** A short random id, unique enough within one user's 20 alerts. */
export function createAlertId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export type AddAlertResult =
  | { ok: true; alerts: Alert[] }
  | { ok: false; reason: "invalid" | "limit" | "duplicate" };

/** Adds an alert unless the input is invalid, a duplicate, or the list is full. */
export function withAlert(
  alerts: readonly Alert[],
  input: { kind: AlertKind; text: string; minPoints: AlertMinPoints },
  id: string = createAlertId()
): AddAlertResult {
  const query = normalizeAlertQuery(input.kind, input.text);
  if (!query) return { ok: false, reason: "invalid" };
  const lower = query.toLowerCase();
  if (
    alerts.some(
      (alert) =>
        alert.query.toLowerCase() === lower &&
        alert.minPoints === input.minPoints
    )
  ) {
    return { ok: false, reason: "duplicate" };
  }
  if (alerts.length >= MAX_ALERTS) return { ok: false, reason: "limit" };
  return {
    ok: true,
    alerts: [...alerts, { id, query, minPoints: input.minPoints }],
  };
}

export function withoutAlert(alerts: readonly Alert[], id: string): Alert[] {
  return alerts.filter((alert) => alert.id !== id);
}

/** What goes to the server in `prefs.alerts`: exactly the three fields. */
export function toAlertPrefs(
  alerts: readonly Alert[]
): { id: string; query: string; minPoints: number }[] {
  return alerts
    .slice(0, MAX_ALERTS)
    .map(({ id, query, minPoints }) => ({ id, query, minPoints }));
}
