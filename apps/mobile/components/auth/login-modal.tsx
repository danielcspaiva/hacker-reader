/**
 * HN Login Modal Component
 *
 * Displays a WebView for logging into Hacker News.
 * Extracts session cookies after successful login.
 */

import { useThemeColor } from '@/hooks/use-theme-color';
import {
  clearCookieIntervalScript,
  getLoginPageScript,
  type CookieExtractionMessage,
} from '@/lib/login-webview-script';
import type { Cookies } from '@react-native-cookies/cookies';
import CookieManager from '@react-native-cookies/cookies';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Button, Modal, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { WebViewMessageEvent, WebViewNavigation, WebView as WebViewType } from 'react-native-webview';
import { WebView } from 'react-native-webview';
import { ThemedText } from '../themed-text';

interface HNLoginModalProps {
  visible: boolean;
  onLoginSuccess: (cookies: Record<string, string>) => void | Promise<void>;
  onCancel: () => void;
}

export function HNLoginModal({ visible, onLoginSuccess, onCancel }: HNLoginModalProps) {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasCapturedSession = useRef(false);
  const webViewRef = useRef<WebViewType | null>(null);
  function resetState() {
    setLoading(false);
    setError(null);
    hasCapturedSession.current = false;
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(clearCookieIntervalScript);
    }
  }

  const completeLogin = async (cookies: Record<string, string>) => {
    await SecureStore.setItemAsync('hn_cookies', JSON.stringify(cookies));
    await Promise.resolve(onLoginSuccess(cookies));
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(clearCookieIntervalScript);
    }
    hasCapturedSession.current = true;
    setLoading(false);
  };

  useEffect(() => {
    if (visible) {
      resetState();
    }
  }, [visible]);

  const handleNavigationStateChange = async (navState: WebViewNavigation) => {
    if (hasCapturedSession.current) {
      return;
    }

    const url = navState.url;
    const isOnHN = url.startsWith('https://news.ycombinator.com');
    const isLoginRoute = url.includes('/login');

    // Detect successful login when we land on any non-login HN page
    if (isOnHN && !isLoginRoute) {
      setLoading(true);
      setError(null);

      try {
        // Wait for cookies to settle
        await new Promise(resolve => setTimeout(resolve, 500));

        // Extract cookies using native manager
        const cookies: Cookies = await CookieManager.get('https://news.ycombinator.com');

        // Convert Cookies object to Record<string, string>
        const cookieRecord: Record<string, string> = {};
        for (const [key, cookie] of Object.entries(cookies)) {
          if (typeof cookie === 'object' && cookie !== null && 'value' in cookie) {
            cookieRecord[key] = cookie.value;
          }
        }

        // Validate we got session cookie
        if (!cookieRecord['user']) {
          setError('Login succeeded but no session cookie found');
          setLoading(false);
          return;
        }

        await completeLogin(cookieRecord);
      } catch (err) {
        setError('Failed to extract login cookies');
        setLoading(false);
        console.error('Cookie extraction error:', err);
      }
    }
  };

  const handleMessage = async (event: WebViewMessageEvent) => {
    if (hasCapturedSession.current) {
      return;
    }

    const message = event.nativeEvent.data;
    if (!message) {
      return;
    }

    try {
      const data: CookieExtractionMessage = JSON.parse(message);
      if (data.type !== 'COOKIES_EXTRACTED') {
        return;
      }

      const cookieRecord = data.cookieMap ?? {};
      if (!cookieRecord.user) {
        return;
      }

      if (!loading) {
        setLoading(true);
      }
      setError(null);

      await completeLogin(cookieRecord);
    } catch (err) {
      if (typeof message === 'string' && message.includes('user=')) {
        try {
          const cookieRecord = Object.fromEntries(
            message.split('; ').map((c: string) => {
              const [key, ...values] = c.split('=');
              return [key, values.join('=')];
            })
          );

          if (!cookieRecord.user) {
            return;
          }

          if (!loading) {
            setLoading(true);
          }
          setError(null);

          await completeLogin(cookieRecord);
          return;
        } catch (parseError) {
          console.error('Cookie parsing fallback error:', parseError);
        }
      }

      console.error('Error handling WebView message:', err);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        resetState();
        onCancel();
      }}
      onDismiss={resetState}
    >
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
            <ThemedText style={styles.loadingText}>Logging you in...</ThemedText>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <ThemedText style={styles.title}>Login to Hacker News</ThemedText>
              <Button
                title="Cancel"
                onPress={() => {
                  resetState();
                  onCancel();
                }}
                color={textColor}
              />
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <ThemedText style={styles.errorText}>{error}</ThemedText>
              </View>
            )}

            <WebView
              ref={ref => {
                webViewRef.current = ref;
              }}
              source={{ uri: 'https://news.ycombinator.com/login' }}
              onNavigationStateChange={handleNavigationStateChange}
              injectedJavaScript={getLoginPageScript()}
              onMessage={handleMessage}
              sharedCookiesEnabled={true}
              thirdPartyCookiesEnabled={true}
              style={styles.webView}
            />
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#fee',
  },
  errorText: {
    color: '#c00',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
