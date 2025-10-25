/**
 * HN Authentication Context
 *
 * Provides global authentication state and methods for the mobile app.
 * Manages session persistence via expo-secure-store.
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { SecureSession } from '@hn/shared/auth';

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

  // Load session on mount
  useEffect(() => {
    loadSession();
  }, []);

  async function loadSession() {
    try {
      const cookiesJson = await SecureStore.getItemAsync('hn_cookies');
      if (cookiesJson) {
        const cookies = JSON.parse(cookiesJson);
        setSession(new SecureSession(cookies));
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(cookies: Record<string, string>) {
    const newSession = new SecureSession(cookies);
    setSession(newSession);
    await SecureStore.setItemAsync('hn_cookies', JSON.stringify(cookies));
  }

  async function logout() {
    setSession(null);
    await SecureStore.deleteItemAsync('hn_cookies');
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
