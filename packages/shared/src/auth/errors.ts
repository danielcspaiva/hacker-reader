/**
 * Error taxonomy for HN authentication and write operations
 */

export type HNAuthErrorCode =
  | 'NOT_LOGGED_IN'
  | 'INSUFFICIENT_KARMA'
  | 'RATE_LIMITED'
  | 'PARSE_ERROR'
  | 'CAPTCHA_REQUIRED'
  | 'NETWORK_ERROR';

export class HNAuthError extends Error {
  constructor(
    message: string,
    public code: HNAuthErrorCode
  ) {
    super(message);
    this.name = 'HNAuthError';
  }
}

export function isAuthError(error: unknown): error is HNAuthError {
  return error instanceof HNAuthError;
}
