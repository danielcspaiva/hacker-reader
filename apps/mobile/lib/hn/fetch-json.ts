/**
 * GET a JSON document. `errorLabel` prefixes the thrown message
 * (`${errorLabel}: ${status}`) so Firebase and Algolia failures stay distinct.
 */
export async function fetchJSON<T>(
  baseUrl: string,
  path: string,
  errorLabel: string
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`${errorLabel}: ${response.status}`);
  }
  // SAFETY: the endpoint at `path` returns the payload typed by the caller;
  // callers only read declared fields and ignore extra keys.
  return response.json() as Promise<T>;
}
