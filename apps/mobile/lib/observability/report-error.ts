import * as Sentry from "@sentry/react-native";

/**
 * Extra context attached to a reported error (shows up under "Additional Data"
 * in Sentry). Keep keys short and values JSON-serializable.
 */
export type ErrorContext = Record<string, unknown>;

/**
 * Report an unexpected error to Sentry (and surface it on the console in dev).
 *
 * Use this in `catch` blocks instead of a bare `console.error`. In a release
 * build `console.*` is invisible, so a swallowed catch means the failure
 * disappears entirely — routing through here means it lands in Sentry.
 *
 * Reserve this for *unexpected* failures. Expected, user-facing errors (a wrong
 * password, a rate limit, "not logged in") are communicated via the UI and
 * should not be reported as exceptions.
 *
 * @param error - The caught value (any type; non-Errors are normalized).
 * @param context - Optional extra data to attach (operation name, ids, etc.).
 */
export function reportError(error: unknown, context?: ErrorContext): void {
  // Give the developer immediate visibility while iterating. Sentry itself is
  // disabled in dev (see Sentry.init `enabled: !__DEV__`), so this is the only
  // signal locally; in production console is stripped and Sentry takes over.
  if (__DEV__) {
    console.error(error, context);
  }

  const normalized =
    error instanceof Error ? error : new Error(String(error));

  Sentry.captureException(
    normalized,
    context ? { extra: context } : undefined
  );
}
