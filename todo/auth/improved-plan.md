# Improved Authentication Implementation Plan

**Last Updated:** 2025-10-25
**Status:** Simplified, mobile-only, client-side approach
**Previous Issues:** Original plan was based on incorrect assumption that cookies cannot be extracted from React Native WebView

---

## Executive Summary

This plan implements **HN authentication for mobile apps only** (iOS + Android) using **client-side WebView cookie extraction**. No server required.

### What Changed from Original Plan

**CRITICAL CORRECTION:** The original plan assumed we needed a Next.js server because "you can't get cookies from React Native WebView." This is **FALSE**. We have two proven methods:

1. **Native Cookie Manager**: Use `@react-native-cookies/cookies` with `CookieManager.get(url)`
2. **JavaScript Injection**: Inject `window.ReactNativeWebView.postMessage(document.cookie)` into WebView

**Scope Reduction:**
- ❌ **Removed:** Web app authentication (Next.js API routes, cookie proxy)
- ❌ **Removed:** Cross-platform cookie synchronization complexity
- ✅ **Kept:** Mobile authentication via WebView
- ✅ **Kept:** Shared write API in `@hn/shared`
- 💡 **Optional:** Keep Next.js app for future features (not auth)

**Result:** ~40% less implementation time, simpler architecture, no server costs

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile App (iOS/Android)                  │
│                                                              │
│  ┌──────────────┐    ┌─────────────────┐   ┌────────────┐  │
│  │   Login UI   │───▶│  WebView        │──▶│ Extract    │  │
│  │   Button     │    │  (HN /login)    │   │ Cookies    │  │
│  └──────────────┘    └─────────────────┘   └────┬───────┘  │
│                                                  │          │
│                      ┌───────────────────────────┘          │
│                      ▼                                      │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  SecureStore (expo-secure-store)                      │ │
│  │  Stores: { user: "...", acct: "..." }                │ │
│  └───────────────────────────────────────────────────────┘ │
│                      │                                      │
│                      ▼                                      │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  @hn/shared/auth - Write API Client                  │ │
│  │  - vote(itemId, cookies)                             │ │
│  │  - comment(parentId, text, cookies)                  │ │
│  │  - favorite(itemId, cookies)                         │ │
│  └───────────────────────────────────────────────────────┘ │
│                      │                                      │
│                      ▼                                      │
│              news.ycombinator.com                           │
│         (form-encoded POST requests)                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Web App (Next.js)                         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   READ-ONLY MODE                                      │  │
│  │   - Browse stories (via @hn/shared read API)         │  │
│  │   - No login, no voting, no commenting               │  │
│  │   - Show "Download mobile app to interact" CTA       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 0: Dependency Setup (Week 1, Day 1)

**Goal:** Install and verify all required packages work with Expo SDK 54

#### Tasks

- [ ] Install `react-native-webview` in mobile app
  ```bash
  cd apps/mobile
  pnpm add react-native-webview
  npx expo install react-native-webview
  ```

- [ ] Install `@react-native-cookies/cookies` in mobile app
  ```bash
  pnpm add @react-native-cookies/cookies
  ```

- [ ] Install `expo-secure-store` in mobile app
  ```bash
  npx expo install expo-secure-store
  ```

- [ ] Install `cheerio` in shared package for HTML parsing
  ```bash
  cd ../../packages/shared
  pnpm add cheerio
  pnpm add -D @types/cheerio
  ```

- [ ] Rebuild development client
  ```bash
  cd ../../apps/mobile
  pnpm ios  # or pnpm android
  ```

- [ ] Test cookie extraction works (create test component)
  ```tsx
  // Test in apps/mobile/app/test-cookies.tsx
  import { WebView } from 'react-native-webview';
  import CookieManager from '@react-native-cookies/cookies';

  const onMessage = (event) => {
    console.log('Cookies via JS:', event.nativeEvent.data);
  };

  const getCookiesNative = async () => {
    const cookies = await CookieManager.get('https://news.ycombinator.com');
    console.log('Cookies via native:', cookies);
  };

  <WebView
    source={{ uri: 'https://news.ycombinator.com' }}
    injectedJavaScript="window.ReactNativeWebView.postMessage(document.cookie)"
    onMessage={onMessage}
    sharedCookiesEnabled={true}
  />
  ```

