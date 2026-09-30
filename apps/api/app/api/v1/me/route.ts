import { requireInstall } from "@/lib/auth";
import { getEntitlement, toMe } from "@/lib/entitlement";
import { errorResponse, json } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";

export async function GET(req: Request) {
  const auth = requireInstall(req);
  if (!auth.ok) return auth.response;

  const store = getStore();
  const limit = await rateLimit(store, "me", auth.installId, {
    limit: 60,
    windowSeconds: 60,
  });
  if (!limit.ok) {
    return errorResponse(429, "rate_limited", "Too many requests", {
      "Retry-After": String(limit.retryAfterSeconds),
    });
  }

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
