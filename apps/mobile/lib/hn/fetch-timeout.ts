/** Default budget for one HN, Firebase or Algolia request. */
export const REQUEST_TIMEOUT_MS = 15_000;

export class RequestTimeoutError extends Error {
  constructor(url: string, timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms: ${url}`);
    this.name = "RequestTimeoutError";
  }
}

/**
 * `fetch` with a timeout. `init.signal` (e.g. React Query's) still cancels the
 * request; the timeout rejects with `RequestTimeoutError` so callers can tell
 * it from a caller abort.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const parent = init.signal ?? undefined;
  const abortFromParent = () => controller.abort();
  if (parent?.aborted) {
    controller.abort();
  } else {
    parent?.addEventListener("abort", abortFromParent, { once: true });
  }

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (timedOut) throw new RequestTimeoutError(url, timeoutMs);
    throw error;
  } finally {
    clearTimeout(timeoutId);
    parent?.removeEventListener("abort", abortFromParent);
  }
}
