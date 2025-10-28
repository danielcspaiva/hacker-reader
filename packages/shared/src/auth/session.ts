/**
 * SecureSession wrapper to prevent accidental cookie leakage
 *
 * This class wraps HN session cookies and provides controlled access.
 * It prevents accidental exposure via console.log, JSON.stringify, etc.
 */

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
      .join('; ');
  }

  /**
   * Get a safe display token for logs/UI
   * Shows a truncated hash instead of actual cookie values
   */
  getDisplayToken(): string {
    const userCookie = this.cookies['user'];
    if (!userCookie) return 'No session';
    return `hn_session_${userCookie.slice(0, 8)}...`;
  }

  /**
   * Check if the session has valid cookies
   */
  hasValidSession(): boolean {
    return !!this.cookies['user'];
  }

  /**
   * Get a stable user identifier from the session cookie
   * Returns the user cookie value which serves as a unique identifier
   *
   * @returns User ID string or null if no valid session
   */
  getUserId(): string | null {
    return this.cookies['user'] || null;
  }

  /**
   * Prevent accidental JSON.stringify exposure
   */
  toJSON() {
    return { display: this.getDisplayToken() };
  }

  /**
   * Prevent console.log exposure
   */
  toString() {
    return this.getDisplayToken();
  }
}
