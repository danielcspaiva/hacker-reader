import { fetchWithTimeout } from "./fetch-timeout";

/** A non-2xx JSON response; `status` lets callers tell retryable from final. */
export class HTTPStatusError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "HTTPStatusError";
  }
}

/**
 * GET a JSON document with a timeout. `errorLabel` prefixes the thrown message
 * (`${errorLabel}: ${status}`) so Firebase and Algolia failures stay distinct.
 * `signal` is React Query's, so an unmounted query cancels its request.
 */
export async function fetchJSON<T>(
  baseUrl: string,
  path: string,
  errorLabel: string,
  signal?: AbortSignal
): Promise<T> {
  const response = await fetchWithTimeout(`${baseUrl}${path}`, { signal });
  if (!response.ok) {
    throw new HTTPStatusError(
      `${errorLabel}: ${response.status}`,
      response.status
    );
  }
  // SAFETY: the endpoint at `path` returns the payload typed by the caller;
  // callers only read declared fields and ignore extra keys.
  return response.json() as Promise<T>;
}

/** True for failures a repeat request can fix: network, timeout, 5xx, 429. */
export function isTransientFetchError(error: unknown): boolean {
  if (error instanceof HTTPStatusError) {
    return error.status >= 500 || error.status === 429;
  }
  // A caller abort is final; everything else (TypeError, timeout) is transient.
  return !(error instanceof Error && error.name === "AbortError");
}
