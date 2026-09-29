import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { AppStoreBadge } from "./(components)/app-store-badge";
import { HeroIcon } from "./(components)/hero-icon";
import { Phone } from "./(components)/phone";
import { ThemeToggle } from "./(components)/theme-toggle";

const REPO_URL = "https://github.com/danielcspaiva/hacker-reader";

// The 1.4 App Store screenshots, in store order; alt text is their caption.
const TOUR = [
  {
    src: "store-feed",
    alt: "A calm, native HN reader. Top, New, Ask, Show and Jobs, with thumbnails and site icons.",
  },
  {
    src: "store-story",
    alt: "Every story, typeset. Serif headlines and big link previews, upvote with your HN account.",
  },
  {
    src: "store-comments",
    alt: "Threads you can follow. Quiet orange rails and collapsible threads.",
  },
  {
    src: "store-widgets",
    alt: "Top stories, at a glance. Home and Lock Screen widgets that refresh themselves.",
  },
  {
    src: "store-dark",
    alt: "A warmer Dark Mode. Warm charcoal, never pure black, follows your system.",
  },
  {
    src: "store-search",
    alt: "Years of HN, searchable. Search stories by keyword, including the all-time classics.",
  },
  {
    src: "store-bookmarks",
    alt: "Stories saved for later. Bookmark any story, no account needed.",
  },
];

const FEATURES: { title: string; body: string; icon: ReactNode }[] = [
  {
    title: "Five feeds",
    body: "Top, New, Ask, Show and Jobs. Numbered cards with the site's icon, a thumbnail when the page has one, points and comments.",
    icon: <path d="M4 6h16M4 12h16M4 18h10" />,
  },
  {
    title: "Stories, typeset",
    body: "Story pages open with a serif headline, a large link preview and the byline. Tap the points to upvote.",
    icon: <path d="M6 4h12M9 4v16m6-16v16M6 20h12" />,
  },
  {
    title: "Threads you can follow",
    body: "Nested comments with quiet orange depth rails. Tap a comment's header to collapse its replies.",
    icon: <path d="M5 5v14m0-9h6a3 3 0 0 1 3 3v6m0-6h5" />,
  },
  {
    title: "Home and Lock Screen widgets",
    body: "Small, Medium, Large and Lock Screen widgets that refresh themselves when stories go stale, even with the app closed.",
    icon: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
  },
  {
    title: "Search and bookmarks",
    body: "Search Hacker News stories by keyword, and save any story for later. No account needed for either.",
    icon: (
      <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15zm5.3-2.2L21 21" />
    ),
  },
  {
    title: "Your HN account",
    body: "Sign in with a native form to upvote, comment and reply. Your password goes straight to Hacker News and is never stored.",
    icon: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 8a7 7 0 0 1 14 0" />,
  },
];

