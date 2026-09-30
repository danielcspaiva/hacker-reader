import { requirePro } from "../auth";
import type { EntitlementDeps } from "../entitlement";
import { errorResponse, json } from "../http";
import { limitByIp } from "../rate-limit";
import type { Store } from "../store";
import { readDigest } from "./store";
import { isValidDigestDate } from "./window";

export interface DigestDeps {
  store: Store;
  fetch?: typeof fetch;
  now?: () => number;
  /** RevenueCat secret override (tests). */
  secretKey?: string;
}

/**
 * `GET /api/v1/digest/:date`. The IP limit comes first (before any RevenueCat
 * lookup), then the cheap date check, then Pro, then the stored digest.
 */
export async function handleDigest(
  req: Request,
  rawDate: string,
  deps: DigestDeps
): Promise<Response> {
  const { store } = deps;

  const blocked = await limitByIp(store, req, "digest");
  if (blocked) return blocked;

  if (!isValidDigestDate(rawDate)) {
    return errorResponse(400, "invalid_date", "Invalid digest date");
  }

  const entitlementDeps: Partial<EntitlementDeps> & { store: Store } = {
    store,
  };
  if (deps.fetch) entitlementDeps.fetch = deps.fetch;
  if (deps.now) entitlementDeps.now = deps.now;
  if (deps.secretKey) entitlementDeps.secretKey = deps.secretKey;
  const auth = await requirePro(req, entitlementDeps);
  if (!auth.ok) return auth.response;

  const digest = await readDigest(store, rawDate);
  if (!digest) return errorResponse(404, "not_found", "No digest for that day");
  return json(digest);
}
