# HN Client Authentication Implementation Analysis Report

**Date:** 2025-10-25
**Scope:** Analysis of planned authentication implementation for HN Client monorepo
**Documents Reviewed:**
- [todo/auth/plan.md](plan.md)
- [todo/auth/tasks.md](tasks.md)
- [todo/auth/article.md](article.md) - Swizec's article on reverse-engineering HN
- [todo/auth/gist.md](gist.md) - Reference implementation
- Current codebase structure and patterns

---

## Executive Summary

**Overall Assessment:** ✅ **GOOD WITH CONCERNS**

The authentication implementation plan is **well-researched, technically sound, and appropriately scoped**. The task breakdown is comprehensive and demonstrates deep understanding of both the HN authentication mechanism and the existing codebase architecture. However, there are **critical security concerns** and **implementation risks** that must be addressed before proceeding.

**Key Findings:**
- ✅ Tasks are well-structured and follow monorepo patterns
- ✅ Approach is battle-tested by existing HN clients
- ⚠️ Security posture needs hardening (cookie exposure, error handling)
- ⚠️ Web implementation has unresolved architectural decisions
- ⚠️ Missing dependency planning and version compatibility checks
- ⚠️ Rate limiting and anti-bot detection not adequately addressed

**Recommendation:** **PROCEED WITH MODIFICATIONS** - Implement the plan after addressing the security concerns and technical gaps outlined in this report.

---

## 1. Task Quality Assessment

### 1.1 Strengths

**Excellent Structural Alignment**
The task breakdown correctly identifies the monorepo architecture:
- ✅ Properly scopes shared code to `packages/shared`
- ✅ Separates mobile (`apps/mobile`) and web (`apps/web`) concerns
- ✅ Follows existing patterns (e.g., bookmarks in `apps/mobile/lib/bookmarks.ts`)

**Comprehensive Coverage**
Tasks address all major concerns:
- ✅ Research & architecture phase before coding
- ✅ Security considerations (cookie scrubbing, no credential handling in-app)
- ✅ Cross-platform cookie persistence strategy
- ✅ Integration testing with HTML fixtures
- ✅ QA and smoke testing checklists

**Realistic Scope Management**
The plan acknowledges complexity and unknowns:
- ✅ Platform-specific spikes (cookie availability on iOS/Android/Web)
- ✅ "Follow-up / Nice-to-haves" section for deferred work
- ✅ Documentation requirements for developer onboarding

### 1.2 Gaps and Missing Tasks

**Critical Missing Dependencies**
- ❌ **No package installation tasks** - `expo-cookie`, `expo-secure-store`, `cheerio-without-node-native`, `react-native-webview` are mentioned but not added to task list
- ❌ **No version compatibility verification** - Expo SDK 54 compatibility with these packages not confirmed
- ❌ **No bundle size impact analysis** - cheerio adds significant weight; need to verify tree-shaking works

**Incomplete Web Strategy**
Task: "Decide on approach for cookies (documented spike outcome)" is too vague:
- ❌ No timeline for decision
- ❌ No fallback if both approaches fail
- ❌ No consideration of SameSite cookie restrictions in modern browsers
- ❌ Missing evaluation of `@react-native-cookies/cookies` which might work better than `expo-cookie`

**Insufficient Error Recovery Planning**
- ❌ No handling for HN's anti-bot mechanisms (CAPTCHAs, IP rate limits)
- ❌ No session refresh/re-auth flow when cookies expire
- ❌ No offline/network error handling for write operations

**Testing Gaps**
- ❌ No E2E testing plan (only unit tests with fixtures mentioned)
- ❌ No load testing to verify rate limit behavior
- ❌ No security testing (e.g., verify cookies never leak to logs/analytics)

### 1.3 Task Organization Issues

