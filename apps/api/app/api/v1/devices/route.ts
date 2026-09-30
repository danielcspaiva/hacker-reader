import { requireInstall } from "@/lib/auth";
import {
  deleteDeviceData,
  parseDeviceInput,
  upsertDevice,
} from "@/lib/devices";
import { errorResponse, json, readJson } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";

export async function POST(req: Request) {
  const auth = requireInstall(req);
  if (!auth.ok) return auth.response;

  const store = getStore();
  const limit = await rateLimit(store, "devices", auth.installId, {
    limit: 30,
    windowSeconds: 60,
  });
  if (!limit.ok) {
    return errorResponse(429, "rate_limited", "Too many requests", {
      "Retry-After": String(limit.retryAfterSeconds),
    });
  }

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

export async function DELETE(req: Request) {
  const auth = requireInstall(req);
  if (!auth.ok) return auth.response;

  await deleteDeviceData(getStore(), auth.installId);
  return json({ deleted: true });
}
