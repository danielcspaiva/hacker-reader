/** A tiny bus so any screen can ask the mounted sync hook for a run. No React Native. */

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeToSyncRequests(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Asks for a sync soon (the hook debounces). */
export function requestICloudSync(): void {
  for (const listener of listeners) listener();
}