const WHATS_NEW = [
  "A complete redesign: warm paper in Light Mode, warm charcoal in Dark Mode",
  "Numbered story cards with square thumbnails and site icons",
  "Serif story pages with large link previews",
  "Comment threads with orange depth rails, much faster on 1,000+ comment stories",
  "Rebuilt Home Screen widgets and a new Lock Screen widget",
  "A launch screen that matches Light and Dark Mode",
];

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink">
          {eyebrow}
        </p>
        <h2 className="mt-3 max-w-2xl text-balance font-serif text-4xl font-semibold leading-tight sm:text-5xl">
          {title}
        </h2>
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-separator bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 sm:px-10">
          <Link href="/" className="flex items-center gap-3 font-semibold">
            <span className="relative h-8 w-8 overflow-hidden rounded-[9px]">
              <Image src="/icon.png" alt="" fill sizes="32px" />
            </span>
            Hacker Reader
          </Link>
          <nav className="flex items-center gap-1 text-sm text-muted-foreground sm:gap-2">
            <a
              className="hidden rounded-full px-3 py-2 hover:text-foreground sm:block"
              href="#tour"
            >
              Tour
            </a>
            <a
              className="hidden rounded-full px-3 py-2 hover:text-foreground sm:block"
              href="#features"
            >
              Features
            </a>
            <a
              className="hidden rounded-full px-3 py-2 hover:text-foreground sm:block"
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_75%_45%,var(--primary-wash),transparent_70%)]"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-6 pb-20 pt-16 sm:px-10 lg:grid-cols-[1.05fr_1fr] lg:pb-28 lg:pt-24">
            <div className="space-y-8">
              <HeroIcon />
              <p className="inline-flex rounded-full bg-wash px-4 py-1.5 text-sm font-semibold text-ink">
                Free, no ads, open source
              </p>
              <h1 className="text-balance font-serif text-5xl font-semibold leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl">
                Hacker News, like it deserves.
              </h1>
              <p className="max-w-xl text-xl leading-relaxed text-muted-foreground">
                A calm, native Hacker News reader for iPhone. Warm paper by
                default, warm charcoal at night, serif story pages and widgets
                that keep the front page on your Home Screen.
              </p>
              <div className="flex flex-wrap items-center gap-5">
                <AppStoreBadge />
                <a
                  href={REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-ink hover:underline"
                >
                  Free and open source
                </a>
              </div>
            </div>

            <div className="relative mx-auto flex w-full max-w-[460px] justify-center">
              <Phone
                src="/screenshots/v1.4/walk-dark.webp"
                alt="A story page and its comments in Dark Mode"
                rim="bronze"
                className="absolute left-0 top-12 hidden w-[58%] -rotate-6 sm:block"
                sizes="(min-width: 1024px) 270px, 45vw"
              />
              <Phone
                src="/screenshots/v1.4/feed-light.webp"
                alt="The Top stories feed in Light Mode"
                priority
                className="relative w-[70%] sm:ml-auto sm:w-[62%] sm:rotate-3"
                sizes="(min-width: 1024px) 290px, 70vw"
              />
            </div>
          </div>
        </section>

        {/* Tour */}
        <section id="tour" className="bg-card py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-6 sm:px-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink">
              Tour
            </p>
            <h2 className="mt-3 max-w-2xl text-balance font-serif text-4xl font-semibold leading-tight sm:text-5xl">
              Take a look around.
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              The front page, story pages, comment threads, search, bookmarks
              and widgets, in Light and Dark Mode.
            </p>
          </div>
          <div className="no-scrollbar mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-4 sm:px-10 lg:px-[max(2.5rem,calc((100vw-72rem)/2+2.5rem))]">
            {TOUR.map((shot) => (
              <div
                key={shot.src}
                className="relative aspect-[1320/2868] w-[240px] shrink-0 snap-start overflow-hidden rounded-[20px] sm:w-[280px]"
              >
                <Image
                  src={`/screenshots/v1.4/${shot.src}.webp`}
                  alt={shot.alt}
                  fill
                  sizes="280px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <Section
          id="features"
          eyebrow="Features"
          title="Everything you open Hacker News for."
        >
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="rounded-card bg-card p-7">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-wash text-ink">
                  <svg
                    aria-hidden
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                  >
                    {feature.icon}
                  </svg>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">
                  {feature.body}
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* What's new */}
        <section id="whats-new" className="bg-card py-20 sm:py-28">
          <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 sm:px-10 lg:grid-cols-[1fr_0.8fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink">
                What&apos;s new in 1.4
              </p>
              <h2 className="mt-3 text-balance font-serif text-4xl font-semibold leading-tight sm:text-5xl">
                Freshly redesigned.
              </h2>
              <ul className="mt-10 space-y-4">
                {WHATS_NEW.map((item) => (
                  <li key={item} className="flex gap-3 text-lg">
                    <span
                      aria-hidden
                      className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                    />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mx-auto flex w-full max-w-[360px] items-start gap-4">
              <Phone
                src="/screenshots/v1.4/story-light.webp"
                alt="A story page in Light Mode"
                className="w-1/2"
                sizes="180px"
              />
              <Phone
                src="/screenshots/v1.4/bookmarks-dark.webp"
                alt="Bookmarked stories in Dark Mode"
                rim="bronze"
                className="mt-12 w-1/2"
                sizes="180px"
              />
            </div>
          </div>
        </section>

        {/* Open source */}
        <Section eyebrow="Open source" title="Built in the open.">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-start">
            <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Hacker Reader is an indie app, and all of its code is on GitHub:
              React Native and Expo for the app, SwiftUI for the widgets. Read
              it, file an issue or send a pull request.
            </p>
            <div className="flex flex-wrap gap-2 text-sm">
              {[
                "React Native",
                "Expo",
                "Expo Router",
                "TypeScript",
                "TanStack Query",
                "FlashList",
                "SwiftUI widgets",
              ].map((tech) => (
                <span
                  key={tech}
                  className="rounded-full bg-muted px-4 py-2 text-muted-foreground"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition hover:opacity-85"
          >
            View on GitHub <span aria-hidden>→</span>
          </a>
        </Section>

        {/* CTA */}
        <section className="pb-24 sm:pb-32">
          <div className="mx-auto max-w-6xl px-6 sm:px-10">
            <div className="flex flex-col items-center rounded-card bg-card px-6 py-16 text-center sm:py-20">
              <HeroIcon />
              <h2 className="mt-8 text-balance font-serif text-4xl font-semibold sm:text-5xl">
                Read Hacker News the calm way.
              </h2>
              <p className="mt-4 max-w-xl text-lg text-muted-foreground">
                Free on the App Store for iPhone and iPad.
              </p>
              <div className="mt-8">
                <AppStoreBadge />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-separator py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <p>
            Built by{" "}
            <a
              href="https://dcsp.dev/en"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:text-ink"
            >
              Daniel Paiva
            </a>
            . Not affiliated with Y Combinator or Hacker News.
          </p>
          <div className="flex flex-wrap gap-5">
            <Link className="hover:text-ink" href="/privacy">
              Privacy Policy
            </Link>
            <a
              className="hover:text-ink"
              href="https://github.com/danielcspaiva/hacker-reader/issues"
              target="_blank"
              rel="noopener noreferrer"
            >
              Support
            </a>
            <a
              className="hover:text-ink"
              href="https://github.com/HackerNews/API"
              target="_blank"
              rel="noopener noreferrer"
            >
              HN API
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
