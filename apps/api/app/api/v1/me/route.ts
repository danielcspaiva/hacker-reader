import { requireInstall } from "@/lib/auth";
import { getEntitlement, toMe } from "@/lib/entitlement";
import { errorResponse, json } from "@/lib/http";
import { limitByIp, rateLimit, rateLimitedResponse } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";

export async function GET(req: Request) {
  const store = getStore();
  const blocked = await limitByIp(store, req, "me");
  if (blocked) return blocked;

  const auth = requireInstall(req);
  if (!auth.ok) return auth.response;

  const limit = await rateLimit(store, "me", auth.installId, {
    limit: 60,
    windowSeconds: 60,
  });
  if (!limit.ok) return rateLimitedResponse(limit.retryAfterSeconds);

  try {
    return json(toMe(await getEntitlement(auth.installId, { store })));
  } catch {
    return errorResponse(
      503,
      "entitlement_unavailable",
      "Could not verify subscription"
    );
  }
}
