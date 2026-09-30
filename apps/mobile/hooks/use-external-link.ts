import * as WebBrowser from "expo-web-browser";
import { Alert } from "react-native";

import { reportError } from "@/lib/observability/report-error";

/**
 * Hook for opening external URLs in browser with error handling.
 *
 * @returns Function to open a URL
 *
 * @example
 * ```tsx
 * function Settings() {
 *   const openLink = useExternalLink();
 *
 *   return (
 *     <Button onPress={() => openLink('https://github.com/user/repo')}>
 *       Open Repository
 *     </Button>
 *   );
 * }
 * ```
 */
export function useExternalLink() {
  return async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      reportError(error, { operation: "openExternalLink", url });
      Alert.alert("Unable to open link", "Please try again later.");
    }
  };
}
