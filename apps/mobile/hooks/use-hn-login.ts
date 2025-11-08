import { useHNAuth } from "@/contexts/hn-auth-context";
import { router } from "expo-router";
import { Alert } from "react-native";

/**
 * Hook for managing HN login/logout flow using Expo Router navigation.
 * Handles login navigation, logout confirmation, and success alerts.
 *
 * @returns Login/logout handlers
 *
 * @example
 * ```tsx
 * function Settings() {
 *   const { handleLogin, handleLogout } = useHNLogin();
 *
 *   return (
 *     <>
 *       <Button onPress={handleLogin}>Login</Button>
 *       <Button onPress={handleLogout}>Logout</Button>
 *     </>
 *   );
 * }
 * ```
 */
export function useHNLogin() {
  const { logout } = useHNAuth();

  const handleLogin = () => {
    router.push("/auth/login");
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout from Hacker News?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          Alert.alert("Success", "Logged out successfully");
        },
      },
    ]);
  };

  return {
    handleLogin,
    handleLogout,
  };
}
