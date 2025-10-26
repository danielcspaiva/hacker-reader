import { useHNAuth } from "@/contexts/hn-auth-context";
import { useState } from "react";
import { Alert } from "react-native";

/**
 * Hook for managing HN login/logout flow with modal state.
 * Handles login modal visibility, login success, and logout confirmation.
 *
 * @returns Login/logout handlers and modal state
 *
 * @example
 * ```tsx
 * function Settings() {
 *   const {
 *     showLoginModal,
 *     handleLogin,
 *     handleLogout,
 *     handleLoginSuccess,
 *     handleCloseModal,
 *   } = useHNLogin();
 *
 *   return (
 *     <>
 *       <Button onPress={handleLogin}>Login</Button>
 *       <LoginModal
 *         visible={showLoginModal}
 *         onSuccess={handleLoginSuccess}
 *         onClose={handleCloseModal}
 *       />
 *     </>
 *   );
 * }
 * ```
 */
export function useHNLogin() {
  const { login, logout } = useHNAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleLogin = () => {
    setShowLoginModal(true);
  };

  const handleLoginSuccess = async (cookies: Record<string, string>) => {
    await login(cookies);
    setShowLoginModal(false);
    Alert.alert("Success", "Logged in to Hacker News successfully!");
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

  const handleCloseModal = () => {
    setShowLoginModal(false);
  };

  return {
    showLoginModal,
    handleLogin,
    handleLogout,
    handleLoginSuccess,
    handleCloseModal,
  };
}
