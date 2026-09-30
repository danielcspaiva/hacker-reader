import { getEntitlement, type EntitlementDeps } from "./entitlement";
import { errorResponse } from "./http";
import { parseBearerInstallId } from "./install-id";
import { getStore, type Store } from "./store";

export type InstallAuth =
  | { ok: true; installId: string }
  | { ok: false; response: Response };

interface ProGrant {
  ok: true;
  installId: string;
  expiresAt?: string;
}

export type ProAuth = ProGrant | { ok: false; response: Response };

/** 401 unless the request carries `Authorization: Bearer <installId>`. */
export function requireInstall(req: Request): InstallAuth {
  const installId = parseBearerInstallId(req.headers.get("authorization"));
  if (!installId) {
    return {
      ok: false,
      response: errorResponse(
        401,
        "unauthorized",
        "Missing or invalid install id",
        { "WWW-Authenticate": "Bearer" }
      ),
    };
  }
  return { ok: true, installId };
}

/**
 * 401 without an install id, 402 when the install has no active Pro
 * entitlement, 503 when entitlements cannot be checked (fails closed).
 */
export async function requirePro(
  req: Request,
  deps: Partial<EntitlementDeps> & { store?: Store } = {}
): Promise<ProAuth> {
  const auth = requireInstall(req);
  if (!auth.ok) return auth;

  try {
    const entitlement = await getEntitlement(auth.installId, {
      ...deps,
      store: deps.store ?? getStore(),
    });
    if (!entitlement.pro) {
      return {
        ok: false,
        response: errorResponse(
          402,
          "pro_required",
          "Hacker Reader Pro is required"
        ),
      };
    }
    const granted: ProGrant = { ok: true, installId: auth.installId };
    if (entitlement.expiresAt) granted.expiresAt = entitlement.expiresAt;
    return granted;
  } catch {
    return {
      ok: false,
      response: errorResponse(
        503,
        "entitlement_unavailable",
        "Could not verify subscription"
      ),
    };
  }
}
