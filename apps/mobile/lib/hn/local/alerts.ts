/**
 * Keyword alerts, persisted in AsyncStorage. The server gets a copy in
 * `prefs.alerts` (see `lib/pro/alerts.ts`); this list is the source of truth.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  isAlert,
  withAlert,
  withoutAlert,
  type AddAlertResult,
  type Alert,
  type AlertKind,
  type AlertMinPoints,
} from "../alerts";
import { createJsonListStore } from "./json-list-store";

export const ALERTS_KEY = "@alerts";

const store = createJsonListStore({
  key: ALERTS_KEY,
  guard: isAlert,
  storage: AsyncStorage,
});

/** Throws if storage fails. */
export function getAlerts(): Promise<Alert[]> {
  return store.read();
}

/** Adds an alert; resolves to why it was not added (nothing is written then). */
export async function addAlert(input: {
  kind: AlertKind;
  text: string;
  minPoints: AlertMinPoints;
}): Promise<AddAlertResult> {
  let result: AddAlertResult = { ok: false, reason: "invalid" };
  await store.update((alerts) => {
    result = withAlert(alerts, input);
    return result.ok ? result.alerts : alerts;
  });
  return result;
}

export function removeAlert(id: string): Promise<Alert[]> {
  return store.update((alerts) => withoutAlert(alerts, id));
}

export function clearAlerts(): Promise<void> {
  return store.clear();
}
