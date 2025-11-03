# Privacy Policy

**Last Updated**: January 2, 2025

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

## Full Privacy Policy

For the complete privacy policy, please visit:

**🔗 https://hackerreader.app/privacy**

The full policy includes detailed information about:
- Data collection practices
- Third-party services (Sentry, PostHog)
- Data storage and security
- Your rights (GDPR, CCPA)
- Children's privacy (COPPA)
- Contact information

## Data Storage

### On Your Device (Never Leaves)
- **Login cookies**: iOS Keychain (hardware-encrypted)
- **Bookmarks**: Local AsyncStorage
- **Cache**: Local storage
- **Settings**: Local UserDefaults

**None of this data leaves your device.**

### On Third-Party Servers
- **Crash reports**: Sentry (anonymized, 90-day retention)
- **Analytics events**: PostHog (anonymized, 90-day retention)

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
- **Delete** your data (uninstall app)
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
