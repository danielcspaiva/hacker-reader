/**
 * HN Login Modal Component
 *
 * Displays a WebView for logging into Hacker News.
 * Extracts session cookies after successful login.
 */

import { useThemeColor } from '@/hooks/use-theme-color';
import type { Cookies } from '@react-native-cookies/cookies';
import CookieManager from '@react-native-cookies/cookies';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Button, Modal, SafeAreaView, StyleSheet, View } from 'react-native';
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
  const clearCookieIntervalScript =
    'window.__hnCookieInterval && clearInterval(window.__hnCookieInterval); window.__hnCookieInterval = null; true;';

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

  // Inject custom styling and cookie extraction with dark mode support
  const injectedJS = `
    (function() {
      // Cookie extraction
      if (window.__hnCookieInterval) {
        clearInterval(window.__hnCookieInterval);
      }
      const postCookies = () => {
        window.ReactNativeWebView.postMessage(document.cookie || '');
      };
      postCookies();
      window.__hnCookieInterval = setInterval(postCookies, 1500);

      // Detect dark mode
      const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

      // Move labels to placeholders for cleaner look
      const usernameInputs = document.querySelectorAll('input[name="acct"]');
      const passwordInputs = document.querySelectorAll('input[name="pw"]');

      usernameInputs.forEach(input => {
        input.placeholder = 'Username';
      });

      passwordInputs.forEach(input => {
        input.placeholder = 'Password';
      });

      // Hide label cells
      const labelCells = document.querySelectorAll('td');
      labelCells.forEach(cell => {
        if (cell.textContent.trim() === 'username:' || cell.textContent.trim() === 'password:') {
          cell.style.display = 'none';
        }
      });

      // Inject custom CSS with dark mode support and HN orange theme
      const style = document.createElement('style');
      style.textContent = \`
        /* CSS Variables for theming */
        :root {
          --bg-primary: \${isDarkMode ? '#000' : '#fff'};
          --bg-secondary: \${isDarkMode ? '#1c1c1e' : '#f9f9f9'};
          --border-color: \${isDarkMode ? '#38383a' : '#e0e0e0'};
          --border-focus: #ff6600;
          --text-primary: \${isDarkMode ? '#fff' : '#000'};
          --text-secondary: \${isDarkMode ? '#8e8e93' : '#666'};
          --input-text: \${isDarkMode ? '#fff' : '#000'};
          --button-bg: #ff6600;
          --button-bg-active: #cc5200;
          --link-color: #ff6600;
        }

        /* Hide HN header and unnecessary elements */
        body > center > table:first-child,
        body > center > table > tbody > tr:first-child {
          display: none !important;
        }

        /* Main container styling */
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif !important;
          background: var(--bg-primary) !important;
          padding: 20px !important;
          margin: 0 !important;
          color: var(--text-primary) !important;
        }

        /* Login container */
        body > center {
          width: 100% !important;
          max-width: 100% !important;
          display: block !important;
        }

        body > center > table {
          width: 100% !important;
          border: none !important;
          background: var(--bg-primary) !important;
        }

        /* Form sections */
        form {
          margin: 20px 0 !important;
        }

        /* Table layout adjustments - ensure proper alignment */
        table {
          border-spacing: 0 !important;
          border-collapse: separate !important;
          width: 100% !important;
        }

        tr {
          display: block !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        td {
          padding: 0 !important;
        }

        /* Hide label cells (we use placeholders now) */
        td:first-child {
          display: none !important;
        }

        /* Make input cells full width */
        td:last-child {
          display: block !important;
          width: 100% !important;
          padding: 0 !important;
        }

        /* Input fields */
        input[type="text"],
        input[type="password"] {
          display: block !important;
          width: 100% !important;
          max-width: 100% !important;
          padding: 14px 16px !important;
          font-size: 17px !important;
          border: 1px solid var(--border-color) !important;
          border-radius: 10px !important;
          background: var(--bg-secondary) !important;
          color: var(--input-text) !important;
          margin: 8px 0 !important;
          box-sizing: border-box !important;
          -webkit-appearance: none !important;
          transition: all 0.2s ease !important;
        }

        input[type="text"]::placeholder,
        input[type="password"]::placeholder {
          color: var(--text-secondary) !important;
          opacity: 1 !important;
        }

        input[type="text"]:focus,
        input[type="password"]:focus {
          outline: none !important;
          border-color: var(--border-focus) !important;
          background: var(--bg-primary) !important;
          \${isDarkMode ? 'box-shadow: 0 0 0 4px rgba(255, 102, 0, 0.1) !important;' : ''}
        }

        /* Submit buttons */
        input[type="submit"] {
          display: block !important;
          width: 100% !important;
          padding: 15px !important;
          font-size: 17px !important;
          font-weight: 600 !important;
          color: #fff !important;
          background: var(--button-bg) !important;
          border: none !important;
          border-radius: 10px !important;
          margin: 16px 0 !important;
          cursor: pointer !important;
          -webkit-appearance: none !important;
          transition: all 0.2s ease !important;
          box-sizing: border-box !important;
        }

        input[type="submit"]:active {
          background: var(--button-bg-active) !important;
          transform: scale(0.98) !important;
        }

        /* Section headers (Login, Create Account) */
        b {
          font-size: 28px !important;
          font-weight: 700 !important;
          color: var(--text-primary) !important;
          display: block !important;
          margin: 32px 0 20px 0 !important;
        }

        /* First section header */
        b:first-of-type {
          margin-top: 0 !important;
        }

        /* Links */
        a {
          color: var(--link-color) !important;
          text-decoration: none !important;
          font-size: 16px !important;
          display: inline-block !important;
          margin: 16px 0 !important;
        }

        /* Remove unnecessary spacing */
        br {
          display: none !important;
        }

        /* Center alignment override */
        center {
          text-align: left !important;
        }

        /* Spacer adjustments */
        tr[style*="height"] {
          height: 8px !important;
        }

        /* Separator between sections */
        form + b {
          border-top: 1px solid var(--border-color) !important;
          padding-top: 32px !important;
        }
      \`;
      document.head.appendChild(style);
    })();
  `;

  const handleMessage = async (event: WebViewMessageEvent) => {
    if (hasCapturedSession.current) {
      return;
    }

    const cookieString = event.nativeEvent.data;
    if (cookieString && cookieString.includes('user=')) {
      try {
        if (!loading) {
          setLoading(true);
        }
        setError(null);
        // Parse cookie string to object
        const cookies = Object.fromEntries(
          cookieString.split('; ').map((c: string) => {
            const [key, ...values] = c.split('=');
            return [key, values.join('=')];
          })
        );

        await completeLogin(cookies);
      } catch (err) {
        setError('Failed to parse cookies');
        console.error('Cookie parsing error:', err);
      }
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
              injectedJavaScript={injectedJS}
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
