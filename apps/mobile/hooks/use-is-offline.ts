import { useNetworkState } from "expo-network";

import { isOfflineState } from "@/lib/query-cache/offline";

/** True while the device reports no connection. */
export function useIsOffline(): boolean {
  return isOfflineState(useNetworkState());
}