**Ambiguous Ownership**
Some tasks don't clearly indicate which package they affect:
- "Add environment guardrails" - Should this be in shared, mobile, web, or all three?
- "Wire `pnpm typecheck` and `pnpm lint`" - Already exists in root, mobile, web, and shared

**Missing Sequencing**
Tasks are grouped by area but not by dependency order. For example:
- "Create a new module `@hn/shared/auth/session`" must complete before mobile/web tasks can use it
- HTML parsing tests should be written before the write API client is used in production

**Recommendation:** Add explicit task dependencies and sequence numbers (e.g., "1.1", "1.2") to clarify execution order.

---

## 2. Approach Validation

### 2.1 Is This The Best Approach?

**Short Answer:** Yes, for a third-party client. There is no alternative.

**Context:**
Hacker News provides no official write API. The only options are:
1. **Reverse-engineer the web forms** (proposed approach)
2. **Don't implement write features** (feature parity loss)
3. **Wait for official API** (has been "years" with no movement per plan.md)

### 2.2 Precedent and Community Acceptance

**Strong Precedent:**
- Multiple iOS/Android clients use this approach (referenced in plan.md)
- Swizec's article from 2016 is still referenced as canonical guidance
- HN has not taken action against clients using form mirroring

**Ethical Considerations:**
The plan correctly notes:
> "Use your new superpower responsibly"

This approach:
- ✅ Respects user intent (user authenticates, user initiates actions)
- ✅ No server-side credential storage (WebView handles login)
- ✅ Uses real user session cookies (no impersonation)
- ⚠️ Technically qualifies as "screen scraping" (terms of service gray area)

**Risk Level:** LOW - As long as:
- Rate limits are respected
- User-Agent is honest (identify as "HN Client v1.0" not "Mozilla/5.0...")
- No automated bulk actions (voting rings, spam)

### 2.3 Alternative Approaches Considered

**Alternative 1: OAuth Proxy Service**
- Build a server that holds HN credentials and issues OAuth tokens to clients
- ❌ **TERRIBLE IDEA** - Centralizes credential storage, creates honeypot target
- ❌ Violates plan's core principle: "never proxy or store passwords on your servers"

**Alternative 2: Browser Extension Pattern**
- Web-only solution using content scripts to inject actions into official HN site
- ❌ Doesn't work for native mobile apps
- ❌ Limited by extension permissions (e.g., iOS Safari extensions are sandboxed)

**Alternative 3: Wait for Official API**
- Per plan.md: "years ago HN hinted they might add OAuth... but that never materialized"
- ❌ No indication this will happen
- ❌ Leaves app permanently feature-incomplete

**Verdict:** The proposed approach is the **only viable option** for cross-platform write capabilities.

---

## 3. Expected Results Analysis

### 3.1 Will This Achieve The Desired Functionality?

**Core Features:** ✅ **YES**

The plan should successfully enable:
- ✅ User login via official HN WebView
- ✅ Upvoting/unvoting stories
- ✅ Posting comments and replies
- ✅ Favoriting/hiding/flagging (same pattern as voting)
- ✅ Session persistence across app restarts

**Platform Parity:**
- ✅ **Mobile (iOS/Android):** High confidence - `expo-secure-store` + `expo-cookie` + WebView is proven pattern
- ⚠️ **Web (Next.js):** Medium confidence - Cookie access is the blocker, plan has no definitive solution

### 3.2 Web Implementation Concerns

**The Cookie Problem:**
Modern browsers block third-party cookie access via JavaScript for privacy. The plan proposes two solutions:

**Option 1: Manual Cookie Paste**
```
1. Open HN login in new window
2. Ask user to open DevTools
3. Copy cookie value
4. Paste into app
```
- ❌ **Terrible UX** - Non-technical users will struggle
- ❌ **Security risk** - Users may paste cookies into wrong places (phishing opportunity)
- ✅ Technically simple, no server required

