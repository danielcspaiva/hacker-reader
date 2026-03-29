import { HNAuthError } from "../auth/errors";

/** Known HN error strings for detection in response HTML */
const HN_ERROR_STRINGS = {
  BAD_LOGIN: "bad login",
  UNKNOWN_LINK: "unknown or expired link",
  SUBMITTING_TOO_FAST: "submitting too fast",
  SLOW_DOWN: "slow down",
  INSUFFICIENT_KARMA: "insufficient karma",
  CANT_COMMENT: "can't comment",
  BLANK: "blank",
  EMPTY_COMMENT: "empty comment",
} as const;

/**
 * Check for common errors in HN's response HTML.
 * Throws typed HNAuthError if an error is detected.
 */
export async function checkForCommentErrors(
  responseHtml: string,
  lowerHtml: string
): Promise<void> {
  if (lowerHtml.includes(HN_ERROR_STRINGS.BAD_LOGIN)) {
    throw new HNAuthError(
      "Session expired - please log in again",
      "NOT_LOGGED_IN"
    );
  }

  if (lowerHtml.includes(HN_ERROR_STRINGS.UNKNOWN_LINK)) {
    throw new HNAuthError(
      "Session expired - please log in again",
      "NOT_LOGGED_IN"
    );
  }

  if (
    lowerHtml.includes(HN_ERROR_STRINGS.SUBMITTING_TOO_FAST) ||
    lowerHtml.includes(HN_ERROR_STRINGS.SLOW_DOWN)
  ) {
    throw new HNAuthError(
      "You are posting too fast. Please wait.",
      "RATE_LIMITED"
    );
  }

  if (
    lowerHtml.includes(HN_ERROR_STRINGS.INSUFFICIENT_KARMA) ||
    lowerHtml.includes(HN_ERROR_STRINGS.CANT_COMMENT)
  ) {
    throw new HNAuthError(
      "Insufficient karma to comment",
      "INSUFFICIENT_KARMA"
    );
  }

  if (
    lowerHtml.includes(HN_ERROR_STRINGS.BLANK) ||
    lowerHtml.includes(HN_ERROR_STRINGS.EMPTY_COMMENT)
  ) {
    throw new HNAuthError("Comment cannot be blank", "PARSE_ERROR");
  }

  // Check for validation errors (HN shows * in orange next to invalid fields)
  const hasTextareaError = responseHtml.match(
    /<font color="#ff6600">\s*\*\s*<\/font>\s*<textarea name="text"/i
  );

  if (hasTextareaError) {
    const errorMatch = responseHtml.match(
      /<font color="#ff6600">\s*([^<]+)\s*<\/font>/i
    );
    const errorMessage = errorMatch ? errorMatch[1].trim() : null;

    if (errorMessage && errorMessage !== "*") {
      throw new HNAuthError(
        `HN rejected comment: ${errorMessage}`,
        "PARSE_ERROR"
      );
    }

    throw new HNAuthError(
      "HN rejected your comment. Possible reasons: comment too short, contains invalid characters, or account restrictions. Please try posting directly on news.ycombinator.com to see the specific error.",
      "PARSE_ERROR"
    );
  }
}

/** Known HN login error patterns */
const HN_LOGIN_ERROR_STRINGS = {
  BAD_LOGIN: "bad login",
  UNKNOWN_OR_EXPIRED: "unknown or expired",
  BANNED: "banned",
  NOT_ACTIVE: "account is not active",
  TOO_MANY: "too many",
  SLOW_DOWN: "slow down",
  RATE_LIMIT: "rate limit",
} as const;

/**
 * Check for login-specific errors in HN's response HTML.
 * Throws typed HNAuthError if an error is detected.
 */
export function checkForLoginErrors(
  lowerHtml: string,
  responseUrl: string
): void {
  if (
    lowerHtml.includes(HN_LOGIN_ERROR_STRINGS.BAD_LOGIN) ||
    lowerHtml.includes(HN_LOGIN_ERROR_STRINGS.UNKNOWN_OR_EXPIRED)
  ) {
    throw new HNAuthError(
      "Invalid username or password",
      "INVALID_CREDENTIALS"
    );
  }

  if (
    lowerHtml.includes(HN_LOGIN_ERROR_STRINGS.BANNED) ||
    lowerHtml.includes(HN_LOGIN_ERROR_STRINGS.NOT_ACTIVE)
  ) {
    throw new HNAuthError("Account is banned or inactive", "BANNED");
  }

  if (
    lowerHtml.includes(HN_LOGIN_ERROR_STRINGS.TOO_MANY) ||
    lowerHtml.includes(HN_LOGIN_ERROR_STRINGS.SLOW_DOWN) ||
    lowerHtml.includes(HN_LOGIN_ERROR_STRINGS.RATE_LIMIT)
  ) {
    throw new HNAuthError(
      "Too many login attempts. Please wait and try again.",
      "RATE_LIMITED"
    );
  }

  if (responseUrl.includes("/login")) {
    throw new HNAuthError(
      "Login failed - please check your credentials",
      "INVALID_CREDENTIALS"
    );
  }
}
