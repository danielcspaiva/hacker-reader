import Image from "next/image";
import Link from "next/link";
import { HeroIcon } from "./(components)/hero-icon";
import { ThemeToggle } from "./(components)/theme-toggle";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-[#1a1410] dark:bg-[#050505] dark:text-[#f5f5f5]">
      <ThemeToggle />
      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#fff4e9] via-white to-white dark:from-[#1a120d] dark:via-[#0d0d0d] dark:to-[#050505]">
          <div
            aria-hidden
            className="absolute -top-24 -left-32 h-72 w-72 rounded-full bg-[#ff6600]/40 blur-3xl dark:bg-[#ff6600]/20"
          />
          <div
            aria-hidden
            className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-[#ffd7b5]/60 blur-3xl dark:bg-[#5a311d]/40"
          />
          <div className="relative mx-auto max-w-7xl px-6 sm:px-10 py-24 md:py-32">
            <div className="grid items-center gap-16 lg:grid-cols-[1.1fr_1fr]">
              <div className="space-y-8">
                <div className="flex flex-col items-start gap-4">
                  <HeroIcon />
                  <span className="text-sm uppercase tracking-[0.35em] text-[#856a58] dark:text-[#b59d8d]">
                    Hacker Reader
                  </span>
                </div>
                <div>
                  <h1 className="text-5xl font-bold leading-[1.05] sm:text-6xl lg:text-7xl">
                    Read Hacker News like it deserves.
                  </h1>
                  <p className="mt-6 text-xl leading-relaxed text-[#5d5146] dark:text-[#c4c4c4] sm:text-2xl">
                    A beautiful, native mobile experience for Hacker News. Browse
                    stories, read comments, and stay up to date with the tech
                    community.
                  </p>
                </div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <a
                    href="#features"
                    className="inline-flex items-center justify-center rounded-2xl bg-[#ff6600] px-8 py-4 text-base font-semibold text-white shadow-lg shadow-[#ff6600]/40 transition hover:-translate-y-0.5 hover:bg-[#ff7a1a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff6600]"
                  >
                    Learn More
                  </a>
                  <div className="text-sm text-[#8a7f6d] dark:text-[#a8a8a8]">
                    Coming soon to iOS & Android
                  </div>
                </div>
              </div>
              <div className="relative">
                <div
                  aria-hidden
                  className="absolute inset-0 -top-10 rounded-[3rem] bg-gradient-to-tr from-[#ff6600]/25 to-transparent blur-3xl"
                />
                <div className="relative mx-auto w-[280px] transition hover:-translate-y-2 sm:w-[320px] lg:w-[360px]">
                  <Image
                    alt="Hacker Reader home feed"
                    className="h-full w-full object-cover object-top dark:hidden"
                    height={2436}
                    priority
                    src="/screenshots/mocked/light-home.png"
                    width={1125}
                  />
                  <Image
                    alt="Hacker Reader home feed"
                    className="hidden h-full w-full object-cover object-top dark:block"
                    height={2436}
                    priority
                    src="/screenshots/mocked/dark-home.png"
                    width={1125}
                  />
                </div>
                <div className="absolute -bottom-10 -right-8 hidden w-[200px] rotate-3 transition hover:-translate-y-3 hover:rotate-6 lg:block">
                  <Image
                    alt="Threaded discussions in Hacker Reader"
                    className="h-full w-full object-cover object-top dark:hidden"
                    height={2436}
                    src="/screenshots/mocked/light-story.png"
                    width={1125}
                  />
                  <Image
                    alt="Threaded discussions in Hacker Reader"
                    className="hidden h-full w-full object-cover object-top dark:block"
                    height={2436}
                    src="/screenshots/mocked/dark-story.png"
                    width={1125}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Screenshots Section */}
        <section className="py-20 sm:py-32 bg-white dark:bg-[#0a0a0a]">
          <div className="max-w-7xl mx-auto px-6 sm:px-8">
            <h2 className="text-4xl sm:text-5xl font-bold text-center text-[#1a1410] dark:text-[#f0f0f0] mb-16">
              Experience the App
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Home Screen */}
              <div className="group relative">
                <div className="relative aspect-[9/19.5] rounded-3xl overflow-hidden shadow-2xl border border-[#e5ddd0] dark:border-[#333333] bg-[#f5f0e8] dark:bg-[#1a1a1a] transition-transform group-hover:-translate-y-2">
                  <Image
                    src="/screenshots/home.png"
                    alt="Home screen showing story feed"
                    fill
                    className="object-cover object-top"
                  />
                </div>
                <p className="mt-4 text-center text-lg font-medium text-[#1a1410] dark:text-[#f0f0f0]">
                  Browse Stories
                </p>
                <p className="text-center text-sm text-[#665c4f] dark:text-[#a8a8a8]">
                  Infinite scrolling feed with link previews
                </p>
              </div>

              {/* Comments Screen */}
              <div className="group relative">
                <div className="relative aspect-[9/19.5] rounded-3xl overflow-hidden shadow-2xl border border-[#e5ddd0] dark:border-[#333333] bg-[#f5f0e8] dark:bg-[#1a1a1a] transition-transform group-hover:-translate-y-2 group-hover:rotate-0 -rotate-1">
                  <Image
                    src="/screenshots/comments.png"
                    alt="Comment threads"
                    fill
                    className="object-cover object-top"
                  />
                </div>
                <p className="mt-4 text-center text-lg font-medium text-[#1a1410] dark:text-[#f0f0f0]">
                  Read Discussions
                </p>
                <p className="text-center text-sm text-[#665c4f] dark:text-[#a8a8a8]">
                  Nested comments with collapse/expand
                </p>
              </div>

              {/* Story Detail Screen */}
              <div className="group relative">
                <div className="relative aspect-[9/19.5] rounded-3xl overflow-hidden shadow-2xl border border-[#e5ddd0] dark:border-[#333333] bg-[#f5f0e8] dark:bg-[#1a1a1a] transition-transform group-hover:-translate-y-2 group-hover:rotate-0 rotate-1">
                  <Image
                    src="/screenshots/story.png"
                    alt="Story detail with preview"
                    fill
                    className="object-cover object-top"
                  />
                </div>
                <p className="mt-4 text-center text-lg font-medium text-[#1a1410] dark:text-[#f0f0f0]">
                  Rich Previews
                </p>
                <p className="text-center text-sm text-[#665c4f] dark:text-[#a8a8a8]">
                  Beautiful link previews with images
                </p>
              </div>

              {/* Bookmarks Screen */}
              <div className="group relative">
                <div className="relative aspect-[9/19.5] rounded-3xl overflow-hidden shadow-2xl border border-[#e5ddd0] dark:border-[#333333] bg-[#f5f0e8] dark:bg-[#1a1a1a] transition-transform group-hover:-translate-y-2">
                  <Image
                    src="/screenshots/bookmarks.png"
                    alt="Saved bookmarks"
                    fill
                    className="object-cover object-top"
                  />
                </div>
                <p className="mt-4 text-center text-lg font-medium text-[#1a1410] dark:text-[#f0f0f0]">
                  Save for Later
                </p>
                <p className="text-center text-sm text-[#665c4f] dark:text-[#a8a8a8]">
                  Bookmark stories to read anytime
                </p>
              </div>

              {/* Light Mode Screen */}
              <div className="group relative">
                <div className="relative aspect-[9/19.5] rounded-3xl overflow-hidden shadow-2xl border border-[#e5ddd0] dark:border-[#333333] bg-white dark:bg-black transition-transform group-hover:-translate-y-2 group-hover:rotate-0 -rotate-1">
                  <Image
                    src="/screenshots/light-mode.png"
                    alt="Light mode theme"
                    fill
                    className="object-cover object-top"
                  />
                </div>
                <p className="mt-4 text-center text-lg font-medium text-[#1a1410] dark:text-[#f0f0f0]">
                  Light & Dark Modes
                </p>
                <p className="text-center text-sm text-[#665c4f] dark:text-[#a8a8a8]">
                  Seamless theme switching
                </p>
              </div>

              {/* Settings Screen */}
              <div className="group relative">
                <div className="relative aspect-[9/19.5] rounded-3xl overflow-hidden shadow-2xl border border-[#e5ddd0] dark:border-[#333333] bg-[#f5f0e8] dark:bg-[#1a1a1a] transition-transform group-hover:-translate-y-2 group-hover:rotate-0 rotate-1">
                  <Image
                    src="/screenshots/settings.png"
                    alt="Settings and authentication"
                    fill
                    className="object-cover object-top"
                  />
                </div>
                <p className="mt-4 text-center text-lg font-medium text-[#1a1410] dark:text-[#f0f0f0]">
                  HN Authentication
                </p>
                <p className="text-center text-sm text-[#665c4f] dark:text-[#a8a8a8]">
                  Login to vote and comment
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section
          id="features"
          className="py-20 sm:py-32 bg-gradient-to-b from-white to-[#f5f0e8] dark:from-[#0a0a0a] dark:to-[#0f0f0f]"
        >
          <div className="max-w-7xl mx-auto px-6 sm:px-8">
            <h2 className="text-4xl sm:text-5xl font-bold text-center text-[#1a1410] dark:text-[#f0f0f0] mb-6">
              Everything You Need
            </h2>
            <p className="text-xl text-center text-[#665c4f] dark:text-[#a8a8a8] mb-16 max-w-3xl mx-auto">
              A feature-rich Hacker News client built with React Native and Expo
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="p-8 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-[#e5ddd0] dark:border-[#333333] shadow-lg transition hover:-translate-y-1">
                <div className="w-12 h-12 rounded-xl bg-[#ff6600] flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-[#1a1410] dark:text-[#f0f0f0] mb-2">
                  Five Categories
                </h3>
                <p className="text-[#665c4f] dark:text-[#a8a8a8]">
                  Browse Top, New, Ask HN, Show HN, and Jobs stories with
                  lightning-fast category switching.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-8 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-[#e5ddd0] dark:border-[#333333] shadow-lg transition hover:-translate-y-1">
                <div className="w-12 h-12 rounded-xl bg-[#ff6600] flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-[#1a1410] dark:text-[#f0f0f0] mb-2">
                  Blazing Fast
                </h3>
                <p className="text-[#665c4f] dark:text-[#a8a8a8]">
                  Powered by FlashList for smooth infinite scrolling, even with
                  thousands of stories.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-8 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-[#e5ddd0] dark:border-[#333333] shadow-lg transition hover:-translate-y-1">
                <div className="w-12 h-12 rounded-xl bg-[#ff6600] flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-[#1a1410] dark:text-[#f0f0f0] mb-2">
                  Link Previews
                </h3>
                <p className="text-[#665c4f] dark:text-[#a8a8a8]">
                  Beautiful Open Graph previews for every story link with
                  automatic metadata fetching.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="p-8 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-[#e5ddd0] dark:border-[#333333] shadow-lg transition hover:-translate-y-1">
                <div className="w-12 h-12 rounded-xl bg-[#ff6600] flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-[#1a1410] dark:text-[#f0f0f0] mb-2">
                  Threaded Comments
                </h3>
                <p className="text-[#665c4f] dark:text-[#a8a8a8]">
                  Collapsible comment trees with proper nesting and reply
                  indicators.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="p-8 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-[#e5ddd0] dark:border-[#333333] shadow-lg transition hover:-translate-y-1">
                <div className="w-12 h-12 rounded-xl bg-[#ff6600] flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-[#1a1410] dark:text-[#f0f0f0] mb-2">
                  Bookmarks
                </h3>
                <p className="text-[#665c4f] dark:text-[#a8a8a8]">
                  Save interesting stories for later reading with persistent
                  local storage.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="p-8 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-[#e5ddd0] dark:border-[#333333] shadow-lg transition hover:-translate-y-1">
                <div className="w-12 h-12 rounded-xl bg-[#ff6600] flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-[#1a1410] dark:text-[#f0f0f0] mb-2">
                  HN Authentication
                </h3>
                <p className="text-[#665c4f] dark:text-[#a8a8a8]">
                  Securely login with your Hacker News account to upvote stories
                  and post comments.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Tech Stack Section */}
        <section className="bg-white py-24 dark:bg-[#050505] sm:py-32">
          <div className="mx-auto max-w-6xl px-6 sm:px-10">
            <div className="grid gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div className="space-y-6">
                <h2 className="text-4xl font-semibold sm:text-5xl">
                  Built with Modern Tools
                </h2>
                <p className="text-lg leading-relaxed text-[#5d5146] dark:text-[#bbbbbb]">
                  Powered by React Native, Expo, and cutting-edge mobile
                  development practices. FlashList keeps the feed instant while
                  React Query handles caching and offline support.
                </p>
                <div className="flex flex-wrap gap-3 text-sm font-medium text-[#5d5146] dark:text-[#d3d3d3]">
                  <span className="rounded-full border border-[#ead9c9] bg-[#fefaf4] px-4 py-2 dark:border-[#2a2a2a] dark:bg-[#0c0c0c]">
                    React Native
                  </span>
                  <span className="rounded-full border border-[#ead9c9] bg-[#fefaf4] px-4 py-2 dark:border-[#2a2a2a] dark:bg-[#0c0c0c]">
                    Expo
                  </span>
                  <span className="rounded-full border border-[#ead9c9] bg-[#fefaf4] px-4 py-2 dark:border-[#2a2a2a] dark:bg-[#0c0c0c]">
                    Expo Router
                  </span>
                  <span className="rounded-full border border-[#ead9c9] bg-[#fefaf4] px-4 py-2 dark:border-[#2a2a2a] dark:bg-[#0c0c0c]">
                    TypeScript
                  </span>
                  <span className="rounded-full border border-[#ead9c9] bg-[#fefaf4] px-4 py-2 dark:border-[#2a2a2a] dark:bg-[#0c0c0c]">
                    React Query
                  </span>
                  <span className="rounded-full border border-[#ead9c9] bg-[#fefaf4] px-4 py-2 dark:border-[#2a2a2a] dark:bg-[#0c0c0c]">
                    FlashList
                  </span>
                </div>
              </div>
              <div className="space-y-6 rounded-3xl border border-[#ead9c9] bg-[#fefaf4] p-10 shadow-[0_25px_60px_rgba(210,180,150,0.28)] dark:border-[#252525] dark:bg-[#0c0c0c] dark:shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
                <div className="flex items-center gap-3 mb-2">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#1a1410] dark:bg-[#f5f5f5]">
                    <svg
                      className="w-5 h-5 text-white dark:text-[#0a0a0a]"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-semibold">Open Source</h3>
                </div>
                <p className="text-base leading-relaxed text-[#5d5146] dark:text-[#c2c2c2]">
                  Hacker Reader is built in the open. Explore the code, contribute features, or fork it to create your own version. Transparency and community are at the heart of this project.
                </p>
                <a
                  href="https://github.com/danielcspaiva/hacker-reader"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#1a1410] bg-[#1a1410] px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-[#2d2520] hover:bg-[#2d2520] dark:border-[#f5f5f5] dark:bg-[#f5f5f5] dark:text-[#0a0a0a] dark:hover:border-[#e0e0e0] dark:hover:bg-[#e0e0e0]"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  View on GitHub
                </a>
                <p className="text-xs text-[#8f806d] dark:text-[#979797]">
                  Star the repo • Contributions welcome
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-[#fff4e9] py-24 dark:bg-[#0f0f0f] sm:py-32">
          <div className="mx-auto max-w-4xl px-6 text-center sm:px-10">
            <div className="flex justify-center mb-8">
              <HeroIcon />
            </div>
            <h2 className="text-4xl font-semibold sm:text-5xl">
              Ready for a better Hacker News?
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-[#5d5146] dark:text-[#c0c0c0]">
              Get early access and help shape the reader the community deserves.
            </p>
            <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              <a
                href="https://testflight.apple.com/join/placeholder"
                className="inline-flex items-center justify-center rounded-2xl bg-[#ff6600] px-8 py-4 text-base font-semibold text-white shadow-lg shadow-[#ff6600]/40 transition hover:-translate-y-0.5 hover:bg-[#ff7a1a]"
              >
                Join the TestFlight
              </a>
              <a
                href="https://app.hackerreader.app"
                className="inline-flex items-center justify-center rounded-2xl border border-[#dacbbc] px-8 py-4 text-base font-semibold text-[#1a1410] transition hover:border-[#ff6600] hover:text-[#ff6600] dark:border-[#2f2f2f] dark:text-[#f5f5f5] dark:hover:text-[#ff8c43]"
              >
                Open the web app
              </a>
            </div>
            <p className="mt-6 text-sm text-[#8f806d] dark:text-[#979797]">
              Works great on iOS, web, and Android. Coming soon to all platforms.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#ead9c9] bg-[#fefaf4] py-12 dark:border-[#1f1f1f] dark:bg-[#050505]">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 overflow-hidden rounded-2xl">
              <Image
                alt="Hacker Reader icon"
                fill
                className="object-cover"
                src="/icon.png"
              />
            </div>
            <div>
              <p className="text-lg font-semibold">Hacker Reader</p>
              <p className="text-sm text-[#8f806d] dark:text-[#8d8d8d]">
                Built with Expo and React Native
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 text-sm text-[#5d5146] dark:text-[#b3b3b3] sm:flex-row sm:items-center sm:gap-6">
            <a
              className="transition hover:text-[#ff6600]"
              href="https://news.ycombinator.com"
              rel="noopener noreferrer"
              target="_blank"
            >
              Hacker News
            </a>
            <a
              className="transition hover:text-[#ff6600]"
              href="https://github.com/HackerNews/API"
              rel="noopener noreferrer"
              target="_blank"
            >
              HN API
            </a>
            <Link
              className="transition hover:text-[#ff6600]"
              href="https://expo.dev"
            >
              Built with Expo
            </Link>
          </div>
        </div>
        <div className="mt-8 text-center text-xs text-[#8f806d] dark:text-[#7a7a7a]">
          Not affiliated with Y Combinator or Hacker News
        </div>
        <div className="mt-4 text-center text-xs text-[#8f806d] dark:text-[#7a7a7a]">
          Built by{" "}
          <a
            href="https://dcsp.dev/en"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#5d5146] transition hover:text-[#ff6600] dark:text-[#b3b3b3] dark:hover:text-[#ff8c43]"
          >
            Daniel Paiva
          </a>
        </div>
      </footer>
    </div>
  );
}
