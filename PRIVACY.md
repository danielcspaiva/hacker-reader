# Privacy Policy

**Last Updated**: September 30, 2026

## TL;DR - Privacy-First Approach

Hacker Reader is designed with privacy as a core principle:

- ✅ **No account required** to browse content
- ✅ **No tracking** across apps or websites
- ✅ **No data sale** to third parties
- ✅ **Fully anonymous analytics** - even if you log in
- ✅ **Open source** for complete transparency

## Quick Summary

### What We Collect (Minimal & Anonymous)

- **Crash reports** (via Sentry) - Not linked to you
- **Anonymous analytics** (via PostHog) - Not linked to you

### What We DON'T Collect

- ❌ Personal information (name, email, phone)
- ❌ Location data
- ❌ Browsing history or stories you read
- ❌ Your Hacker News username or password
- ❌ Device identifiers (IDFA)
- ❌ Search queries

## Hacker Reader Pro (Optional)

Pro is an optional subscription for features that need a server. Everything that runs on your phone stays free and never contacts our server. The app does check your purchase status with RevenueCat using a random install ID, whether or not you subscribe.

- **Random install ID**: generated on your device, kept in the iOS Keychain, not linked to your name, email or Hacker News account. There is no Pro account.
- **Purchase status**: handled by Apple and RevenueCat, which receive the install ID to tell us whether your subscription is active. We never see payment details.
- **Device details**: platform, app version and time zone, sent with the install ID while Pro is active.
- **Only for features that need it**: your push notification token, and the Hacker News username you choose to share for reply notifications.
- **Reply notifications**: only when you switch them on. Your username and push token are sent to our server, which reads your public submissions from the Hacker News API every few minutes and sends a push when someone replies. It keeps one number per username (the newest reply it has seen, refreshed on every check and dropped about 3 days after you stop) so it does not notify twice. Turning the switch off, signing out of Hacker News or using **Delete Pro Data** removes the username from our server. The free Replies inbox in your profile runs entirely on your phone and never contacts our server.
- **AI summaries**: when you ask for one, the story ID is sent to our server, which fetches the story's public Hacker News comments and its article and sends that public text to Anthropic to write the summary. No personal data is involved (no usernames are sent). Summaries are cached on our server for up to 7 days and shared between Pro users.
- **Keyword alerts**: the keywords, sites and minimum points you add are stored on our server only while Pro is active, to send the pushes. Our server checks recent public Hacker News stories every few minutes against them, and keeps a short list of story ids it already sent you (dropped after about 3 days). Removing an alert, or **Delete Pro Data**, deletes it from our server. The list itself also lives on your phone.
- **Nothing is sold.** Delete it any time with **Delete Pro Data** in Settings (or by email); otherwise it expires on its own about 45 days after the app last registered (Pro users register on every launch), so it is gone well after a subscription lapses.

## Full Privacy Policy

For the complete privacy policy, please visit:

**🔗 https://hackerreader.app/privacy**

The full policy includes detailed information about:

- Data collection practices
- Third-party services (Sentry, PostHog, RevenueCat)
- Data storage and security
- Your rights (GDPR, CCPA)
- Children's privacy (COPPA)
- Contact information

## Data Storage

### On Your Device (Never Leaves)

- **Login cookies**: iOS Keychain (hardware-encrypted)
- **Bookmarks**: Local AsyncStorage (also synced to your own iCloud, see below)
- **Cache**: Local storage
- **Settings**: Local UserDefaults

**None of this data leaves your device.**

### In Your Own iCloud (Optional)

If you are signed in to iCloud, bookmarks, read history (the 500 most recent stories), muted keywords and sites, blocked users and hidden stories sync between your devices through your iCloud key-value storage. This data goes to your own iCloud account, handled by Apple. It is never sent to Hacker Reader's servers, and we cannot see it. Turn it off with **iCloud Sync** in Settings, Data.

### On Third-Party Servers

- **Crash reports**: Sentry (anonymized, 90-day retention)
- **Analytics events**: PostHog (anonymized, 90-day retention)
- **Pro (only if you subscribe)**: RevenueCat (purchase status) and our API on Vercel/Upstash Redis (install ID, device details, optional push token and HN username, cached story summaries); story text for summaries goes to Anthropic

## Anonymous Analytics Explained

Even when you log in with your Hacker News account, we **NEVER** link analytics to your username. Instead:

- We use a random anonymous ID for all analytics
- We track authentication status as a boolean flag (logged in: true/false)
- We cannot identify who you are in our analytics data
- We don't track which stories you read or comments you view

This allows us to understand how logged-in users behave differently without compromising your privacy.

## Your Rights

You have the right to:

- **Access** your data (essentially none linked to you)
- **Delete** your data (uninstall app; Pro data: Settings > Delete Pro Data)
- **Opt-out** of analytics (toggle coming in v1.1)
- **Export** your data (local bookmarks only)

## Contact

Questions about privacy?

- **Email**: privacy@hackerreader.app
- **Response time**: Within 30 days

## Open Source Transparency

This project is fully open source. You can:

- Review the code on [GitHub](https://github.com/danielcspaiva/hacker-reader)
- Audit our data collection practices
- Submit privacy-related issues or pull requests
- Fork the project and host your own version

## Compliance

- ✅ GDPR compliant (EU)
- ✅ CCPA compliant (California)
- ✅ COPPA compliant (Children's privacy)
- ✅ App Store privacy requirements

## Third-Party Services

### Sentry (Crash Reporting)

- **Purpose**: Monitor crashes and errors
- **Privacy Policy**: https://sentry.io/privacy/
- **Compliance**: GDPR, SOC 2 certified
- **Data captured**: Stack traces, device model, OS version, and Sentry's default PII (IP address, locale) in production builds to help debug issues.
- **How to disable for self-hosted builds**: Leave `EXPO_PUBLIC_SENTRY_DSN` and `SENTRY_AUTH_TOKEN` unset (or remove them from `.env`) before building; the app skips initializing Sentry when those values are absent.

### PostHog (Analytics)

- **Purpose**: Understand feature usage
- **Privacy Policy**: https://posthog.com/privacy
- **Compliance**: GDPR compliant
- **Data captured**: Anonymous usage events (screen views, taps) with generated device identifiers; no raw Hacker News credentials are transmitted.
- **How to disable for self-hosted builds**: Do not supply `EXPO_PUBLIC_POSTHOG_API_KEY` or `EXPO_PUBLIC_POSTHOG_HOST`. The open-source app automatically skips PostHog when these variables are missing.

---

**Not affiliated with Y Combinator or Hacker News**

Built by [Daniel Paiva](https://dcsp.dev/en)
