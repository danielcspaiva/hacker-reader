import { Alert } from "react-native";

import { describeHNWriteError, type WriteErrorOptions } from "@/lib/hn";
import {
  reportError,
  type ErrorContext,
} from "@/lib/observability/report-error";

/**
 * Shows the alert for a failed HN write, logs out when the session is gone and
 * reports unexpected failures. The one place every write mutation's `onError`
 * goes through.
 */
export function presentHNWriteError(
  error: unknown,
  {
    logout,
    operation,
    context,
    ...messages
  }: WriteErrorOptions & {
    logout: () => void;
    operation: string;
    context?: ErrorContext;
  }
): void {
  const presentation = describeHNWriteError(error, messages);
  if (presentation.report) {
    reportError(error, { operation, ...context });
  }
  if (presentation.logout) {
    logout();
  }
  Alert.alert(presentation.title, presentation.message, [{ text: "OK" }]);
}
