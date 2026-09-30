import { requireInstall, requirePro } from "@/lib/auth";
import {
  deleteDeviceData,
  parseDeviceInput,
  upsertDevice,
} from "@/lib/devices";
import { json, readJson } from "@/lib/http";
import { limitByIp, rateLimit, rateLimitedResponse } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";

export async function POST(req: Request) {
  const store = getStore();
  const blocked = await limitByIp(store, req, "devices");
  if (blocked) return blocked;

  // Registration is Pro-only: it also keeps minted ids from writing records.
  const auth = await requirePro(req, { store });
  if (!auth.ok) return auth.response;

  const limit = await rateLimit(store, "devices", auth.installId, {
    limit: 30,
    windowSeconds: 60,
  });
  if (!limit.ok) return rateLimitedResponse(limit.retryAfterSeconds);

  const parsed = parseDeviceInput(await readJson(req));
  if (!parsed.ok) {
    return json(
      { error: { code: "invalid_body", errors: parsed.errors } },
      400
    );
  }

  const device = await upsertDevice(store, auth.installId, parsed.value);
  return json(device);
}

// Anyone may delete their own data, so no Pro check.
export async function DELETE(req: Request) {
  const store = getStore();
  const blocked = await limitByIp(store, req, "devices-delete");
  if (blocked) return blocked;

  const auth = requireInstall(req);
  if (!auth.ok) return auth.response;

  await deleteDeviceData(store, auth.installId);
  return json({ deleted: true });
}