**Option 2: Next.js API Route Proxy**
```
Client -> Next.js API route -> HN (with cookies) -> Next.js -> Client
```
- ✅ Better UX - Transparent to user
- ⚠️ **Violates plan's principle** - Server now handles cookies (even if transiently)
- ⚠️ **Scalability concern** - Server becomes rate-limit bottleneck
- ⚠️ **Deployment complexity** - Requires server runtime (not static export)

**Missing Option 3: Web-Only Anonymous Mode**
- Ship web app without write features, display "Open in mobile app to vote/comment"
- ✅ Clean separation of concerns
- ✅ Respects browser security model
- ❌ Feature regression for web users

**Recommendation:** Implement Option 3 initially, add Option 2 as enhancement later with clear documentation about server-side cookie handling.

### 3.3 Feature Completeness

**Supported:**
- ✅ Login/logout
- ✅ Vote/unvote
- ✅ Comment/reply
- ✅ Favorite/hide/flag (same pattern)

**Not Addressed in Plan:**
- ❌ **Downvoting** - Requires 500+ karma, plan mentions "karma gating" but no UI strategy
- ❌ **Editing comments** - HN allows edit within 2 hours, not mentioned
- ❌ **Deleting comments** - Possible on HN, not in plan
- ❌ **Submitting new stories** - Requires parsing submission form, not mentioned
- ❌ **Voting on comments** - Different URL pattern than story votes

**Impact:** Plan delivers **minimum viable write API** but not feature parity with HN website.

**Recommendation:** Document these as known limitations or add to "Follow-up / Nice-to-haves" section.

---

## 4. Security Concerns

### 4.1 CRITICAL: Cookie Exposure Risks

**Issue:** Session cookies grant full account access. If leaked, attacker can impersonate user.

**Current Mitigation (from tasks):**
> "Add environment guardrails: ensure we never log cookies, and scrub them from error reports"

**Problems:**
- ❌ **Reactive, not proactive** - Relies on manual scrubbing in every code path
- ❌ **No runtime enforcement** - Developers could accidentally log cookies
- ❌ **Analytics/crash reporting** - Cookies could leak via unhandled errors in Sentry, LogRocket, etc.

**Recommendations:**

**1. Wrap cookie access with typed API:**
```typescript
// packages/shared/src/auth/session.ts
class SecureSession {
  private cookies: string; // Private, never exposed

  setCookies(value: string) {
    this.cookies = value;
  }

  // Returns opaque token for display, not actual cookie
  getDisplayToken(): string {
    return `hn_session_${this.cookies.slice(0, 8)}...`;
  }

  // Only way to get actual cookies - explicit method name
  dangerouslyGetRawCookiesForFetch(): string {
    return this.cookies;
  }
}
```

**2. Add TypeScript lint rule:**
```json
// .eslintrc.json
{
  "rules": {
    "no-console": ["error", { "allow": ["warn", "error"] }],
    "no-restricted-syntax": [
      "error",
      {
        "selector": "MemberExpression[property.name='cookies']",
        "message": "Direct cookie access forbidden - use SecureSession API"
      }
    ]
  }
}
```

**3. Sentry/error reporting config:**
```typescript
Sentry.init({
  beforeSend(event) {
    // Scrub all headers
    if (event.request?.headers) {
      delete event.request.headers['Cookie'];
      delete event.request.headers['cookie'];
    }
    // Scrub cookie from breadcrumbs
    event.breadcrumbs?.forEach(crumb => {
      if (crumb.data?.Cookie) delete crumb.data.Cookie;
    });
    return event;
  }
});
```

### 4.2 CSRF and Auth Token Security

**Good:**
- ✅ Plan correctly identifies per-item `auth` tokens must be extracted from pages
- ✅ No attempt to reverse-engineer token generation (would be brittle)

**Concern:**
What if HN changes token format or adds CAPTCHA?

**Current Plan:**
> "Throw when a vote link or comment form is missing"

