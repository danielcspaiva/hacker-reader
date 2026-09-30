/**
 * Device side of Pro keyword alerts: the list is mirrored to the server in
 * `prefs.alerts` through the device registration, and the same registration
 * carries the push token. `POST /devices` merges prefs, so this leaves the
 * reply-notifications pref alone.
 */

import * as Notifications from "expo-notifications";

import type { Alert } from "@/lib/hn/alerts";
import { toAlertPrefs } from "@/lib/hn/alerts";
import { proApi, type DeviceRegistration } from "@/lib/pro/api";
import { deviceRegistrationBase } from "@/lib/pro/device-info";
import { getInstallId } from "@/lib/pro/install-id";
import {
  easProjectId,
  ensurePermission,
  type EnableResult,
} from "@/lib/pro/reply-notifications";

async function registerAlerts(alerts: readonly Alert[], token?: string) {
  const base = deviceRegistrationBase();
  if (!base || !proApi.isConfigured) throw new Error("Pro API unavailable");
  const installId = await getInstallId();
  const registration: DeviceRegistration = {
    ...base,
    prefs: { alerts: toAlertPrefs(alerts) },
  };
  if (token) registration.expoPushToken = token;
  await proApi.registerDevice(installId, registration);
}

/** Asks for permission, gets the push token and registers it with the alerts. */
export async function enableAlerts(
  alerts: readonly Alert[]
): Promise<EnableResult> {
  if (!(await ensurePermission(true))) return { ok: false, reason: "denied" };
  const projectId = easProjectId();
  if (!projectId) return { ok: false, reason: "no_project_id" };
  const { data: token } = await Notifications.getExpoPushTokenAsync({
    projectId,
  });
  await registerAlerts(alerts, token);
  return { ok: true };
}

/** Sends the list after a removal; the token on the server stays as it is. */
export async function syncAlerts(alerts: readonly Alert[]): Promise<void> {
  await registerAlerts(alerts);
}

/** Re-sends the token and list on launch (tokens can change); never prompts. */
export async function refreshAlertsRegistration(
  alerts: readonly Alert[]
): Promise<void> {
  const projectId = easProjectId();
  if (!projectId || !(await ensurePermission(false))) return;
  const { data: token } = await Notifications.getExpoPushTokenAsync({
    projectId,
  });
  await registerAlerts(alerts, token);
}
