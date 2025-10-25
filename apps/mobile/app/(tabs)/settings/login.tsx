/**
 * HN Login Screen
 *
 * Displays a WebView for logging into Hacker News.
 * Extracts session cookies after successful login.
 */

import { ThemedText } from '@/components/themed-text';
import { useHNAuth } from '@/contexts/hn-auth-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { Cookies } from '@react-native-cookies/cookies';
import CookieManager from '@react-native-cookies/cookies';
import { router, useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import type { WebViewMessageEvent, WebViewNavigation, WebView as WebViewType } from 'react-native-webview';
import { WebView } from 'react-native-webview';

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasCapturedSession = useRef(false);
  const webViewRef = useRef<WebViewType | null>(null);
  const { login } = useHNAuth();
  const backgroundColor = useThemeColor({}, 'background');

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
    await login(cookies);
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(clearCookieIntervalScript);
    }
    hasCapturedSession.current = true;
    setLoading(false);

    // Navigate back and show success alert
    router.back();
    setTimeout(() => {
      Alert.alert('Success', 'Logged in to Hacker News successfully!');
    }, 300);
  };

  // Reset state when screen comes into focus (similar to modal's visible prop behavior)
  useFocusEffect(
    useCallback(() => {
      resetState();
    }, [])
  );

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

  // Fallback: inject JS to extract cookies
  const injectedJS = `
    (function() {
      if (window.__hnCookieInterval) {
        clearInterval(window.__hnCookieInterval);
      }
      const postCookies = () => {
        window.ReactNativeWebView.postMessage(document.cookie || '');
      };
      postCookies();
      window.__hnCookieInterval = setInterval(postCookies, 1500);
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
    <View style={[styles.container, { backgroundColor }]}>
      {loading ? (
        <View style={[styles.loadingContainer, { backgroundColor }]}>
          <ActivityIndicator size="large" />
          <ThemedText style={styles.loadingText}>Logging you in...</ThemedText>
        </View>
      ) : (
        <>
          {error && (
            <View style={styles.errorContainer}>
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
          )}

          <View style={{ flex: 1 }}>
            <WebView
              ref={ref => {
                webViewRef.current = ref;
              }}
              source={{ uri: 'https://news.ycombinator.com/login' }}
              onNavigationStateChange={handleNavigationStateChange}
              injectedJavaScript={injectedJS}
              onMessage={handleMessage}
              incognito={false}
              sharedCookiesEnabled={true}
              thirdPartyCookiesEnabled={true}
              startInLoadingState={true}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              renderLoading={() => (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" />
                </View>
              )}
              style={styles.webView}
              containerStyle={{ flex: 1 }}
              onLoadStart={(e) => console.log('WebView loading started:', e.nativeEvent.url)}
              onLoadEnd={(e) => console.log('WebView loading ended:', e.nativeEvent.url)}
              onError={(e) => console.error('WebView error:', e.nativeEvent)}
              onHttpError={(e) => console.error('WebView HTTP error:', e.nativeEvent)}
              onContentProcessDidTerminate={() => console.log('WebView content process terminated')}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    backgroundColor: '#ffffff',
  },
});