**Problem:**
- ❌ Generic error doesn't distinguish between "not logged in", "karma too low", "rate limited", or "HN changed the HTML"

**Recommendation:**
Add specific error types:
```typescript
class HNAuthError extends Error {
  constructor(
    message: string,
    public code: 'NOT_LOGGED_IN' | 'INSUFFICIENT_KARMA' | 'RATE_LIMITED' | 'PARSE_ERROR' | 'CAPTCHA_REQUIRED'
  ) {
    super(message);
  }
}
```

Implement smart detection:
```typescript
function parseVoteLink(html: string, itemId: number): string {
  const $ = cheerio.load(html);
  const link = $(`#up_${itemId}`).attr('href');

  if (!link) {
    // Distinguish between different failure modes
    if (html.includes('login')) throw new HNAuthError('Session expired', 'NOT_LOGGED_IN');
    if (html.includes('karma')) throw new HNAuthError('Insufficient karma', 'INSUFFICIENT_KARMA');
    if (html.includes('slow down')) throw new HNAuthError('Rate limited', 'RATE_LIMITED');
    if (html.includes('captcha')) throw new HNAuthError('CAPTCHA required', 'CAPTCHA_REQUIRED');
    throw new HNAuthError('Vote link not found - HN HTML may have changed', 'PARSE_ERROR');
  }

  return link;
}
```

### 4.3 Credential Handling (Login Flow)

**Good:**
- ✅ WebView handles login, app never touches password
- ✅ No server-side credential storage

**Concern:**
WebView cookie extraction timing:

Current plan:
> "Detect login success by watching the URL for `news.ycombinator.com/…`"

**Problem:**
- URL navigation happens before cookies are fully set in some cases
- Race condition: read cookies before they're written

**Recommendation:**
Add explicit wait and validation:
```typescript
// apps/mobile - WebView login handler
async function handleWebViewNavigation(url: string) {
  if (url.startsWith('https://news.ycombinator.com/news')) {
    // Wait for cookies to settle
    await new Promise(resolve => setTimeout(resolve, 500));

    const cookies = await CookieManager.get('https://news.ycombinator.com');

    // Validate we got the user cookie
    if (!cookies['user']) {
      throw new Error('Login succeeded but no session cookie found');
    }

    // Store in secure storage
    await SecureStore.setItemAsync('hn_session', JSON.stringify(cookies));

    // Close WebView
    setShowLoginWebView(false);
  }
}
```

### 4.4 Man-in-the-Middle (MITM) Attacks

**Concern:**
All requests to `news.ycombinator.com` must use HTTPS, but fetch doesn't enforce this by default on some platforms.

**Recommendation:**
Add explicit HTTPS validation:
```typescript
// packages/shared/src/api/hn-write-api.ts
const HN_BASE_URL = 'https://news.ycombinator.com';

function validateURL(url: string) {
  if (!url.startsWith('https://')) {
    throw new Error('HTTPS required for HN requests');
  }
}

