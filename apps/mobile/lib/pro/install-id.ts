import { randomUUID } from "expo-crypto";
import * as SecureStore from "expo-secure-store";

import { isInstallId } from "./install-id-format";

const INSTALL_ID_KEY = "pro_install_id";

let pending: Promise<string> | undefined;

async function loadOrCreate(): Promise<string> {
  const stored = await SecureStore.getItemAsync(INSTALL_ID_KEY);
  if (isInstallId(stored)) return stored;

  const created = randomUUID();
  await SecureStore.setItemAsync(INSTALL_ID_KEY, created);
  return created;
}

/**
 * The random install id: the API bearer token and the RevenueCat app user id.
 * Created once and kept in the Keychain, so it survives a reinstall and a
 * restored purchase stays linked. There is no account behind it.
 */
export function getInstallId(): Promise<string> {
  pending ??= loadOrCreate().catch((error: Error) => {
    pending = undefined;
    throw error;
  });
  return pending;
}
