import { safeEqual } from "./cron";
import { refreshEntitlement, type EntitlementDeps } from "./entitlement";
import { errorResponse, json, readJson } from "./http";
import { parseInstallId } from "./install-id";
import { getObject, isString, type JsonObject, type JsonValue } from "./json";

/** Events after which the cached entitlement must be refreshed. */
export const REFRESH_EVENT_TYPES = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "CANCELLATION",
  "EXPIRATION",
  "UNCANCELLATION",
  "PRODUCT_CHANGE",
  "BILLING_ISSUE",
]);

/** Install ids named by the event (user id, original id and aliases). */
export function eventInstallIds(event: JsonObject): string[] {
  const candidates: JsonValue[] = [
    event.app_user_id,
    event.original_app_user_id,
  ];
  if (Array.isArray(event.aliases)) candidates.push(...event.aliases);

  const ids = new Set<string>();
  for (const candidate of candidates) {
    // Anonymous RevenueCat ids ($RCAnonymousID:...) are not our install ids.
    const id = isString(candidate) ? parseInstallId(candidate) : null;
    if (id) ids.add(id);
  }
  return [...ids];
}

/**
 * RevenueCat webhook: checks the shared `Authorization` value, then refreshes
 * the cached entitlement of every install the event touches. A failed refresh
 * answers 500 so RevenueCat retries; unrelated event types answer 200.
 */
export async function handleRevenueCatWebhook(
  req: Request,
  deps: EntitlementDeps & { authSecret?: string }
): Promise<Response> {
  const secret = deps.authSecret ?? process.env.REVENUECAT_WEBHOOK_AUTH;
  const header = req.headers.get("authorization");
  if (!secret || !header || !safeEqual(header, secret)) {
    return errorResponse(401, "unauthorized", "Invalid webhook credentials");
  }

  const event = getObject(await readJson(req), "event");
  if (!event) return errorResponse(400, "invalid_body", "Missing event");

  if (!isString(event.type) || !REFRESH_EVENT_TYPES.has(event.type)) {
    return json({ ok: true, ignored: true });
  }

  const ids = eventInstallIds(event);
  const results = await Promise.allSettled(
    ids.map((id) => refreshEntitlement(id, deps))
  );
  if (results.some((result) => result.status === "rejected")) {
    return errorResponse(
      500,
      "refresh_failed",
      "Could not refresh entitlement"
    );
  }
  return json({ ok: true, refreshed: ids.length });
}
