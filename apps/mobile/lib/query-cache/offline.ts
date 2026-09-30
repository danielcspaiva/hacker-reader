/** Offline only when the OS says so; unknown (still loading) counts as online. */
export function isOfflineState(state: {
  isConnected?: boolean;
  isInternetReachable?: boolean;
}): boolean {
  return state.isConnected === false || state.isInternetReachable === false;
}
