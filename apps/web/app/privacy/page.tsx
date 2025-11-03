import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy - Hacker Reader",
  description:
    "Privacy policy for Hacker Reader iOS app. Learn about our data collection practices, third-party services, and your privacy rights.",
  openGraph: {
    title: "Privacy Policy - Hacker Reader",
    description:
      "Privacy policy for Hacker Reader iOS app. Learn about our data collection practices, third-party services, and your privacy rights.",
    type: "website",
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] text-[#1a1410] dark:text-[#f5f5f5]">
      <main className="max-w-4xl mx-auto px-6 py-16 sm:px-8 sm:py-24">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-[#665c4f] dark:text-[#a8a8a8] hover:text-[#ff6600] dark:hover:text-[#ff8c43] transition mb-6"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Home
          </Link>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            Privacy Policy
          </h1>
          <p className="text-lg text-[#665c4f] dark:text-[#a8a8a8]">
            Last Updated: January 2, 2025
          </p>
        </div>

        {/* Privacy Content */}
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <section className="mb-12">
            <h2 className="text-3xl font-semibold mb-4">Overview</h2>
            <p className="text-[#5d5146] dark:text-[#c4c4c4] leading-relaxed">
              Hacker Reader (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;the app&rdquo;) is a third-party iOS
              client for Hacker News. We are committed to protecting your
              privacy and being transparent about our data practices.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-semibold mb-6">Privacy Principles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 rounded-xl border border-[#e5ddd0] dark:border-[#333333] bg-[#fefaf4] dark:bg-[#0c0c0c]">
                <h3 className="font-semibold mb-2 text-[#1a1410] dark:text-[#f0f0f0]">
                  No Account Required
                </h3>
                <p className="text-sm text-[#665c4f] dark:text-[#a8a8a8]">
                  Browse all content without creating an account
                </p>
              </div>
              <div className="p-6 rounded-xl border border-[#e5ddd0] dark:border-[#333333] bg-[#fefaf4] dark:bg-[#0c0c0c]">
                <h3 className="font-semibold mb-2 text-[#1a1410] dark:text-[#f0f0f0]">
                  No Tracking
                </h3>
                <p className="text-sm text-[#665c4f] dark:text-[#a8a8a8]">
                  We don&apos;t track you across apps or websites
                </p>
              </div>
              <div className="p-6 rounded-xl border border-[#e5ddd0] dark:border-[#333333] bg-[#fefaf4] dark:bg-[#0c0c0c]">
                <h3 className="font-semibold mb-2 text-[#1a1410] dark:text-[#f0f0f0]">
                  No Data Sale
                </h3>
                <p className="text-sm text-[#665c4f] dark:text-[#a8a8a8]">
                  We never sell your data to third parties
                </p>
              </div>
              <div className="p-6 rounded-xl border border-[#e5ddd0] dark:border-[#333333] bg-[#fefaf4] dark:bg-[#0c0c0c]">
                <h3 className="font-semibold mb-2 text-[#1a1410] dark:text-[#f0f0f0]">
                  Open Source
                </h3>
                <p className="text-sm text-[#665c4f] dark:text-[#a8a8a8]">
                  Our code is public for complete transparency
                </p>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-semibold mb-4">
              Data We Collect (Minimal & Anonymous)
            </h2>

            <div className="mb-8 p-6 rounded-xl border border-[#ead9c9] dark:border-[#2a2a2a] bg-[#fff4e9] dark:bg-[#0f0f0f]">
              <h3 className="text-xl font-semibold mb-3 text-[#1a1410] dark:text-[#f0f0f0]">
                Crash Reports (via Sentry)
              </h3>
              <ul className="space-y-2 text-[#5d5146] dark:text-[#c4c4c4]">
                <li>• Stack traces, device model, iOS version</li>
                <li>• Used to fix bugs and improve stability</li>
                <li>• Not linked to your identity</li>
                <li>• Retained for 90 days</li>
              </ul>
            </div>

            <div className="mb-8 p-6 rounded-xl border border-[#ead9c9] dark:border-[#2a2a2a] bg-[#fff4e9] dark:bg-[#0f0f0f]">
              <h3 className="text-xl font-semibold mb-3 text-[#1a1410] dark:text-[#f0f0f0]">
                Analytics (via PostHog)
              </h3>
              <ul className="space-y-2 text-[#5d5146] dark:text-[#c4c4c4]">
                <li>• Anonymous feature usage events</li>
                <li>• Not linked to your identity</li>
                <li>• Used to improve the app</li>
                <li>• Retained for 90 days</li>
              </ul>
              <p className="mt-4 text-sm text-[#665c4f] dark:text-[#a8a8a8] italic">
                Note: We track authentication status (logged in: true/false) to
                understand behavior differences, but we NEVER link your Hacker
                News username to analytics events.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-semibold mb-4">
              Data We Don&apos;t Collect
            </h2>
            <div className="bg-[#f5f0e8] dark:bg-[#0a0a0a] rounded-xl p-8">
              <p className="text-[#5d5146] dark:text-[#c4c4c4] mb-4">
                We do <strong>NOT</strong> collect:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-[#5d5146] dark:text-[#c4c4c4]">
                <ul className="space-y-1">
                  <li>• Personal information (name, email, phone)</li>
                  <li>• Location data</li>
                  <li>• Browsing history or stories you read</li>
                  <li>• Search queries</li>
                  <li>• Device identifiers (IDFA)</li>
                </ul>
                <ul className="space-y-1">
                  <li>• Your Hacker News username or password</li>
                  <li>• Comments or votes you make</li>
                  <li>• Contact list</li>
                  <li>• Health or fitness data</li>
                  <li>• Financial information</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-semibold mb-4">Data Storage</h2>
            <div className="space-y-4 text-[#5d5146] dark:text-[#c4c4c4]">
              <div>
                <h3 className="font-semibold mb-2 text-[#1a1410] dark:text-[#f0f0f0]">
                  On Your Device (Never Leaves)
                </h3>
                <ul className="space-y-1 ml-4">
                  <li>• Login cookies: iOS Keychain (hardware-encrypted)</li>
                  <li>• Bookmarks: Local AsyncStorage</li>
                  <li>• Cache: Local storage</li>
                  <li>• Settings preferences: Local UserDefaults</li>
                </ul>
                <p className="mt-2 italic text-sm text-[#665c4f] dark:text-[#a8a8a8]">
                  None of this data leaves your device.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-[#1a1410] dark:text-[#f0f0f0]">
                  On Third-Party Servers
                </h3>
                <ul className="space-y-1 ml-4">
                  <li>
                    • Crash reports: Sentry (anonymized, 90-day retention)
                  </li>
                  <li>
                    • Analytics events: PostHog (anonymized, 90-day retention)
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-semibold mb-4">
              Third-Party Services
            </h2>

            <div className="space-y-6">
              <div className="p-6 rounded-xl border border-[#e5ddd0] dark:border-[#333333]">
                <h3 className="text-xl font-semibold mb-2 text-[#1a1410] dark:text-[#f0f0f0]">
                  Sentry (Crash Reporting)
                </h3>
                <p className="text-[#5d5146] dark:text-[#c4c4c4] mb-3">
                  We use Sentry to monitor app crashes and errors. This helps us
                  identify and fix bugs quickly.
                </p>
                <a
                  href="https://sentry.io/privacy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#ff6600] hover:text-[#ff7a1a] dark:text-[#ff8c43] dark:hover:text-[#ffa366] text-sm"
                >
                  Sentry Privacy Policy →
                </a>
              </div>

              <div className="p-6 rounded-xl border border-[#e5ddd0] dark:border-[#333333]">
                <h3 className="text-xl font-semibold mb-2 text-[#1a1410] dark:text-[#f0f0f0]">
                  PostHog (Analytics)
                </h3>
                <p className="text-[#5d5146] dark:text-[#c4c4c4] mb-3">
                  We use PostHog to understand feature usage and improve the
                  app. All analytics are fully anonymous.
                </p>
                <a
                  href="https://posthog.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#ff6600] hover:text-[#ff7a1a] dark:text-[#ff8c43] dark:hover:text-[#ffa366] text-sm"
                >
                  PostHog Privacy Policy →
                </a>
              </div>

              <p className="text-sm text-[#665c4f] dark:text-[#a8a8a8] italic">
                Both services are GDPR compliant and SOC 2 certified.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-semibold mb-4">Your Rights</h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2 text-[#1a1410] dark:text-[#f0f0f0]">
                  GDPR Rights (EU Users)
                </h3>
                <p className="text-[#5d5146] dark:text-[#c4c4c4] mb-3">
                  Even though we collect minimal data, you have these rights:
                </p>
                <ul className="space-y-1 text-[#5d5146] dark:text-[#c4c4c4] ml-4">
                  <li>
                    • <strong>Right to Access</strong>: Request what data we
                    have (essentially none linked to you)
                  </li>
                  <li>
                    • <strong>Right to Deletion</strong>: Request deletion
                    (clear app data, uninstall app)
                  </li>
                  <li>
                    • <strong>Right to Portability</strong>: Export your data
                    (local bookmarks only)
                  </li>
                  <li>
                    • <strong>Right to Object</strong>: Opt out of analytics
                    (toggle coming in v1.1)
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2 text-[#1a1410] dark:text-[#f0f0f0]">
                  CCPA Rights (California Users)
                </h3>
                <ul className="space-y-1 text-[#5d5146] dark:text-[#c4c4c4] ml-4">
                  <li>
                    • <strong>Right to Know</strong>: What data is collected
                    (see above)
                  </li>
                  <li>
                    • <strong>Right to Delete</strong>: Delete your data
                    (uninstall app)
                  </li>
                  <li>
                    • <strong>Right to Opt-Out</strong>: Opt out of data sale
                    (we don&apos;t sell data)
                  </li>
                </ul>
                <p className="mt-3 font-semibold text-[#5d5146] dark:text-[#c4c4c4]">
                  We do not sell your personal information.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-semibold mb-4">
              Children&apos;s Privacy (COPPA)
            </h2>
            <p className="text-[#5d5146] dark:text-[#c4c4c4] mb-3">
              Hacker Reader is{" "}
              <strong>not directed at children under 13</strong>.
            </p>
            <ul className="space-y-1 text-[#5d5146] dark:text-[#c4c4c4] ml-4">
              <li>• No content specifically for children</li>
              <li>• No data knowingly collected from children under 13</li>
              <li>
                • If we learn a child under 13 has provided information, we&apos;ll
                delete it
              </li>
            </ul>
            <p className="mt-3 text-sm text-[#665c4f] dark:text-[#a8a8a8]">
              <strong>Age Rating</strong>: 12+ (due to user-generated content in
              HN comments)
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-semibold mb-4">
              Changes to Privacy Policy
            </h2>
            <p className="text-[#5d5146] dark:text-[#c4c4c4]">
              If our data collection practices change:
            </p>
            <ol className="space-y-1 text-[#5d5146] dark:text-[#c4c4c4] ml-4 mt-3">
              <li>1. This document will be updated</li>
              <li>2. App Store listing will be updated</li>
              <li>3. Users will be notified via app update notes</li>
              <li>4. In-app notification if significant changes</li>
            </ol>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-semibold mb-4">Contact</h2>
            <p className="text-[#5d5146] dark:text-[#c4c4c4] mb-4">
              Questions about this privacy policy or your data?
            </p>
            <div className="p-6 rounded-xl bg-[#f5f0e8] dark:bg-[#0a0a0a] border border-[#e5ddd0] dark:border-[#333333]">
              <p className="text-[#5d5146] dark:text-[#c4c4c4]">
                <strong>Email</strong>:{" "}
                <a
                  href="mailto:privacy@hackerreader.app"
                  className="text-[#ff6600] hover:text-[#ff7a1a] dark:text-[#ff8c43] dark:hover:text-[#ffa366]"
                >
                  privacy@hackerreader.app
                </a>
              </p>
              <p className="text-sm text-[#665c4f] dark:text-[#a8a8a8] mt-2">
                We&apos;ll respond within 30 days
              </p>
            </div>
          </section>

          <section className="pt-8 border-t border-[#e5ddd0] dark:border-[#333333]">
            <p className="text-sm text-[#8f806d] dark:text-[#7a7a7a] text-center">
              Not affiliated with Y Combinator or Hacker News
            </p>
            <p className="text-sm text-[#8f806d] dark:text-[#7a7a7a] text-center mt-2">
              Built by{" "}
              <a
                href="https://dcsp.dev/en"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#5d5146] dark:text-[#b3b3b3] hover:text-[#ff6600] dark:hover:text-[#ff8c43] font-medium"
              >
                Daniel Paiva
              </a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
