/**
 * Device side of the Pro daily digest: permission, Expo push token and the
 * registration of `prefs.digest` with `apps/api`. Nothing personal is sent: the
 * server already has the time zone from device registration, and stores the
 * preferred hour only while the digest is on.
 */

import * as Notifications from "expo-notifications";

import { proApi, type DeviceRegistration } from "@/lib/pro/api";
import { deviceRegistrationBase } from "@/lib/pro/device-info";
import { DEFAULT_DIGEST_HOUR, type DigestPrefValue } from "@/lib/pro/digest";
import { getInstallId } from "@/lib/pro/install-id";
import {
  easProjectId,
  ensurePermission,
  type EnableResult,
} from "@/lib/pro/reply-notifications";

async function registerDigest(
  digest: DigestPrefValue,
  token: string | undefined
) {
  const base = deviceRegistrationBase();
  if (!base || !proApi.isConfigured) throw new Error("Pro API unavailable");
  const installId = await getInstallId();
  const registration: DeviceRegistration = { ...base, prefs: { digest } };
  if (token) registration.expoPushToken = token;
  await proApi.registerDevice(installId, registration);
}

async function pushToken(): Promise<string | undefined> {
  const projectId = easProjectId();
  if (!projectId) return undefined;
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}

/** Asks for permission, gets the push token and registers the digest as on. */
export async function enableDailyDigest(hour: number): Promise<EnableResult> {
  if (!(await ensurePermission(true))) return { ok: false, reason: "denied" };
  const token = await pushToken();
  if (!token) return { ok: false, reason: "no_project_id" };
  await registerDigest({ enabled: true, hour }, token);
  return { ok: true };
}

/** Changes the delivery hour of a digest that is already on. */
export async function updateDailyDigestHour(hour: number): Promise<void> {
  await registerDigest({ enabled: true, hour }, undefined);
}

/** Re-sends the token and hour on launch (tokens can change); never prompts. */
export async function refreshDailyDigestRegistration(
  hour: number
): Promise<void> {
  if (!easProjectId() || !(await ensurePermission(false))) return;
  await registerDigest({ enabled: true, hour }, await pushToken());
}

/** Switches the digest off on the server, resetting the stored hour to the default. */
export async function disableDailyDigest(): Promise<void> {
  await registerDigest(
    { enabled: false, hour: DEFAULT_DIGEST_HOUR },
    undefined
  );
}