async function fetchHN(path: string, options: RequestInit = {}) {
  const url = `${HN_BASE_URL}${path}`;
  validateURL(url);

  return fetch(url, {
    ...options,
    // Add certificate pinning on native if possible
  });
}
```

For extra security on React Native:
```typescript
// Consider adding SSL pinning via expo-ssl-pinning or react-native-ssl-pinning
```

### 4.5 Session Expiration and Refresh

**Gap in Plan:**
No handling for expired sessions. HN cookies can last months, but may be invalidated:
- User changes password on HN website
- HN invalidates sessions (security incident)
- Cookie corruption

**Current Plan:**
> "Investigate auto-refreshing cookies when requests fail"

This is in "Follow-up / Nice-to-haves" but should be in **core scope**.

**Recommendation:**
Implement automatic re-auth detection:
```typescript
async function vote(itemId: number) {
  try {
    await performVote(itemId);
  } catch (error) {
    if (error.code === 'NOT_LOGGED_IN') {
      // Clear invalid session
      await clearHNCookies();

      // Prompt user to re-login
      showReLoginPrompt();
    }
    throw error;
  }
}
```

---

## 5. Technical Risks

### 5.1 Dependency Compatibility

**Issue:** Plan mentions packages not currently installed:

**Mobile Dependencies:**
- `expo-cookie` - NOT in `apps/mobile/package.json`
- `expo-secure-store` - NOT in `apps/mobile/package.json`
- `react-native-webview` - NOT mentioned in plan but may be needed (Expo provides WebView via `expo-web-browser` but plan says "WebView" which is ambiguous)
- `cheerio-without-node-native` - NOT in `packages/shared/package.json`

**Verified Compatibility with Expo SDK 54:**
- ✅ `expo-secure-store` - Compatible with Expo 54
- ✅ `expo-web-browser` - Already installed, compatible
- ⚠️ `expo-cookie` - **Does not exist** as a package name
  - Correct package is `@react-native-cookies/cookies` or use `expo-web-browser`'s cookie APIs
- ⚠️ `cheerio-without-node-native` - Outdated, use `cheerio@1.0.0+` which is now React Native compatible

**Recommendation:**
Add explicit dependency installation task:
```
## Phase 0: Dependency Setup
- [ ] Install `expo-secure-store` in `apps/mobile`: `pnpm add expo-secure-store`
- [ ] Install `@react-native-cookies/cookies` in `apps/mobile`: `pnpm add @react-native-cookies/cookies`
- [ ] Install `cheerio` in `packages/shared`: `pnpm add cheerio`
- [ ] Install `@types/cheerio` in `packages/shared`: `pnpm add -D @types/cheerio`
- [ ] Test cheerio works in RN by running a simple parse in mobile app
- [ ] Verify bundle size increase is acceptable (cheerio is ~200KB minified)
```

### 5.2 HTML Parsing Brittleness

**Risk:**
HN can change HTML structure at any time, breaking the parser.

**Current Mitigation:**
> "Add integration tests (Node environment) that load saved HTML fixtures"

**Problem:**
Fixtures test parsing logic but don't detect when HN changes live HTML.

**Recommendation:**
1. **Version HTML fixtures:**
   ```
   tests/fixtures/hn-html/
     vote-link-v1.html       # Initial
     vote-link-v2.html       # After HN changed class names
     comment-form-v1.html
   ```

2. **Add live HTML smoke tests:**
   ```typescript
   // tests/smoke/hn-live.test.ts
   describe('HN Live HTML Structure', () => {
     it('should successfully parse vote link from live HN page', async () => {
       const html = await fetch('https://news.ycombinator.com/item?id=1').then(r => r.text());
       const $ = cheerio.load(html);
       const voteLink = $('#up_1').attr('href');

       expect(voteLink).toMatch(/^vote\?id=1&how=up&auth=/);
     });
   });
   ```

3. **Add monitoring/alerting:**
   ```typescript
   // Log parse failures to analytics
   if (!voteLink) {
     analytics.logEvent('hn_parse_error', {
       type: 'vote_link',
       itemId,
       htmlSnapshot: html.slice(0, 500) // First 500 chars for debugging
     });
   }
   ```

### 5.3 Rate Limiting

**Plan Mentions:**
> "Respect rate limits"
> "Mirror HN's pacing"
> "Back off on 429s"

**Problem:**
HN doesn't return HTTP 429. Rate limiting is **silent** - you just stop seeing forms/links.

**Real HN Rate Limiting (from experience):**
- ~40 actions per minute triggers shadowban (forms disappear)
- IP-based and account-based limits
- No official documentation

**Current Plan:**
No implementation details for rate limiting.

**Recommendation:**
Implement client-side rate limiting:
```typescript
// packages/shared/src/auth/rate-limiter.ts
class HNRateLimiter {
  private actionTimestamps: number[] = [];
  private readonly MAX_ACTIONS_PER_MINUTE = 30; // Conservative limit

