/**
 * SecureSession wrapper to prevent accidental cookie leakage
 *
 * This class wraps HN session cookies and provides controlled access.
 * It prevents accidental exposure via console.log, JSON.stringify, etc.
 */

import { HNAuthError } from "./errors";

const REDACTED = "SecureSession(redacted)";

export class SecureSession {
  private cookies: Record<string, string>;

  constructor(cookies: Record<string, string>) {
    this.cookies = cookies;
  }

  /**
   * Get raw cookies for fetch requests
   *
   * WARNING: This method exposes actual cookie values.
   * Only use this for authenticated requests to news.ycombinator.com
   * The explicit name warns developers about the security implications.
   */
  dangerouslyGetRawCookiesForFetch(): string {
    return Object.entries(this.cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join("; ");
  }

  /**
   * Get a safe display token for logs/UI.
   * A constant: no part of the cookie value (not even a prefix) is exposed.
   */
  getDisplayToken(): string {
    return REDACTED;
  }

  hasValidSession(): boolean {
    return !!this.cookies["user"];
  }

  toJSON() {
    return { display: this.getDisplayToken() };
  }

  toString() {
    return this.getDisplayToken();
  }
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

/** A flat map of cookie name to string value. */
export function isCookieMap(value: unknown): value is Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const entries: unknown[] = Object.values(value);
  return entries.every(isString);
}

/**
 * Validate the JSON persisted in SecureStore into a cookie map.
 * Returns null for malformed JSON or anything that is not a flat string map,
 * so callers treat corrupted storage as "logged out".
 */
export function parseStoredCookies(
  json: string
): Record<string, string> | null {
  try {
    const parsed: unknown = JSON.parse(json);
    return isCookieMap(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Unauthenticated guard for write operations: returns the session, or throws
 * the typed NOT_LOGGED_IN error the write-error presenter turns into a logout.
 */
export function requireSession(
  session: SecureSession | null | undefined
): SecureSession {
  if (!session) {
    throw new HNAuthError("Not logged in", "NOT_LOGGED_IN");
  }
  return session;
}
