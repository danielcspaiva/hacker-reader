import Image from "next/image";
import Link from "next/link";
import { HeroIcon } from "../(components)/hero-icon";
import { ThemeToggle } from "../(components)/theme-toggle";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-[#1a1410] dark:bg-[#050505] dark:text-[#f5f5f5]">
      <ThemeToggle />
      <main>
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
                <div className="flex items-center gap-3 text-sm uppercase tracking-[0.35em] text-[#856a58] dark:text-[#b59d8d]">
                  <HeroIcon />
                  <span>Hacker Reader</span>
                </div>
                <div>
                  <h1 className="text-5xl font-bold leading-[1.05] sm:text-6xl lg:text-7xl">
                    Read Hacker News like it deserves.
                  </h1>
                  <p className="mt-6 text-xl leading-relaxed text-[#5d5146] dark:text-[#c4c4c4] sm:text-2xl">
                    A calm, crafted experience for staying close to the tech
                    world—native-feeling on iPhone, iPad, and the web.
                  </p>
                </div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <a
                    href="https://testflight.apple.com/join/placeholder"
                    className="inline-flex items-center justify-center rounded-2xl bg-[#ff6600] px-8 py-4 text-base font-semibold text-white shadow-lg shadow-[#ff6600]/40 transition hover:-translate-y-0.5 hover:bg-[#ff7a1a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff6600]"
                  >
                    Join the TestFlight
                  </a>
                  <a
                    href="mailto:daniel@hackerreader.app"
                    className="inline-flex items-center justify-center rounded-2xl border border-[#dacbbc] px-8 py-4 text-base font-semibold text-[#1a1410] transition hover:border-[#ff6600] hover:text-[#ff6600] dark:border-[#2f2f2f] dark:text-[#f5f5f5] dark:hover:text-[#ff8c43]"
                  >
                    Notify me on launch
                  </a>
                </div>
                <p className="text-sm text-[#8f806d] dark:text-[#979797]">
                  Crafted with Expo + Next.js · Dark mode by default · Sync that
                  feels invisible
                </p>
              </div>
              <div className="relative">
                <div
                  aria-hidden
                  className="absolute inset-0 -top-10 rounded-[3rem] bg-gradient-to-tr from-[#ff6600]/25 to-transparent blur-3xl"
                />
                <div className="relative mx-auto w-[280px] overflow-hidden rounded-[3rem] border border-[#ead9c9] bg-[#f8f3ec] shadow-[0_25px_70px_rgba(48,27,18,0.22)] transition hover:-translate-y-2 dark:border-[#2f2a26] dark:bg-[#151313] dark:shadow-[0_25px_80px_rgba(0,0,0,0.55)] sm:w-[320px] lg:w-[360px]">
                  <Image
                    alt="Hacker Reader home feed"
                    className="h-full w-full object-cover object-top"
                    height={2436}
                    priority
                    src="/screenshots/home.png"
                    width={1125}
                  />
                </div>
                <div className="absolute -bottom-10 -right-8 hidden w-[200px] rotate-3 overflow-hidden rounded-[2.5rem] border border-[#ead9c9] bg-[#f8f3ec] shadow-[0_25px_40px_rgba(48,27,18,0.18)] dark:border-[#2f2a26] dark:bg-[#151313] dark:shadow-[0_25px_60px_rgba(0,0,0,0.45)] lg:block">
                  <Image
                    alt="Threaded discussions in Hacker Reader"
                    className="h-full w-full object-cover object-top"
                    height={2436}
                    src="/screenshots/comments.png"
                    width={1125}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-24 dark:bg-[#050505] sm:py-32">
          <div className="mx-auto max-w-5xl px-6 sm:px-10 text-center">
            <h2 className="text-4xl font-semibold sm:text-5xl">
              Built for the way you actually read.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-[#5d5146] dark:text-[#b8b8b8]">
              Hacker Reader is my love letter to long-form browsing—clear
              typography, focus that holds, and power features that stay out of
              the way until you need them.
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-6xl gap-8 px-6 sm:px-10 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-4 rounded-3xl border border-[#ead9c9] bg-[#fefaf4] p-8 text-left shadow-[0_18px_40px_rgba(210,180,150,0.25)] dark:border-[#252525] dark:bg-[#111111] dark:shadow-[0_20px_50px_rgba(0,0,0,0.55)]">
              <p className="text-xs uppercase tracking-[0.3em] text-[#9c7d63] dark:text-[#d1905a]">
                Made for readers
              </p>
              <h3 className="text-2xl font-semibold">
                Typography that lets your brain breathe.
              </h3>
              <p className="text-base leading-relaxed text-[#5d5146] dark:text-[#bfbfbf]">
                Adjustable type, consistent rhythm, and a warmth that makes HN
                feel more like a magazine than a message board.
              </p>
            </div>
            <div className="space-y-4 rounded-3xl border border-[#ead9c9] bg-white p-8 text-left shadow-[0_18px_40px_rgba(210,180,150,0.18)] dark:border-[#252525] dark:bg-[#0c0c0c] dark:shadow-[0_20px_55px_rgba(0,0,0,0.55)]">
              <p className="text-xs uppercase tracking-[0.3em] text-[#9c7d63] dark:text-[#d1905a]">
                Made for power users
              </p>
              <h3 className="text-2xl font-semibold">
                Fast paths for every story type.
              </h3>
              <p className="text-base leading-relaxed text-[#5d5146] dark:text-[#bfbfbf]">
                Keyboard shortcuts, swipe gestures, offline queues, and deep
                links tuned for the way developers triage their reading list.
              </p>
            </div>
            <div className="space-y-4 rounded-3xl border border-[#ead9c9] bg-white p-8 text-left shadow-[0_18px_40px_rgba(210,180,150,0.18)] dark:border-[#252525] dark:bg-[#0c0c0c] dark:shadow-[0_20px_55px_rgba(0,0,0,0.55)] md:col-span-2 lg:col-span-1">
              <p className="text-xs uppercase tracking-[0.3em] text-[#9c7d63] dark:text-[#d1905a]">
                Made by someone who cares
              </p>
              <h3 className="text-2xl font-semibold">
                Crafted by Daniel Paiva, a long-time HN regular.
              </h3>
              <p className="text-base leading-relaxed text-[#5d5146] dark:text-[#bfbfbf]">
                I built Hacker Reader because I wanted a calmer way to follow
                the community that shaped my career. Every interaction is tuned
                to feel intentional.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-[#fff4e9] py-24 dark:bg-[#0f0f0f] sm:py-32">
          <div className="mx-auto max-w-6xl px-6 sm:px-10">
            <div className="max-w-3xl">
              <h2 className="text-4xl font-semibold sm:text-5xl">
                The stories, framed with intention.
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-[#5d5146] dark:text-[#c0c0c0]">
                From comments wrapped in depth to clean link previews, every
                screen balances focus with personality.
              </p>
            </div>
            <div className="mt-16 grid gap-10 lg:grid-cols-3">
              <figure className="relative overflow-hidden rounded-[3rem] border border-[#ead9c9] bg-white shadow-[0_25px_60px_rgba(210,180,150,0.35)] transition hover:-translate-y-2 dark:border-[#252525] dark:bg-[#0b0b0b] dark:shadow-[0_30px_70px_rgba(0,0,0,0.6)]">
                <Image
                  alt="Readable story cards"
                  className="h-full w-full object-cover object-top"
                  height={2436}
                  src="/screenshots/story.png"
                  width={1125}
                />
                <figcaption className="p-6 text-center text-sm uppercase tracking-[0.3em] text-[#9c7d63] dark:text-[#d1905a]">
                  Focus mode stories
                </figcaption>
              </figure>
              <figure className="relative -rotate-2 overflow-hidden rounded-[3rem] border border-[#ead9c9] bg-white shadow-[0_25px_60px_rgba(210,180,150,0.28)] transition hover:rotate-0 hover:-translate-y-2 dark:border-[#252525] dark:bg-[#070707] dark:shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
                <Image
                  alt="Threaded comment experience"
                  className="h-full w-full object-cover object-top"
                  height={2436}
                  src="/screenshots/comments.png"
                  width={1125}
                />
                <figcaption className="p-6 text-center text-sm uppercase tracking-[0.3em] text-[#9c7d63] dark:text-[#d1905a]">
                  Human-friendly threads
                </figcaption>
              </figure>
              <figure className="relative rotate-2 overflow-hidden rounded-[3rem] border border-[#ead9c9] bg-white shadow-[0_25px_60px_rgba(210,180,150,0.28)] transition hover:rotate-0 hover:-translate-y-2 dark:border-[#252525] dark:bg-[#070707] dark:shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
                <Image
                  alt="Bookmarks and saved stories"
                  className="h-full w-full object-cover object-top"
                  height={2436}
                  src="/screenshots/bookmarks.png"
                  width={1125}
                />
                <figcaption className="p-6 text-center text-sm uppercase tracking-[0.3em] text-[#9c7d63] dark:text-[#d1905a]">
                  Save for later stacks
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section className="bg-white py-24 dark:bg-[#050505] sm:py-32">
          <div className="mx-auto max-w-6xl px-6 sm:px-10">
            <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl space-y-6">
                <h2 className="text-4xl font-semibold sm:text-5xl">
                  The icon, reimagined.
                </h2>
                <p className="text-lg leading-relaxed text-[#5d5146] dark:text-[#bdbdbd]">
                  A timeless nod to the original Hacker News &quot;Y&quot;—reshaped into a
                  reader&apos;s mark. Light and dark pairings bring warmth to
                  every surface you launch from.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div className="flex h-36 w-36 items-center justify-center rounded-3xl bg-gradient-to-br from-white to-[#fef4e6] shadow-[0_20px_45px_rgba(210,180,150,0.25)] dark:from-[#1b1b1b] dark:to-[#131313] dark:shadow-[0_25px_55px_rgba(0,0,0,0.55)]">
                  <Image
                    alt="Hacker Reader icon on light background"
                    height={180}
                    src="/icon.png"
                    width={180}
                  />
                </div>
                <div className="flex h-36 w-36 items-center justify-center rounded-3xl bg-[#1a1410] shadow-[0_20px_45px_rgba(210,180,150,0.25)] dark:bg-[#fef4e6] dark:shadow-[0_25px_55px_rgba(0,0,0,0.45)]">
                  <Image
                    alt="Hacker Reader icon on dark background"
                    height={180}
                    src="/icon.png"
                    width={180}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#0f0f0f] py-24 text-white dark:bg-[#090909] sm:py-32">
          <div className="mx-auto max-w-6xl px-6 sm:px-10">
            <h2 className="text-4xl font-semibold sm:text-5xl">
              What early readers are saying
            </h2>
            <div className="mt-16 grid gap-6 md:grid-cols-2">
              <blockquote className="space-y-4 rounded-3xl bg-white/5 p-8 text-[#f0e5da] shadow-[0_25px_60px_rgba(0,0,0,0.45)]">
                <p className="text-lg leading-relaxed">
                  &ldquo;Finally, a Hacker News client that feels built for humans,
                  not just headlines. The typography alone makes me want to read
                  more.&rdquo;
                </p>
                <footer className="text-sm uppercase tracking-[0.25em] text-[#ff9d5c]">
                  Product designer, SF
                </footer>
              </blockquote>
              <blockquote className="space-y-4 rounded-3xl bg-white/5 p-8 text-[#f0e5da] shadow-[0_25px_60px_rgba(0,0,0,0.45)]">
                <p className="text-lg leading-relaxed">
                  &ldquo;Perfect blend of simplicity and polish. Launching it on the
                  desktop web during my morning coffee has become a ritual.&rdquo;
                </p>
                <footer className="text-sm uppercase tracking-[0.25em] text-[#ff9d5c]">
                  Indie iOS dev, Berlin
                </footer>
              </blockquote>
            </div>
          </div>
        </section>

        <section className="bg-white py-24 dark:bg-[#050505] sm:py-32">
          <div className="mx-auto max-w-6xl px-6 sm:px-10">
            <div className="grid gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div className="space-y-6">
                <h2 className="text-4xl font-semibold sm:text-5xl">
                  Engineered with the tools we love.
                </h2>
                <p className="text-lg leading-relaxed text-[#5d5146] dark:text-[#bbbbbb]">
                  Expo Router, React Native, and Next.js power a shared design
                  system. FlashList keeps the feed instant. Offline caching and
                  account sync mean your place is saved at every glance.
                </p>
                <div className="flex flex-wrap gap-3 text-sm font-medium text-[#5d5146] dark:text-[#d3d3d3]">
                  <span className="rounded-full border border-[#ead9c9] bg-[#fefaf4] px-4 py-2 dark:border-[#2a2a2a] dark:bg-[#0c0c0c]">
                    Expo + React Native
                  </span>
                  <span className="rounded-full border border-[#ead9c9] bg-[#fefaf4] px-4 py-2 dark:border-[#2a2a2a] dark:bg-[#0c0c0c]">
                    React Query
                  </span>
                  <span className="rounded-full border border-[#ead9c9] bg-[#fefaf4] px-4 py-2 dark:border-[#2a2a2a] dark:bg-[#0c0c0c]">
                    Next.js
                  </span>
                  <span className="rounded-full border border-[#ead9c9] bg-[#fefaf4] px-4 py-2 dark:border-[#2a2a2a] dark:bg-[#0c0c0c]">
                    Tailwind & NativeWind
                  </span>
                  <span className="rounded-full border border-[#ead9c9] bg-[#fefaf4] px-4 py-2 dark:border-[#2a2a2a] dark:bg-[#0c0c0c]">
                    TypeScript everywhere
                  </span>
                </div>
              </div>
              <div className="space-y-6 rounded-3xl border border-[#ead9c9] bg-[#fefaf4] p-10 shadow-[0_25px_60px_rgba(210,180,150,0.28)] dark:border-[#252525] dark:bg-[#0c0c0c] dark:shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
                <h3 className="text-2xl font-semibold">Performance brag</h3>
                <ul className="space-y-4 text-base leading-relaxed text-[#5d5146] dark:text-[#c2c2c2]">
                  <li>🚀 Launch to first story in under 500ms on recent devices.</li>
                  <li>🌓 Seamless light ↔ dark transitions, just like the app.</li>
                  <li>🔐 Secure Hacker News login with session persistence.</li>
                </ul>
                <p className="text-sm uppercase tracking-[0.3em] text-[#9c7d63] dark:text-[#d1905a]">
                  Built for readers who notice the details.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#fff4e9] py-24 dark:bg-[#0f0f0f] sm:py-32">
          <div className="mx-auto max-w-4xl px-6 text-center sm:px-10">
            <HeroIcon />
            <h2 className="mt-8 text-4xl font-semibold sm:text-5xl">
              Ready for a calmer Hacker News?
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-[#5d5146] dark:text-[#c0c0c0]">
              Get early access, share feedback, and help shape the reader the
              community deserves.
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
              Works great on Safari, Chrome, and the iOS app. Android support is
              on the roadmap—want it sooner? Let me know.
            </p>
          </div>
        </section>
      </main>

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
                Designed and built by Daniel Paiva
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
          <p className="text-xs text-[#8f806d] dark:text-[#7a7a7a]">
            Not affiliated with Y Combinator or Hacker News
          </p>
        </div>
      </footer>
    </div>
  );
}
