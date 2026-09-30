/**
 * Device side of Pro reply notifications: permission, Expo push token and the
 * registration with `apps/api`. The HN username leaves the phone only here, and
 * only after the user switched the feature on.
 */

import Constants from "expo-constants";
import * as Notifications from "expo-notifications";

import { proApi, type DeviceRegistration } from "@/lib/pro/api";
import { deviceRegistrationBase } from "@/lib/pro/device-info";
import { getInstallId } from "@/lib/pro/install-id";

export type EnableResult =
  | { ok: true }
  | { ok: false; reason: "denied" | "no_project_id" | "unavailable" };

/** The EAS project id Expo needs to mint a push token. */
export function easProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId ||
    undefined
  );
}

async function registerReplies(
  username: string | null,
  token: string | undefined
) {
  const base = deviceRegistrationBase();
  if (!base || !proApi.isConfigured) throw new Error("Pro API unavailable");
  const installId = await getInstallId();
  const registration: DeviceRegistration = {
    ...base,
    hnUsername: username,
    prefs: { replies: username !== null },
  };
  if (token) registration.expoPushToken = token;
  await proApi.registerDevice(installId, registration);
}

/** True when notifications are allowed, asking once if the user was never asked. */
export async function ensurePermission(ask: boolean): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!ask || !current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Asks for permission, gets the push token and registers it with the username. */
export async function enableReplyNotifications(
  username: string
): Promise<EnableResult> {
  if (!(await ensurePermission(true))) return { ok: false, reason: "denied" };
  const projectId = easProjectId();
  if (!projectId) return { ok: false, reason: "no_project_id" };
  const { data: token } = await Notifications.getExpoPushTokenAsync({
    projectId,
  });
  await registerReplies(username, token);
  return { ok: true };
}

/** Re-sends the token and username on launch (tokens can change); never prompts. */
export async function refreshReplyRegistration(
  username: string
): Promise<void> {
  const projectId = easProjectId();
  if (!projectId || !(await ensurePermission(false))) return;
  const { data: token } = await Notifications.getExpoPushTokenAsync({
    projectId,
  });
  await registerReplies(username, token);
}

/** Switches the server side off and forgets the username there. */
export async function disableReplyNotifications(): Promise<void> {
  await registerReplies(null, undefined);
}
