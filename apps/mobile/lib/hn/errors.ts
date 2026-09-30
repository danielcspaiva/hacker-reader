export type HNAuthErrorCode =
  | "NOT_LOGGED_IN"
  | "INSUFFICIENT_KARMA"
  | "RATE_LIMITED"
  | "PARSE_ERROR"
  | "CANNOT_VOTE"
  | "CAPTCHA_REQUIRED"
  | "NETWORK_ERROR"
  | "INVALID_CREDENTIALS"
  | "BANNED"
  /** HN answered "unknown or expired link": the page's auth token went stale. */
  | "EXPIRED_LINK"
  | "ITEM_NOT_FOUND"
  /** The item takes no replies (too old, locked, dead). */
  | "CANNOT_COMMENT"
  /** No delete link: not your item, past the window, or already gone. */
  | "CANNOT_DELETE"
  /** HN refused with a message of its own (carried in `message`). */
  | "REJECTED"
  /** The request may have reached HN but its outcome is unknown. */
  | "UNCONFIRMED";

export class HNAuthError extends Error {
  constructor(
    message: string,
    public code: HNAuthErrorCode
  ) {
    super(message);
    this.name = "HNAuthError";
  }
}

export function isAuthError(error: unknown): error is HNAuthError {
  return error instanceof HNAuthError;
}