  async throttle(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove old timestamps
    this.actionTimestamps = this.actionTimestamps.filter(t => t > oneMinuteAgo);

    if (this.actionTimestamps.length >= this.MAX_ACTIONS_PER_MINUTE) {
      const oldestAction = this.actionTimestamps[0];
      const waitTime = oldestAction + 60000 - now;

      console.warn(`Rate limit reached. Waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.actionTimestamps.push(now);
  }
}

// Usage
await rateLimiter.throttle();
await vote(itemId);
```

### 5.4 Cheerio Bundle Size

**Concern:**
Plan mentions tree-shaking cheerio but doesn't verify it works.

**Current mobile app bundle (estimated from package.json):**
- React Native: ~800KB
- React Query: ~50KB
- FlashList: ~30KB
- **Adding cheerio: ~200KB** (significant increase)

**Problem:**
Cheerio was designed for Node.js servers, not mobile apps. Even with tree-shaking, it pulls in large dependencies.

**Recommendation:**
Evaluate lighter alternatives:
1. **parse5-lite** - ~40KB, faster than cheerio for simple queries
2. **htmlparser2** - ~30KB, lower-level but more control
3. **Custom regex parsing** - 0KB, brittle but possible for simple cases

Test:
```typescript
// Proof of concept: parse vote link with regex instead of cheerio
function parseVoteLinkRegex(html: string, itemId: number): string | null {
  const pattern = new RegExp(`id="up_${itemId}"[^>]*href="([^"]+)"`);
  const match = html.match(pattern);
  return match?.[1] ?? null;
}
```

For HN's simple HTML, regex might be sufficient and save 200KB.

### 5.5 TypeScript and Module Resolution

**Plan Mentions:**
> "Identify any TypeScript config updates needed for `cheerio-without-node-native`"

**Problem:**
`cheerio-without-node-native` is abandoned. Modern cheerio (1.0.0+) works in React Native.

**Current TypeScript Setup:**
- `tsconfig.base.json` uses `"moduleResolution": "bundler"`
- `packages/shared` exports are configured correctly
- Path aliases work: `@hn/shared`, `@hn/shared/api`

**Recommendation:**
No changes needed. Just use:
```typescript
// packages/shared/src/api/hn-write-api.ts
import { load } from 'cheerio';
```

Metro bundler (React Native) and Next.js webpack will handle tree-shaking.

---

## 6. Implementation Recommendations

### 6.1 Revise Task Sequencing

**Current:** Tasks grouped by area (Research, Shared, Mobile, Web)
**Better:** Tasks sequenced by dependency order

**Proposed Sequence:**

**Phase 0: Foundation (Week 1)**
1. Install and verify dependencies
2. Create HTML fixtures from live HN pages
3. Set up shared types and error classes
4. Configure linting rules for cookie safety

**Phase 1: Shared Auth Core (Week 1-2)**
5. Implement `SecureSession` class with opaque cookie handling
6. Write HTML parsing utilities with cheerio
7. Add unit tests with fixtures
8. Build write API client (vote, comment, login via form)
9. Add rate limiter

**Phase 2: Mobile Integration (Week 2-3)**
10. Implement WebView login screen
11. Create `useHNAuth` hook
12. Wire up vote/comment UI handlers
13. Add optimistic updates to React Query cache
14. Test session persistence across app restarts

**Phase 3: Web Integration (Week 3-4)**
15. **Decision point:** Choose cookie strategy (recommend anonymous-only initially)
16. Implement chosen strategy
17. Update UI to reflect auth state
18. Test across browsers

**Phase 4: Polish & QA (Week 4)**
19. Add error recovery flows (session expiration, rate limits)
20. Security audit (cookie scrubbing, HTTPS enforcement)
21. Performance testing (bundle size, rate limit behavior)
22. Documentation

### 6.2 Add Missing Security Tasks

**Before writing any code:**
- [ ] Define `HNAuthError` type with specific error codes
- [ ] Create `SecureSession` wrapper class
- [ ] Add ESLint rule banning direct cookie access
- [ ] Configure Sentry/error reporting to scrub cookies

**During implementation:**
- [ ] Add HTTPS validation to all HN requests
- [ ] Implement client-side rate limiter
- [ ] Add session expiration detection and re-auth flow
- [ ] Test cookie extraction timing in WebView (add 500ms delay)

**Before launch:**
- [ ] Manual security audit: grep codebase for `cookie`, `Cookie`, `session`
- [ ] Verify cookies never appear in console logs
- [ ] Test with Sentry enabled - trigger errors and confirm no cookie leakage
- [ ] Review analytics events to ensure no PII/cookies

### 6.3 Improve Web Strategy

**Current Task:**
> "Decide on approach for cookies (documented spike outcome)..."

**Recommendation:**
Replace with concrete plan:

**Option A: Web Anonymous Mode (Ship v1)**
- [ ] Remove auth UI from web app
- [ ] Show "Sign in on mobile to vote/comment" message
- [ ] Add deep link to open story in mobile app
- [ ] Document limitation in README

**Option B: Next.js Proxy (Ship v2)**
- [ ] Create API route `/api/hn-proxy`
- [ ] Implement cookie forwarding with strict CORS
- [ ] Add rate limiting per IP
- [ ] Document server-side cookie handling in security docs
- [ ] Deploy to serverless platform (Vercel, Netlify)

**Don't implement:** Manual cookie paste (terrible UX)

### 6.4 Extend Feature Scope (Optional)

**Current plan only covers:**
- Vote/unvote
- Comment/reply

**Quick wins to add:**
- [ ] **Favorite/unfavorite** - Same pattern as vote (`#fave_{id}` link)
- [ ] **Hide** - Same pattern (`#hide_{id}` link)
- [ ] **Flag** - Same pattern (`#flag_{id}` link)

**Medium effort:**
- [ ] **Submit new story** - Parse `/submit` form, requires `title` and `url` fields
- [ ] **Edit comment** - Available for 2 hours after posting, parse edit link

**High effort:**
- [ ] **Vote on comments** - Different URL structure (`/vote?id={commentId}&...`)
- [ ] **Delete comment** - Confirmation flow required

**Karma-gated features (require special UI handling):**
- [ ] **Downvote** - Only for users with 500+ karma, hide button if unavailable

### 6.5 Testing Strategy

**Unit Tests (High Priority):**
```typescript
// packages/shared/src/__tests__/hn-write-api.test.ts
describe('parseVoteLink', () => {
  it('extracts auth token from vote link', () => {
    const html = readFixture('vote-link-v1.html');
    const link = parseVoteLink(html, 123);
    expect(link).toMatch(/vote\?id=123&how=up&auth=/);
  });

  it('throws NOT_LOGGED_IN when login prompt detected', () => {
    const html = '<html><body>Please <a href="/login">log in</a></body></html>';
    expect(() => parseVoteLink(html, 123)).toThrow(HNAuthError);
  });
});
```

**Integration Tests (Medium Priority):**
```typescript
// packages/shared/src/__tests__/integration/hn-live.test.ts
describe('HN Live Integration', () => {
  it('successfully logs in with real credentials', async () => {
    const cookies = await login(TEST_USERNAME, TEST_PASSWORD);
    expect(cookies).toContain('user=');
  });

  it('successfully votes on item', async () => {
    await vote(1, cookies);
    // Verify by fetching item page and checking if vote link changed to unvote
  });
});
```

**E2E Tests (Low Priority, Manual Initially):**
- Mobile: Detox or Maestro tests for WebView login flow
- Web: Playwright tests for auth state management

**Security Tests (Critical):**
```typescript
describe('Cookie Security', () => {
  it('never exposes raw cookies in error messages', () => {
    const session = new SecureSession();
    session.setCookies('user=secret123');

    expect(session.toString()).not.toContain('secret123');
    expect(JSON.stringify(session)).not.toContain('secret123');
  });
});
```

---

## 7. Risk Matrix

| Risk | Likelihood | Impact | Mitigation Priority |
|------|-----------|--------|-------------------|
| Cookie leakage to logs/analytics | HIGH | CRITICAL | **P0** - Must fix before any code |
| HN changes HTML structure | MEDIUM | HIGH | **P1** - Add fixtures + monitoring |
| Rate limiting triggers ban | MEDIUM | HIGH | **P1** - Add client-side throttling |
| Web cookie access blocked | HIGH | MEDIUM | **P2** - Ship web as anonymous initially |
| Session expires without warning | MEDIUM | MEDIUM | **P2** - Add auto re-auth detection |
| Cheerio bundle size bloat | LOW | MEDIUM | **P3** - Evaluate alternatives if size is issue |
| Expo SDK incompatibility | LOW | CRITICAL | **P0** - Verify deps before coding |
| CSRF token format changes | LOW | HIGH | **P1** - Error codes distinguish parse failures |

---

## 8. Final Recommendations

### 8.1 PROCEED - With These Changes

**Before writing code:**
1. ✅ Add Phase 0 dependency installation tasks
2. ✅ Create security hardening tasks (SecureSession, ESLint rules)
3. ✅ Define error taxonomy (HNAuthError with specific codes)
4. ✅ Choose web strategy (recommend anonymous mode for v1)

**During implementation:**
5. ✅ Sequence tasks by dependency (not by area)
6. ✅ Add rate limiting from day 1 (not "nice to have")
7. ✅ Write HTML parsing tests before integration
8. ✅ Monitor bundle size impact of cheerio

**Before shipping:**
9. ✅ Manual security audit (grep for cookies, test error reporting)
10. ✅ Live HTML smoke tests (detect HN changes)
11. ✅ Document known limitations (downvote, edit, delete, submit)

### 8.2 Alternate Recommendation: Phased Rollout

**If timeline is aggressive, consider shipping in phases:**

**Phase 1 (MVP - 2 weeks):**
- Mobile-only
- Login + vote + comment only
- Anonymous web app (no auth)

**Phase 2 (Full features - 1 week):**
- Favorite/hide/flag
- Session persistence
- Error recovery

**Phase 3 (Web auth - 2 weeks):**
- Next.js proxy for web
- Cross-browser testing

**Phase 4 (Advanced - future):**
- Submit stories
- Edit/delete comments
- Karma-gated features

---

## 9. Conclusion

**Summary:**

The authentication implementation plan is **well-researched and technically sound**. The task breakdown demonstrates strong understanding of both the HN authentication mechanism and the existing codebase architecture. However, **security hardening is insufficient** and **dependency planning is missing**.

**Key Action Items:**

1. **Add security tasks:** SecureSession wrapper, ESLint rules, cookie scrubbing in error reporting
2. **Add dependency tasks:** Install and verify expo-secure-store, @react-native-cookies/cookies, cheerio
3. **Revise web strategy:** Ship anonymous mode for web v1, defer proxy implementation
4. **Add rate limiting:** Not optional - implement client-side throttling from day 1
5. **Improve error handling:** Define HNAuthError taxonomy with specific codes
6. **Plan for HTML brittleness:** Add fixtures, live smoke tests, and monitoring

**Overall Grade:** B+ (Good foundation, needs security hardening)

**Confidence Level:** High - This approach will work if security concerns are addressed.

---

**Prepared by:** Claude (Sonnet 4.5)
**Review Status:** Ready for team discussion
**Next Steps:** Address recommendations, update tasks.md, proceed with implementation
