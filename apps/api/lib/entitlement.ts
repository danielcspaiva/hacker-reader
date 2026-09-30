import { getObject, isString, type JsonValue } from "./json";
import type { Store } from "./store";

/** The RevenueCat entitlement that unlocks Pro. */
export const PRO_ENTITLEMENT_ID = "pro";

/** Everything Pro unlocks, as reported by `GET /api/v1/me`. */
export const PRO_FEATURES = [
  "reply_notifications",
  "keyword_alerts",
  "ai_summaries",
  "daily_digest",
  "alternate_icons",
] as const;

export type ProFeature = (typeof PRO_FEATURES)[number];

export interface Entitlement {
  pro: boolean;
  /** ISO timestamp; absent for lifetime grants or when not Pro. */
  expiresAt?: string;
}

export const entitlementKey = (installId: string) => `entitlement:${installId}`;

export const ENTITLEMENT_CACHE_SECONDS = 10 * 60;

const REVENUECAT_SUBSCRIBERS_URL = "https://api.revenuecat.com/v1/subscribers";

function parseDate(value: JsonValue | undefined): number | null {
  if (!isString(value)) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

/**
 * Reads the `pro` entitlement from a RevenueCat `GET /v1/subscribers/{id}` body.
 * Active when it has no expiry (lifetime) or expires in the future; a billing
 * grace period counts as active.
 */
export function parseEntitlement(body: JsonValue, now: number): Entitlement {
  const entitlements = getObject(getObject(body, "subscriber"), "entitlements");
  const entry = getObject(entitlements, PRO_ENTITLEMENT_ID);
  if (!entry) return { pro: false };

  if (entry.expires_date === null || entry.expires_date === undefined) {
    return { pro: true };
  }

  const expires = parseDate(entry.expires_date);
  const grace = parseDate(entry.grace_period_expires_date);
  const until = Math.max(expires ?? 0, grace ?? 0);
  if (until <= now) return { pro: false };
  return { pro: true, expiresAt: new Date(until).toISOString() };
}

export interface EntitlementDeps {
  store: Store;
  fetch?: typeof fetch;
  now?: () => number;
  secretKey?: string;
}

/** Asks RevenueCat for the subscriber and parses the `pro` entitlement. */
export async function fetchEntitlement(
  installId: string,
  deps: EntitlementDeps
): Promise<Entitlement> {
  const secretKey = deps.secretKey ?? process.env.REVENUECAT_SECRET_KEY;
  if (!secretKey) throw new Error("REVENUECAT_SECRET_KEY is not set");

  const doFetch = deps.fetch ?? fetch;
  const response = await doFetch(
    `${REVENUECAT_SUBSCRIBERS_URL}/${encodeURIComponent(installId)}`,
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: "application/json",
      },
    }
  );
  if (!response.ok) {
    throw new Error(`RevenueCat responded ${response.status}`);
  }
  return parseEntitlement(await response.json(), (deps.now ?? Date.now)());
}

/** Fetches from RevenueCat and overwrites the cached entitlement. */
export async function refreshEntitlement(
  installId: string,
  deps: EntitlementDeps
): Promise<Entitlement> {
  const now = (deps.now ?? Date.now)();
  const entitlement = await fetchEntitlement(installId, deps);

  // Never cache past the moment the entitlement lapses.
  let ttl = ENTITLEMENT_CACHE_SECONDS;
  if (entitlement.expiresAt) {
    const untilExpiry = Math.ceil(
      (Date.parse(entitlement.expiresAt) - now) / 1000
    );
    ttl = Math.max(1, Math.min(ttl, untilExpiry));
  }
  await deps.store.set(entitlementKey(installId), entitlement, {
    ttlSeconds: ttl,
  });
  return entitlement;
}

/** Cached entitlement (10 minutes), falling back to RevenueCat. */
export async function getEntitlement(
  installId: string,
  deps: EntitlementDeps
): Promise<Entitlement> {
  const cached = await deps.store.get<Entitlement>(entitlementKey(installId));
  if (cached) return cached;
  return refreshEntitlement(installId, deps);
}

export interface Me {
  pro: boolean;
  expiresAt?: string;
  features: ProFeature[];
}

/** The `GET /api/v1/me` payload. */
export function toMe(entitlement: Entitlement): Me {
  const me: Me = {
    pro: entitlement.pro,
    features: entitlement.pro ? [...PRO_FEATURES] : [],
  };
  if (entitlement.pro && entitlement.expiresAt) {
    me.expiresAt = entitlement.expiresAt;
  }
  return me;
}