- [ ] Verify cheerio works in React Native
  ```typescript
  // Test in packages/shared/src/__tests__/cheerio.test.ts
  import { load } from 'cheerio';

  const html = '<div id="test">Hello</div>';
  const $ = load(html);
  expect($('#test').text()).toBe('Hello');
  ```

- [ ] Check bundle size impact
  ```bash
  # Before and after adding cheerio
  pnpm web:build
  # Compare .next/static/chunks sizes
  ```

**Success Criteria:**
- ✅ All packages install without peer dependency warnings
- ✅ Development build runs on iOS and Android
- ✅ Test WebView can extract cookies via both methods
- ✅ cheerio parses HTML without errors
- ✅ Bundle size increase is acceptable (< 300KB)

---

### Phase 1: Shared Auth Core (Week 1, Days 2-4)

**Goal:** Build the foundation - types, error handling, HTML parsing, and write API client

#### 1.1 Security Foundation

- [ ] Create error taxonomy
  ```typescript
  // packages/shared/src/auth/errors.ts
  export class HNAuthError extends Error {
    constructor(
      message: string,
      public code: 'NOT_LOGGED_IN' | 'INSUFFICIENT_KARMA' | 'RATE_LIMITED' | 'PARSE_ERROR' | 'CAPTCHA_REQUIRED' | 'NETWORK_ERROR'
    ) {
      super(message);
      this.name = 'HNAuthError';
    }
  }

  export function isAuthError(error: unknown): error is HNAuthError {
    return error instanceof HNAuthError;
  }
  ```

- [ ] Create `SecureSession` wrapper to prevent cookie leakage
  ```typescript
  // packages/shared/src/auth/session.ts
  export class SecureSession {
    private cookies: Record<string, string>;

    constructor(cookies: Record<string, string>) {
      this.cookies = cookies;
    }

    // Only way to get cookies - explicit method name warns developers
    dangerouslyGetRawCookiesForFetch(): string {
      return Object.entries(this.cookies)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ');
    }

    // Safe to log/display - no actual cookie values
    getDisplayToken(): string {
      const userCookie = this.cookies['user'];
      if (!userCookie) return 'No session';
      return `hn_session_${userCookie.slice(0, 8)}...`;
    }

    hasValidSession(): boolean {
      return !!this.cookies['user'];
    }

    // Prevent accidental JSON.stringify exposure
    toJSON() {
      return { display: this.getDisplayToken() };
    }

    // Prevent console.log exposure
    toString() {
      return this.getDisplayToken();
    }
  }
  ```

- [ ] Add rate limiter
  ```typescript
  // packages/shared/src/auth/rate-limiter.ts
  export class HNRateLimiter {
    private actionTimestamps: number[] = [];
    private readonly MAX_ACTIONS_PER_MINUTE = 30; // Conservative HN limit

    async throttle(): Promise<void> {
      const now = Date.now();
      const oneMinuteAgo = now - 60000;

      // Remove timestamps older than 1 minute
      this.actionTimestamps = this.actionTimestamps.filter(t => t > oneMinuteAgo);

      if (this.actionTimestamps.length >= this.MAX_ACTIONS_PER_MINUTE) {
        const oldestAction = this.actionTimestamps[0];
        const waitTime = oldestAction + 60000 - now;

        console.warn(`[HN Rate Limit] Waiting ${Math.ceil(waitTime / 1000)}s before next action`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      this.actionTimestamps.push(now);
    }

    reset() {
      this.actionTimestamps = [];
    }
  }

  // Singleton instance
  export const hnRateLimiter = new HNRateLimiter();
  ```

#### 1.2 HTML Parsing Utilities

- [ ] Create HTML fixtures for testing
  ```bash
  mkdir -p packages/shared/src/__tests__/fixtures
  # Manually save HTML from:
  # - https://news.ycombinator.com/item?id=1 (vote link)
  # - https://news.ycombinator.com/item?id=1 (comment form)
  # - https://news.ycombinator.com/login (login form - for reference)
  ```

