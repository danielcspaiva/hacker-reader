/**
 * HN Authentication Context
 *
 * Provides global authentication state and methods for the mobile app.
 * Manages session persistence via expo-secure-store.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";
import CookieManager from "@react-native-cookies/cookies";
import { usePostHog } from "posthog-react-native";
import { SecureSession } from "@/lib/shared/auth";
import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { trackEvent, resetUser } from "@/lib/analytics/tracking";
import { reportError } from "@/lib/observability";

interface HNAuthContextValue {
  session: SecureSession | null;
  isLoading: boolean;
  username: string | null;
  login: (cookies: Record<string, string>, username: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const HNAuthContext = createContext<HNAuthContextValue | null>(null);

export function HNAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SecureSession | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const posthog = usePostHog();

  // Load session on mount
  useEffect(() => {
    loadSession();
  }, []);

  async function loadSession() {
    try {
      const cookiesJson = await SecureStore.getItemAsync("hn_cookies");
      const storedUsername = await SecureStore.getItemAsync("hn_username");
      if (cookiesJson) {
        const cookies = JSON.parse(cookiesJson);
        setSession(new SecureSession(cookies));
        setUsername(storedUsername);
      }
    } catch (error) {
      reportError(error, { operation: "loadSession" });
    } finally {
      setIsLoading(false);
    }
  }

  async function login(cookies: Record<string, string>, username: string) {
    const newSession = new SecureSession(cookies);
    setSession(newSession);
    setUsername(username);
    await SecureStore.setItemAsync("hn_cookies", JSON.stringify(cookies));
    await SecureStore.setItemAsync("hn_username", username);

    // Track login completion (fully anonymous)
    // Note: is_authenticated super property is automatically set in _layout.tsx
    // This allows us to track logged in vs. logged out behavior without identifying users
    trackEvent(posthog, AnalyticsEvent.LOGIN_COMPLETED, {});
  }

  async function logout() {
    // Track logout before clearing session
    trackEvent(posthog, AnalyticsEvent.LOGOUT_TRIGGERED, {});
    resetUser(posthog);

    // Note: We only perform client-side logout (clearing cookies/storage).
    // Server-side logout via HN's logout endpoint is not needed because:
    // 1. HN sessions expire naturally
    // 2. Client-side clearing is sufficient for mobile app security
    // 3. React Native's cookie manager interferes with server-side logout attempts

    // Clear local session state
    setSession(null);
    setUsername(null);

    // Clear session from SecureStore
    await SecureStore.deleteItemAsync("hn_cookies");
    await SecureStore.deleteItemAsync("hn_username");

    // Clear HN cookies from cookie manager
    try {
      await CookieManager.clearByName("https://news.ycombinator.com", "user");
    } catch (error) {
      reportError(error, { operation: "logout.clearCookies" });
    }
  }

  return (
    <HNAuthContext.Provider
      value={{
        session,
        username,
        isLoading,
        login,
        logout,
        isAuthenticated: session?.hasValidSession() ?? false,
      }}
    >
      {children}
    </HNAuthContext.Provider>
  );
}

export function useHNAuth() {
  const context = useContext(HNAuthContext);
  if (!context) {
    throw new Error("useHNAuth must be used within HNAuthProvider");
  }
  return context;
}
