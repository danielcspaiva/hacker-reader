import Image from "next/image";
import Link from "next/link";
import { HeroIcon } from "./(components)/hero-icon";
import { ThemeToggle } from "./(components)/theme-toggle";

export default function Home() {
  return (
    <div className="min-h-screen">
      <ThemeToggle />
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#f5f0e8] to-white dark:from-[#0f0f0f] dark:to-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-20 sm:py-32">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <HeroIcon />
            </div>
            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-[#1a1410] dark:text-[#f0f0f0] mb-6">
              Hacker Reader
              <span className="block text-[#ff6600]">Reimagined</span>
            </h1>
            <p className="text-xl sm:text-2xl text-[#665c4f] dark:text-[#a8a8a8] max-w-3xl mx-auto mb-12 leading-relaxed">
              A beautiful, native mobile experience for Hacker News. Browse
              stories, read comments, and stay up to date with the tech
              community.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a
                href="#features"
                className="px-8 py-4 bg-[#ff6600] text-white font-semibold rounded-xl hover:bg-[#ff7700] transition-colors shadow-lg hover:shadow-xl"
              >
                Learn More
              </a>
              <div className="text-sm text-[#8a7f6d] dark:text-[#a8a8a8]">
                Coming soon to iOS & Android
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
              <div className="relative aspect-[9/19.5] rounded-3xl overflow-hidden shadow-2xl border border-[#e5ddd0] dark:border-[#333333] bg-[#f5f0e8] dark:bg-[#1a1a1a] transition-transform group-hover:scale-105">
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
              <div className="relative aspect-[9/19.5] rounded-3xl overflow-hidden shadow-2xl border border-[#e5ddd0] dark:border-[#333333] bg-[#f5f0e8] dark:bg-[#1a1a1a] transition-transform group-hover:scale-105">
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
              <div className="relative aspect-[9/19.5] rounded-3xl overflow-hidden shadow-2xl border border-[#e5ddd0] dark:border-[#333333] bg-[#f5f0e8] dark:bg-[#1a1a1a] transition-transform group-hover:scale-105">
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
              <div className="relative aspect-[9/19.5] rounded-3xl overflow-hidden shadow-2xl border border-[#e5ddd0] dark:border-[#333333] bg-[#f5f0e8] dark:bg-[#1a1a1a] transition-transform group-hover:scale-105">
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
              <div className="relative aspect-[9/19.5] rounded-3xl overflow-hidden shadow-2xl border border-[#e5ddd0] dark:border-[#333333] bg-white dark:bg-black transition-transform group-hover:scale-105">
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
              <div className="relative aspect-[9/19.5] rounded-3xl overflow-hidden shadow-2xl border border-[#e5ddd0] dark:border-[#333333] bg-[#f5f0e8] dark:bg-[#1a1a1a] transition-transform group-hover:scale-105">
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
            <div className="p-8 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-[#e5ddd0] dark:border-[#333333] shadow-lg">
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
            <div className="p-8 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-[#e5ddd0] dark:border-[#333333] shadow-lg">
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
            <div className="p-8 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-[#e5ddd0] dark:border-[#333333] shadow-lg">
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
            <div className="p-8 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-[#e5ddd0] dark:border-[#333333] shadow-lg">
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
            <div className="p-8 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-[#e5ddd0] dark:border-[#333333] shadow-lg">
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
            <div className="p-8 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-[#e5ddd0] dark:border-[#333333] shadow-lg">
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
      <section className="py-20 sm:py-32 bg-white dark:bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto px-6 sm:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-[#1a1410] dark:text-[#f0f0f0] mb-6">
            Built with Modern Tools
          </h2>
          <p className="text-xl text-[#665c4f] dark:text-[#a8a8a8] mb-12">
            Powered by React Native, Expo, and cutting-edge mobile development
            practices
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-lg">
            <span className="px-6 py-3 bg-[#f5f0e8] dark:bg-[#1a1a1a] rounded-full text-[#1a1410] dark:text-[#f0f0f0] font-medium border border-[#e5ddd0] dark:border-[#333333]">
              React Native
            </span>
            <span className="px-6 py-3 bg-[#f5f0e8] dark:bg-[#1a1a1a] rounded-full text-[#1a1410] dark:text-[#f0f0f0] font-medium border border-[#e5ddd0] dark:border-[#333333]">
              Expo
            </span>
            <span className="px-6 py-3 bg-[#f5f0e8] dark:bg-[#1a1a1a] rounded-full text-[#1a1410] dark:text-[#f0f0f0] font-medium border border-[#e5ddd0] dark:border-[#333333]">
              Expo Router
            </span>
            <span className="px-6 py-3 bg-[#f5f0e8] dark:bg-[#1a1a1a] rounded-full text-[#1a1410] dark:text-[#f0f0f0] font-medium border border-[#e5ddd0] dark:border-[#333333]">
              TypeScript
            </span>
            <span className="px-6 py-3 bg-[#f5f0e8] dark:bg-[#1a1a1a] rounded-full text-[#1a1410] dark:text-[#f0f0f0] font-medium border border-[#e5ddd0] dark:border-[#333333]">
              React Query
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-[#f5f0e8] dark:bg-[#0f0f0f] border-t border-[#e5ddd0] dark:border-[#333333]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-lg overflow-hidden">
                <Image
                  src="/icon.png"
                  alt="HN Client"
                  fill
                  className="object-cover"
                />
              </div>
              <span className="text-lg font-semibold text-[#1a1410] dark:text-[#f0f0f0]">
                Hacker Reader
              </span>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 text-[#665c4f] dark:text-[#a8a8a8]">
              <a
                href="https://news.ycombinator.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#ff6600] transition-colors"
              >
                Hacker News
              </a>
              <span className="hidden sm:inline">•</span>
              <a
                href="https://github.com/HackerNews/API"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#ff6600] transition-colors"
              >
                HN API
              </a>
              <span className="hidden sm:inline">•</span>
              <span className="text-sm">
                Built with{" "}
                <Link
                  href="https://expo.dev"
                  className="text-[#ff6600] hover:underline"
                >
                  Expo
                </Link>
              </span>
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-[#8a7f6d] dark:text-[#a8a8a8]">
            Not affiliated with Y Combinator or Hacker News
          </div>
        </div>
      </footer>
    </div>
  );
}