- [ ] Implement vote link parser
  ```typescript
  // packages/shared/src/auth/parsers.ts
  import { load } from 'cheerio';
  import { HNAuthError } from './errors';

  export function parseVoteLink(html: string, itemId: number): string {
    const $ = load(html);
    const voteLink = $(`#up_${itemId}`).attr('href');

    if (!voteLink) {
      // Smart error detection
      if ($.text().includes('login')) {
        throw new HNAuthError('Session expired - please log in again', 'NOT_LOGGED_IN');
      }
      if ($.text().includes('karma')) {
        throw new HNAuthError('Insufficient karma to vote', 'INSUFFICIENT_KARMA');
      }
      if ($.text().includes('slow down') || $.text().includes('too fast')) {
        throw new HNAuthError('Rate limited - please wait', 'RATE_LIMITED');
      }
      if ($.text().includes('captcha') || $.text().includes('verify')) {
        throw new HNAuthError('CAPTCHA required - cannot proceed', 'CAPTCHA_REQUIRED');
      }
      throw new HNAuthError(
        `Vote link not found for item ${itemId} - HN HTML may have changed`,
        'PARSE_ERROR'
      );
    }

    return voteLink;
  }

  export function parseUnvoteLink(html: string, itemId: number): string {
    const $ = load(html);
    const unvoteLink = $(`#un_${itemId}`).attr('href');

    if (!unvoteLink) {
      throw new HNAuthError(
        `Unvote link not found for item ${itemId}`,
        'PARSE_ERROR'
      );
    }

    return unvoteLink;
  }

  export function parseCommentFormHmac(html: string): string {
    const $ = load(html);
    const hmac = $('input[name="hmac"]').attr('value');

    if (!hmac) {
      if ($.text().includes('login')) {
        throw new HNAuthError('Session expired - please log in again', 'NOT_LOGGED_IN');
      }
      throw new HNAuthError('Comment form HMAC not found', 'PARSE_ERROR');
    }

    return hmac;
  }
  ```

- [ ] Add unit tests for parsers
  ```typescript
  // packages/shared/src/__tests__/parsers.test.ts
  import { readFileSync } from 'fs';
  import { parseVoteLink, parseCommentFormHmac } from '../auth/parsers';

  describe('HTML Parsers', () => {
    it('extracts vote link from fixture', () => {
      const html = readFileSync(__dirname + '/fixtures/item-page.html', 'utf-8');
      const link = parseVoteLink(html, 1);
      expect(link).toMatch(/^vote\?id=1&how=up&auth=/);
    });

    it('throws NOT_LOGGED_IN when login prompt detected', () => {
      const html = '<html><body>Please <a href="/login">log in</a></body></html>';
      expect(() => parseVoteLink(html, 1)).toThrow('NOT_LOGGED_IN');
    });
  });
  ```

#### 1.3 Write API Client

- [ ] Create base fetch utility with HTTPS enforcement
  ```typescript
  // packages/shared/src/api/hn-write-api.ts
  import { SecureSession } from '../auth/session';
  import { HNAuthError } from '../auth/errors';
  import { hnRateLimiter } from '../auth/rate-limiter';

  const HN_BASE_URL = 'https://news.ycombinator.com';

  function validateHTTPS(url: string) {
    if (!url.startsWith('https://')) {
      throw new Error('HTTPS required for all HN requests');
    }
  }

  async function fetchHN(
    path: string,
    session: SecureSession,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${HN_BASE_URL}${path}`;
    validateHTTPS(url);

    // Apply rate limiting
    await hnRateLimiter.throttle();

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Cookie': session.dangerouslyGetRawCookiesForFetch(),
        'User-Agent': 'HN-Client/1.0 (Mobile)',
      },
    });

    if (!response.ok) {
      throw new HNAuthError(
        `HN request failed: ${response.status}`,
        'NETWORK_ERROR'
      );
    }

    return response;
  }
  ```

- [ ] Implement vote function
  ```typescript
  export async function vote(
    itemId: number,
    session: SecureSession
  ): Promise<void> {
    // Step 1: Fetch item page to get auth token
    const itemPage = await fetchHN(`/item?id=${itemId}`, session);
    const html = await itemPage.text();

    // Step 2: Parse vote link
    const voteLink = parseVoteLink(html, itemId);

    // Step 3: Follow vote link
    await fetchHN(`/${voteLink}`, session);
  }

  export async function unvote(
    itemId: number,
    session: SecureSession
  ): Promise<void> {
    const itemPage = await fetchHN(`/item?id=${itemId}`, session);
    const html = await itemPage.text();
    const unvoteLink = parseUnvoteLink(html, itemId);
    await fetchHN(`/${unvoteLink}`, session);
  }
  ```

- [ ] Implement comment function
  ```typescript
  export async function comment(
    parentId: number,
    text: string,
    session: SecureSession
  ): Promise<void> {
    // Step 1: Fetch parent item page to get HMAC
    const itemPage = await fetchHN(`/item?id=${parentId}`, session);
    const html = await itemPage.text();
    const hmac = parseCommentFormHmac(html);

    // Step 2: POST comment
    const formData = new URLSearchParams({
      parent: parentId.toString(),
      hmac: hmac,
      text: text,
    });

    await fetchHN('/comment', session, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
  }
  ```

- [ ] Add favorite, hide, flag functions (same pattern as vote)
  ```typescript
  export async function favorite(itemId: number, session: SecureSession): Promise<void> {
    const itemPage = await fetchHN(`/item?id=${itemId}`, session);
    const html = await itemPage.text();
    const $ = load(html);
    const favLink = $(`#fave_${itemId}`).attr('href');
    if (!favLink) throw new HNAuthError('Favorite link not found', 'PARSE_ERROR');
    await fetchHN(`/${favLink}`, session);
  }

  // Similar for hide() and flag()
  ```

- [ ] Export all from shared package
  ```typescript
  // packages/shared/src/auth/index.ts
  export * from './errors';
  export * from './session';
  export * from './rate-limiter';
  export * from './parsers';

  // packages/shared/src/api/index.ts
  export * from './hn-api'; // Existing read API
  export * from './hn-write-api'; // New write API
  ```

**Success Criteria:**
- ✅ All types compile without errors
- ✅ Unit tests pass with 100% coverage for parsers
- ✅ SecureSession prevents cookie exposure in logs
- ✅ Rate limiter delays actions correctly
- ✅ Write API functions have correct signatures

---

### Phase 2: Mobile Integration (Week 2, Days 1-4)

**Goal:** Build WebView login screen and integrate with mobile app

#### 2.1 WebView Login Screen

- [ ] Create login modal component
  ```tsx
  // apps/mobile/components/hn-auth/login-modal.tsx
  import { Modal, SafeAreaView, ActivityIndicator } from 'react-native';
  import { WebView } from 'react-native-webview';
  import CookieManager from '@react-native-cookies/cookies';
  import * as SecureStore from 'expo-secure-store';
  import { useState } from 'react';

  interface HNLoginModalProps {
    visible: boolean;
    onLoginSuccess: (cookies: Record<string, string>) => void;
    onCancel: () => void;
  }

  export function HNLoginModal({ visible, onLoginSuccess, onCancel }: HNLoginModalProps) {
    const [loading, setLoading] = useState(false);

    const handleNavigationStateChange = async (navState) => {
      // Detect successful login
      if (navState.url.startsWith('https://news.ycombinator.com/news')) {
        setLoading(true);

        // Wait for cookies to settle
        await new Promise(resolve => setTimeout(resolve, 500));

        // Extract cookies using native manager
        const cookies = await CookieManager.get('https://news.ycombinator.com', true);

        // Validate we got session cookie
        if (!cookies['user']) {
          console.error('Login succeeded but no session cookie found');
          setLoading(false);
          return;
        }

        // Store in secure storage
        await SecureStore.setItemAsync('hn_cookies', JSON.stringify(cookies));

        // Notify parent
        onLoginSuccess(cookies);
      }
    };

    // Fallback: inject JS to extract cookies
    const injectedJS = `
      setTimeout(() => {
        window.ReactNativeWebView.postMessage(document.cookie);
      }, 1000);
    `;

    const handleMessage = async (event) => {
      const cookieString = event.nativeEvent.data;
      if (cookieString && cookieString.includes('user=')) {
        // Parse cookie string to object
        const cookies = Object.fromEntries(
          cookieString.split('; ').map(c => {
            const [key, ...values] = c.split('=');
            return [key, values.join('=')];
          })
        );

        await SecureStore.setItemAsync('hn_cookies', JSON.stringify(cookies));
        onLoginSuccess(cookies);
      }
    };

    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1 }}>
          {loading ? (
            <ActivityIndicator size="large" />
          ) : (
            <WebView
              source={{ uri: 'https://news.ycombinator.com/login' }}
              onNavigationStateChange={handleNavigationStateChange}
              injectedJavaScript={injectedJS}
              onMessage={handleMessage}
              sharedCookiesEnabled={true}
              thirdPartyCookiesEnabled={true}
            />
          )}
        </SafeAreaView>
      </Modal>
    );
  }
  ```

#### 2.2 Auth Context Provider

- [ ] Create auth context
  ```tsx
  // apps/mobile/contexts/hn-auth-context.tsx
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
  ```

- [ ] Add provider to app layout
  ```tsx
  // apps/mobile/app/_layout.tsx - add HNAuthProvider
  import { HNAuthProvider } from '@/contexts/hn-auth-context';

  export default function RootLayout() {
    return (
      <QueryClientProvider client={queryClient}>
        <ColorSchemeProvider>
          <HNAuthProvider>
            <RootLayoutContent />
          </HNAuthProvider>
        </ColorSchemeProvider>
      </QueryClientProvider>
    );
  }
  ```

#### 2.3 UI Integration

- [ ] Add login button to settings/profile screen
  ```tsx
  // apps/mobile/app/(tabs)/settings/index.tsx
  import { useHNAuth } from '@/contexts/hn-auth-context';
  import { HNLoginModal } from '@/components/hn-auth/login-modal';
  import { useState } from 'react';

  export default function SettingsScreen() {
    const { session, login, logout, isAuthenticated } = useHNAuth();
    const [showLogin, setShowLogin] = useState(false);

    return (
      <View>
        {isAuthenticated ? (
          <>
            <Text>Logged in as: {session?.getDisplayToken()}</Text>
            <Button title="Logout" onPress={logout} />
          </>
        ) : (
          <Button title="Login to HN" onPress={() => setShowLogin(true)} />
        )}

        <HNLoginModal
          visible={showLogin}
          onLoginSuccess={(cookies) => {
            login(cookies);
            setShowLogin(false);
          }}
          onCancel={() => setShowLogin(false)}
        />
      </View>
    );
  }
  ```

- [ ] Add vote button to story cards
  ```tsx
  // apps/mobile/components/story-card.tsx
  import { useHNAuth } from '@/contexts/hn-auth-context';
  import { vote } from '@hn/shared/api';
  import { useMutation, useQueryClient } from '@tanstack/react-query';

  export function StoryCard({ story }: { story: HNItem }) {
    const { session, isAuthenticated } = useHNAuth();
    const queryClient = useQueryClient();

    const voteMutation = useMutation({
      mutationFn: async () => {
        if (!session) throw new Error('Not authenticated');
        await vote(story.id, session);
      },
      onSuccess: () => {
        // Optimistic update
        queryClient.setQueryData(['item', story.id], (old: HNItem) => ({
          ...old,
          score: (old.score ?? 0) + 1,
        }));
      },
    });

    if (!isAuthenticated) return null;

    return (
      <Button
        title="▲"
        onPress={() => voteMutation.mutate()}
        disabled={voteMutation.isPending}
      />
    );
  }
  ```

- [ ] Add comment form to story detail page
  ```tsx
  // apps/mobile/app/story/[id].tsx
  import { comment } from '@hn/shared/api';
  import { useHNAuth } from '@/contexts/hn-auth-context';

  export default function StoryDetailScreen() {
    const { session, isAuthenticated } = useHNAuth();
    const [commentText, setCommentText] = useState('');

    const commentMutation = useMutation({
      mutationFn: async (text: string) => {
        if (!session) throw new Error('Not authenticated');
        await comment(storyId, text, session);
      },
      onSuccess: () => {
        setCommentText('');
        // Refetch story to show new comment
        queryClient.invalidateQueries(['item', storyId]);
      },
    });

    if (!isAuthenticated) {
      return <Text>Log in to comment</Text>;
    }

    return (
      <View>
        <TextInput
          value={commentText}
          onChangeText={setCommentText}
          placeholder="Add a comment..."
          multiline
        />
        <Button
          title="Post Comment"
          onPress={() => commentMutation.mutate(commentText)}
          disabled={!commentText || commentMutation.isPending}
        />
      </View>
    );
  }
  ```

**Success Criteria:**
- ✅ Login modal opens HN login page
- ✅ Cookies extracted after successful login
- ✅ Session persists across app restarts
- ✅ Vote button appears for authenticated users
- ✅ Comment form works for authenticated users
- ✅ Logout clears session

---

### Phase 3: Polish & Testing (Week 2, Days 5-7)

#### 3.1 Error Handling & Recovery

- [ ] Add session expiration detection
  ```typescript
  // In vote/comment mutations, catch NOT_LOGGED_IN errors
  onError: (error) => {
    if (isAuthError(error) && error.code === 'NOT_LOGGED_IN') {
      // Clear invalid session
      logout();

      // Show re-login prompt
      Alert.alert(
        'Session Expired',
        'Please log in again to continue',
        [{ text: 'Login', onPress: () => setShowLogin(true) }]
      );
    }
  }
  ```

- [ ] Add user feedback for rate limiting
  ```typescript
  onError: (error) => {
    if (isAuthError(error) && error.code === 'RATE_LIMITED') {
      Alert.alert(
        'Slow Down',
        'You\'re performing actions too quickly. Please wait a moment.',
        [{ text: 'OK' }]
      );
    }
  }
  ```

- [ ] Handle parse errors gracefully
  ```typescript
  onError: (error) => {
    if (isAuthError(error) && error.code === 'PARSE_ERROR') {
      // This likely means HN changed their HTML
      Alert.alert(
        'Something Went Wrong',
        'The app may need an update. Please try again later.',
        [{ text: 'OK' }]
      );

      // Log to analytics for monitoring
      analytics.logEvent('hn_parse_error', {
        function: 'vote',
        itemId: story.id,
      });
    }
  }
  ```

#### 3.2 Security Audit

- [ ] Add ESLint rule to prevent cookie logging
  ```json
  // apps/mobile/.eslintrc.json
  {
    "rules": {
      "no-restricted-syntax": [
        "error",
        {
          "selector": "CallExpression[callee.object.name='console'][arguments.0.type='Identifier'][arguments.0.name=/cookie|Cookie|session|Session/]",
          "message": "Never log cookies or sessions - use SecureSession.getDisplayToken() instead"
        }
      ]
    }
  }
  ```

- [ ] Manual audit: Search for cookie exposure
  ```bash
  # Run these searches and verify no results expose actual cookies
  grep -r "console.log.*cookie" apps/mobile
  grep -r "console.log.*session" apps/mobile
  grep -r "JSON.stringify.*cookie" packages/shared
  ```

- [ ] Test error reporting doesn't leak cookies
  ```typescript
  // If using Sentry or similar
  Sentry.init({
    beforeSend(event) {
      // Scrub cookies from all requests
      if (event.request?.headers) {
        delete event.request.headers['Cookie'];
        delete event.request.headers['cookie'];
      }

      // Scrub from breadcrumbs
      event.breadcrumbs?.forEach(crumb => {
        if (crumb.data?.Cookie) delete crumb.data.Cookie;
        if (crumb.data?.cookies) delete crumb.data.cookies;
      });

      return event;
    }
  });
  ```

#### 3.3 Testing

- [ ] Manual QA checklist
  - [ ] Login flow works on iOS
  - [ ] Login flow works on Android
  - [ ] Session persists after app restart
  - [ ] Vote increments score optimistically
  - [ ] Comment appears after posting
  - [ ] Logout clears session
  - [ ] Re-login after logout works
  - [ ] Session expiration triggers re-login prompt
  - [ ] Rate limiting shows warning message
  - [ ] App handles network errors gracefully

- [ ] Performance testing
  - [ ] Vote action completes in < 3 seconds
  - [ ] Comment posting completes in < 5 seconds
  - [ ] Rate limiter allows 30 actions/min
  - [ ] Bundle size increase is acceptable

- [ ] Security testing
  - [ ] Cookies never appear in console logs
  - [ ] SecureSession toString() doesn't expose cookies
  - [ ] Error reporting doesn't leak cookies
  - [ ] HTTPS enforced for all requests

**Success Criteria:**
- ✅ All manual QA tests pass
- ✅ No cookie exposure vulnerabilities
- ✅ Error handling provides good UX
- ✅ Performance is acceptable

---

### Phase 4: Documentation & Deployment (Week 3)

#### 4.1 Update Documentation

- [ ] Update CLAUDE.md with auth architecture
  ```markdown
  ## Authentication (Mobile Only)

  The mobile app supports HN authentication via WebView login:
  - Users log in through official HN website (no credential handling in app)
  - Cookies extracted and stored in expo-secure-store
  - Write operations (vote, comment) use cookies for authentication
  - Web app remains read-only (no authentication)
  ```

- [ ] Create developer guide
  ```markdown
  # HN Authentication Developer Guide

  ## How It Works
  1. User taps "Login" button
  2. WebView opens https://news.ycombinator.com/login
  3. User enters credentials on official HN site
  4. After successful login, app extracts cookies
  5. Cookies stored securely in expo-secure-store
  6. Write API uses cookies for authenticated requests

  ## Security Considerations
  - Never log cookies (use SecureSession.getDisplayToken())
  - Always use HTTPS for HN requests
  - Rate limit enforced client-side (30 actions/min)
  - Session expiration handled with re-login prompt

  ## Testing
  - Use test account for development
  - Don't commit test credentials to repo
  - Monitor bundle size impact of cheerio
  ```

- [ ] Add inline code comments for complex logic
  - [ ] WebView cookie extraction timing
  - [ ] Rate limiter algorithm
  - [ ] HTML parsing error detection

#### 4.2 Web App Strategy

- [ ] Update web app to show auth limitations
  ```tsx
  // apps/web/components/auth-cta.tsx
  export function AuthCTA() {
    return (
      <div className="bg-orange-100 p-4 rounded">
        <p className="text-sm">
          Want to vote and comment? Download the mobile app!
        </p>
        <div className="flex gap-2 mt-2">
          <a href="https://apps.apple.com/...">
            <img src="/app-store-badge.png" alt="Download on App Store" />
          </a>
          <a href="https://play.google.com/...">
            <img src="/google-play-badge.png" alt="Get it on Google Play" />
          </a>
        </div>
      </div>
    );
  }
  ```

- [ ] Add "Open in app" deep links
  ```tsx
  // apps/web/app/story/[id]/page.tsx
  export default function StoryPage({ params }) {
    const deepLink = `hn-client://story/${params.id}`;

    return (
      <div>
        <a href={deepLink}>Open in app</a>
        {/* Story content */}
      </div>
    );
  }
  ```

#### 4.3 App Store Preparation

- [ ] Update app description
  ```
  Features:
  - Browse HN stories (Top, New, Ask, Show, Jobs)
  - Upvote stories and comments
  - Post comments and replies
  - Bookmark favorite stories
  - Dark mode support
  ```

- [ ] Create privacy policy
  ```markdown
  # Privacy Policy

  ## Authentication
  - Login handled through official HN website
  - We do not store your HN password
  - Session cookies stored locally on your device
  - No data sent to third-party servers

  ## Data Collection
  - We do not collect personal information
  - Analytics are anonymized (if applicable)
  - All data stored locally on device
  ```

- [ ] Test app submission requirements
  - [ ] All required app icons present
  - [ ] Privacy policy URL configured
  - [ ] App screenshots prepared
  - [ ] TestFlight build ready

**Success Criteria:**
- ✅ Documentation is comprehensive
- ✅ Web app clearly communicates limitations
- ✅ App store listing is ready
- ✅ Privacy policy is complete

---

## What's NOT Included (Future Enhancements)

These features are intentionally excluded from v1:

### Deferred to Future Versions
- ❌ **Web authentication** - Keep web read-only for now
- ❌ **Downvoting** - Requires karma detection and gating
- ❌ **Editing comments** - 2-hour window, added complexity
- ❌ **Deleting comments** - Low priority
- ❌ **Submitting new stories** - Different form structure
- ❌ **Voting on comments** - Different URL pattern than stories
- ❌ **Auto-refresh cookies** - Manual re-login is acceptable for v1
- ❌ **Biometric re-authentication** - TouchID/FaceID before actions
- ❌ **Multiple account support** - Single account is sufficient

### Why These Are Deferred
- They follow the same pattern as implemented features (easy to add later)
- They're lower priority for MVP
- They add complexity without proportional value
- User research needed to validate demand

---

## Optional: Keep Next.js for Other Features

Since you already have the monorepo and Next.js app, you can use the server for:

### Future Server Features (Not Auth)
- **Link preview proxy** - Fetch OG metadata server-side to avoid CORS
- **Search API** - Algolia HN search with server-side caching
- **RSS feed generation** - Custom feeds for users
- **Analytics dashboard** - Server-rendered charts
- **Admin panel** - Manage app content, announcements

But for **authentication**, it's 100% client-side on mobile. No server needed.

---

## Timeline Summary

| Phase | Duration | Goal |
|-------|----------|------|
| Phase 0: Dependencies | 1 day | Install and verify packages |
| Phase 1: Shared Core | 3 days | Build write API and security foundation |
| Phase 2: Mobile Integration | 4 days | WebView login and UI integration |
| Phase 3: Polish & Testing | 3 days | Error handling, security audit, QA |
| Phase 4: Documentation | 2 days | Docs, web updates, app store prep |
| **Total** | **~2 weeks** | Fully functional mobile auth |

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Cookie extraction fails | Use both native manager AND JS injection as fallback |
| HN changes HTML | Fixtures + monitoring + smart error detection |
| Rate limiting triggers ban | Conservative 30/min limit + user warnings |
| Session expires silently | Detect NOT_LOGGED_IN errors, prompt re-login |
| Bundle size bloat | Monitor size, consider cheerio alternatives if needed |
| Security audit failure | Comprehensive ESLint rules + manual audit |

---

## Success Metrics

**Phase 0:**
- All dependencies install without errors
- Test cookie extraction works on both iOS and Android

**Phase 1:**
- 100% test coverage for HTML parsers
- SecureSession prevents cookie exposure
- Write API compiles without TypeScript errors

**Phase 2:**
- Login flow completes in < 10 seconds
- Session persists across app restarts
- Vote/comment actions work reliably

**Phase 3:**
- Zero cookie exposure vulnerabilities
- All error scenarios handled gracefully
- QA checklist 100% complete

**Phase 4:**
- Documentation is comprehensive
- App ready for TestFlight/Play Store submission

---

## Conclusion

This simplified plan:
- ✅ **Removes server dependency** - 100% client-side for auth
- ✅ **Reduces complexity** - No web auth, no cookie proxy
- ✅ **Faster implementation** - ~2 weeks vs ~4 weeks
- ✅ **Lower costs** - No server hosting for auth
- ✅ **Better security** - Fewer attack surfaces

The original plan was based on incorrect information about WebView cookie access. This improved plan uses proven, battle-tested methods that have worked for other HN clients for years.

**Next Steps:**
1. Review and approve this plan
2. Start with Phase 0 dependency setup
3. Proceed sequentially through phases
4. Ship mobile auth in ~2 weeks
5. Optionally add web features later using Next.js server (but not for auth)
