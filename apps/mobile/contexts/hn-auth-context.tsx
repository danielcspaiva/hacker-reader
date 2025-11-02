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
import { usePostHog } from "posthog-react-native";
import { SecureSession } from "@/lib/shared/auth";
import { AnalyticsEvent } from "@/lib/analytics/posthog-events";
import { trackEvent, identifyUser, resetUser } from "@/lib/analytics/tracking";

interface HNAuthContextValue {
  session: SecureSession | null;
  isLoading: boolean;
  login: (cookies: Record<string, string>) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const HNAuthContext = createContext<HNAuthContextValue | null>(null);

export function HNAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SecureSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const posthog = usePostHog();

  // Load session on mount
  useEffect(() => {
    loadSession();
  }, []);

  async function loadSession() {
    try {
      const cookiesJson = await SecureStore.getItemAsync("hn_cookies");
      if (cookiesJson) {
        const cookies = JSON.parse(cookiesJson);
        setSession(new SecureSession(cookies));
      }
    } catch (error) {
      console.error("Failed to load session:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(cookies: Record<string, string>) {
    const newSession = new SecureSession(cookies);
    setSession(newSession);
    await SecureStore.setItemAsync("hn_cookies", JSON.stringify(cookies));

    // Track login and identify user
    trackEvent(posthog, AnalyticsEvent.LOGIN_COMPLETED, {});

    // Try to extract username from cookies for identification
    // The username is typically stored in the 'acct' cookie
    const username = cookies.acct;
    if (username) {
      identifyUser(posthog, username);
    }
  }

  async function logout() {
    // Track logout before clearing session
    trackEvent(posthog, AnalyticsEvent.LOGOUT_TRIGGERED, {});
    resetUser(posthog);

    setSession(null);
    await SecureStore.deleteItemAsync("hn_cookies");
  }

  return (
    <HNAuthContext.Provider
      value={{
        session,
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
