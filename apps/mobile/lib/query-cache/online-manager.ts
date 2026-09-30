import { onlineManager } from "@tanstack/react-query";
import * as Network from "expo-network";

import { isOfflineState } from "./offline";

/**
 * Tell React Query about connectivity so queries pause offline and refetch on
 * reconnect, instead of burning their retries.
 */
export function setupOnlineManager(): void {
  onlineManager.setEventListener((setOnline) => {
    void Network.getNetworkStateAsync()
      .then((state) => setOnline(!isOfflineState(state)))
      .catch(() => {});
    const subscription = Network.addNetworkStateListener((state) =>
      setOnline(!isOfflineState(state))
    );
    return () => subscription.remove();
  });
}
