import * as WebBrowser from "expo-web-browser";
import { useCallback } from "react";
import { Alert } from "react-native";

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
  return useCallback(async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      console.error("Error opening link:", error);
      Alert.alert("Unable to open link", "Please try again later.");
    }
  }, []);
}
