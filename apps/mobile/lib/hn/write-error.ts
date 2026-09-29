import { isAuthError } from "./errors";

export interface WriteErrorOptions {
  /** Shown for anything without a more specific message. */
  failureMessage: string;
  /** Shown for INSUFFICIENT_KARMA; omitted means the generic failure message. */
  karmaMessage?: string;
}

export interface WriteErrorPresentation {
  title: string;
  message: string;
  /** The session is gone: the caller must log out. */
  logout: boolean;
  /** Unexpected (a scraper break or a non-HN error): worth an error report. */
  report: boolean;
}

/**
 * Decides what the user sees, and what is reported, when an HN write fails.
 * Pure, so the logout path is testable without React Native.
 *
 * Expected failures (logged out, rate limited, low karma, network) are shown
 * but not reported. PARSE_ERROR always is: it means HN's markup no longer
 * matches the scraper.
 */
export function describeHNWriteError(
  error: unknown,
  { failureMessage, karmaMessage }: WriteErrorOptions
): WriteErrorPresentation {
  if (!isAuthError(error)) {
    return {
      title: "Error",
      message: failureMessage,
      logout: false,
      report: true,
    };
  }

  switch (error.code) {
    case "NOT_LOGGED_IN":
      return {
        title: "Session Expired",
        message: "Please log in again to continue",
        logout: true,
        report: false,
      };
    case "RATE_LIMITED":
      return {
        title: "Slow Down",
        message: "You're performing actions too quickly. Please wait a moment.",
        logout: false,
        report: false,
      };
    case "INSUFFICIENT_KARMA":
      return {
        title: "Insufficient Karma",
        message: karmaMessage ?? failureMessage,
        logout: false,
        report: false,
      };
    case "PARSE_ERROR":
      return {
        title: "Something Went Wrong",
        message: "The app may need an update. Please try again later.",
        logout: false,
        report: true,
      };
    default:
      return {
        title: "Error",
        message: failureMessage,
        logout: false,
        report: false,
      };
  }
}
