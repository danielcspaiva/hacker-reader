/**
 * HN Authentication Context
 *
 * Provides global authentication state and methods for the mobile app.
 * Manages session persistence via expo-secure-store.
 */

import { EVENTS, USER_PROPERTIES } from '@/constants/analytics-events';
import { useAnalytics } from '@/hooks/use-analytics';
import { SecureSession } from '@hn/shared/auth';
import * as SecureStore from 'expo-secure-store';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

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
  const analytics = useAnalytics();

  // Update analytics when auth state changes
  useEffect(() => {
    if (!isLoading) {
      analytics.setUserProperties({
        [USER_PROPERTIES.IS_AUTHENTICATED]: session?.hasValidSession() ?? false,
      });
    }
  }, [session, isLoading, analytics]);

  const loadSession = useCallback(async () => {
    try {
      const cookiesJson = await SecureStore.getItemAsync('hn_cookies');
      if (cookiesJson) {
        const cookies = JSON.parse(cookiesJson);
        const loadedSession = new SecureSession(cookies);
        setSession(loadedSession);

        // Identify returning user in analytics
        const userId = loadedSession.getUserId();
        if (userId) {
          analytics.identify(userId, {
            is_returning_user: true,
          });
        }
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    } finally {
      setIsLoading(false);
    }
  }, [analytics]);

  // Load session on mount
  useEffect(() => {
    loadSession();
  }, [loadSession]);

  async function login(cookies: Record<string, string>) {
    const newSession = new SecureSession(cookies);
    setSession(newSession);
    await SecureStore.setItemAsync('hn_cookies', JSON.stringify(cookies));

    // Identify user in analytics
    const userId = newSession.getUserId();
    if (userId) {
      analytics.identify(userId, {
        login_method: 'hn_webview',
        has_valid_session: true,
      });
    }

    // Track successful login event
    analytics.track(EVENTS.LOGIN_COMPLETED);
  }

  async function logout() {
    setSession(null);
    await SecureStore.deleteItemAsync('hn_cookies');

    // Track logout and reset analytics identity
    analytics.track(EVENTS.LOGOUT_COMPLETED);
    analytics.reset();
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
    throw new Error('useHNAuth must be used within HNAuthProvider');
  }
  return context;
}
