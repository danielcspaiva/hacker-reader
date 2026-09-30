import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Privacy Policy - Hacker Reader",
  description:
    "What Hacker Reader collects, what stays on your device, which services are involved, and your privacy rights.",
  openGraph: {
    title: "Privacy Policy - Hacker Reader",
    description:
      "What Hacker Reader collects, what stays on your device, which services are involved, and your privacy rights.",
    type: "website",
  },
};

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-card bg-card p-7 sm:p-8">
      <h2 className="font-serif text-2xl font-semibold">{title}</h2>
      <div className="mt-4 space-y-4 leading-relaxed text-muted-foreground [&_strong]:font-semibold [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}

function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span
            aria-hidden
            className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

const linkClass = "font-medium text-ink hover:underline";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-3xl px-6 py-16 sm:px-8 sm:py-24">
        <Link href="/" className="text-sm text-muted-foreground hover:text-ink">
          ← Back to Hacker Reader
        </Link>
        <h1 className="mt-6 font-serif text-5xl font-semibold tracking-tight">
          Privacy Policy
        </h1>
        <p className="mt-3 text-muted-foreground">
          Last updated: September 30, 2026
        </p>

        <div className="mt-12 space-y-5">
          <Block title="Overview">
            <p>
              Hacker Reader (&ldquo;we&rdquo;, &ldquo;the app&rdquo;) is an
              unofficial iOS client for Hacker News, made by an independent
              developer. This page explains what the app collects, what stays on
              your device and which services are involved. It matches the App
              Privacy section of our App Store listing.
            </p>
            <List
              items={[
                <>
                  <strong>No account required.</strong> You can browse, search
                  and bookmark without signing in.
                </>,
                <>
                  <strong>No tracking.</strong> We don&apos;t track you across
                  other companies&apos; apps or websites, and we don&apos;t use
                  an advertising identifier.
                </>,
                <>
                  <strong>No data sale.</strong> We never sell or rent your
                  data.
                </>,
                <>
                  <strong>Open source.</strong> The{" "}
                  <a
                    className={linkClass}
                    href="https://github.com/danielcspaiva/hacker-reader"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    code is public
                  </a>
                  , so you can check all of this.
                </>,
              ]}
            />
          </Block>

          <Block title="What we collect">
            <p>
              None of the data below is linked to your identity: we never send
              your Hacker News username or password to these services. Each
              install gets a random anonymous ID instead.
            </p>
            <p>
              <strong>Usage analytics (PostHog)</strong>
            </p>
            <List
              items={[
                "Events about how the app is used: app opens, feed switches, stories you open (story ID and title), links you open, and actions such as upvote, bookmark, share, hide and flag (with the story ID)",
                "Searches you run in the app (the search text and the number of results)",
                "Taps captured automatically, whether you are signed in (true or false), theme changes and widget taps",
                "Session replays: recordings of app screens that help us find confusing or broken flows. They can include what was on screen, such as stories and comments",
                "Your approximate location (country or city), derived from your IP address",
              ]}
            />
            <p>
              <strong>Diagnostics (Sentry)</strong>
            </p>
            <List
              items={[
                "Crash reports and errors: stack traces, device model and iOS version",
                "App logs and performance data used to diagnose problems",
                "Your IP address, which comes with each report",
              ]}
            />
            <p>
              We use this data only to understand how the app is used and to fix
              bugs. On the App Store, these appear as Product Interaction,
              Search History, Coarse Location, Crash Data and Other Diagnostic
              Data.
            </p>
          </Block>

          <Block title="Hacker Reader Pro (optional)">
            <p>
              Pro is an optional subscription for features that need a server.
              Everything that runs on your phone stays free and never contacts
              our server. The app does check your purchase status with
              RevenueCat using a random install ID, whether or not you
              subscribe. This is what is involved:
            </p>
            <List
              items={[
                <>
                  <strong>A random install ID</strong> generated on your device
                  and kept in the iOS Keychain. It is not linked to your name,
                  email or Hacker News account, and there is no Pro account.
                </>,
                <>
                  <strong>Purchase status</strong> handled by Apple and{" "}
                  <a
                    className={linkClass}
                    href="https://www.revenuecat.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    RevenueCat
                  </a>
                  , which receive the install ID to tell us whether your
                  subscription is active. We never see your payment details.
                </>,
                <>
                  <strong>Device details</strong> (platform, app version and
                  time zone) sent to our server with the install ID while Pro is
                  active.
                </>,
                <>
                  <strong>Only for features that need it:</strong> your push
                  notification token, and the Hacker News username you choose to
                  share for reply notifications.
                </>,
                <>
                  <strong>AI summaries:</strong> when you ask for one, the story
                  ID is sent to our server, which fetches the story&apos;s
                  public Hacker News comments and its article and sends that
                  public text to{" "}
                  <a
                    className={linkClass}
                    href="https://www.anthropic.com/legal/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Anthropic
                  </a>{" "}
                  to write the summary. No personal data is involved (no
                  usernames are sent). Summaries are cached on our server for up
                  to 7 days and shared between Pro users.
                </>,
              ]}
            />
            <p>
              Nothing is sold or shared for advertising. You can delete this
              data at any time with Delete Pro Data in Settings, or by emailing
              us; otherwise it expires on its own about 45 days after the app
              last registered (Pro users register on every launch), so it is
              gone well after a subscription lapses.
            </p>
          </Block>

          <Block title="What we don't collect">
            <List
              items={[
                "Your name, email address or phone number",
                "Your Hacker News password, which is sent only to Hacker News",
                "Your payment details, which stay with Apple",
                "Precise location",
                "Your contacts, photos, health or financial data",
                "Advertising identifiers (IDFA)",
              ]}
            />
          </Block>

          <Block title="What stays on your device">
            <List
              items={[
                "Your Hacker News session cookie, stored in the iOS Keychain until you sign out",
                "Bookmarks, hidden stories, blocked users, votes, recent searches and settings, stored in the app's local storage",
              ]}
            />
            <p>
              Deleting the app removes all of it. Signing out removes the
              session cookie.
            </p>
          </Block>

          <Block title="Other services the app talks to">
            <List
              items={[
                <>
                  <strong>Hacker News</strong> (news.ycombinator.com and its
                  API) for stories, comments and profiles. When you sign in,
                  your upvotes, comments and flags go directly to Hacker News
                  under{" "}
                  <a
                    className={linkClass}
                    href="https://www.ycombinator.com/legal/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    its own terms and privacy policy
                  </a>
                  .
                </>,
                <>
                  <strong>Algolia&apos;s HN Search API</strong> receives your
                  search text to return results.
                </>,
                <>
                  <strong>Google&apos;s favicon service</strong> receives the
                  domain of each story to show its site icon.
                </>,
                <>
                  <strong>Story websites</strong> are contacted directly to load
                  link previews and when you open an article.
                </>,
                <>
                  <strong>RevenueCat</strong> and our own server, only if you
                  use Hacker Reader Pro (see above).
                </>,
                <>
                  <strong>PostHog</strong> and <strong>Sentry</strong> as
                  described above (see the{" "}
                  <a
                    className={linkClass}
                    href="https://posthog.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    PostHog
                  </a>{" "}
                  and{" "}
                  <a
                    className={linkClass}
                    href="https://sentry.io/privacy/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Sentry
                  </a>{" "}
                  privacy policies).
                </>,
              ]}
            />
            <p>Like any web request, these services can see your IP address.</p>
          </Block>

          <Block title="Your rights">
            <p>
              Depending on where you live (for example under the GDPR or the
              CCPA), you can ask what data we hold about you, ask us to delete
              it, or object to its use. Because the data isn&apos;t linked to
              your identity, send us the details you can (such as roughly when
              you used the app) and we&apos;ll do our best to find and delete
              it. The app doesn&apos;t have an in-app switch to turn analytics
              off yet.
            </p>
          </Block>

          <Block title="Children">
            <p>
              Hacker Reader is rated 13+ on the App Store because it shows
              user-generated content from Hacker News. It isn&apos;t directed at
              children, and we don&apos;t knowingly collect data from children
              under 13. If you believe we have, contact us and we&apos;ll delete
              it.
            </p>
          </Block>

          <Block title="Changes and contact">
            <p>
              When our practices change we update this page, the App Store
              privacy details and the release notes. Questions or requests:{" "}
              <a className={linkClass} href="mailto:privacy@hackerreader.app">
                privacy@hackerreader.app
              </a>
              . We reply within 30 days.
            </p>
          </Block>
        </div>

        <p className="mt-12 text-center text-sm text-muted-foreground">
          Not affiliated with Y Combinator or Hacker News. Built by{" "}
          <a
            className={linkClass}
            href="https://dcsp.dev/en"
            target="_blank"
            rel="noopener noreferrer"
          >
            Daniel Paiva
          </a>
          .
        </p>
      </main>
    </div>
  );
}
