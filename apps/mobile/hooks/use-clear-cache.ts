import { useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";

/**
 * Hook for clearing React Query cache with confirmation dialog.
 *
 * @returns Handler function for clearing cache
 *
 * @example
 * ```tsx
 * function Settings() {
 *   const { handleClearCache } = useClearCache();
 *
 *   return (
 *     <Button onPress={handleClearCache}>
 *       Clear Cache
 *     </Button>
 *   );
 * }
 * ```
 */
export function useClearCache() {
  const queryClient = useQueryClient();

  const handleClearCache = () => {
    Alert.alert(
      "Clear Cache",
      "This will clear all cached stories and comments. You'll need to reload them from Hacker News.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            queryClient.clear();
            Alert.alert("Success", "Cache cleared successfully");
          },
        },
      ]
    );
  };

  return { handleClearCache };
}
