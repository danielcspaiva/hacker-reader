# Hacker Reader

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> A polished Hacker News experience for mobile and web, powered by Expo and Next.js.

## Table of Contents
- [Overview](#overview)
- [Key Features](#key-features)
- [Monorepo Layout](#monorepo-layout)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Apps](#running-the-apps)
- [Development Workflow](#development-workflow)
- [Apps](#apps)
  - [Mobile App (Expo)](#mobile-app-expo)
  - [Web App (Next.js)](#web-app-nextjs)
- [Architecture Notes](#architecture-notes)
- [Docs & Roadmap](#docs--roadmap)
- [License](#license)

## Overview

Hacker Reader is a cross-platform Hacker News client that ships a native-quality mobile app alongside a marketing and preview site. The mobile app includes all HN API clients, authentication helpers, and utilities needed for a complete reading and interaction experience. Everything is written in TypeScript and tuned for strict typings, fast feedback loops, and seamless contributor onboarding.

## Key Features

- **Native mobile experience** – Browse Top, New, Show HN, Ask HN, and Jobs feeds with FlashList, themed layouts, haptic feedback, and deep React Query caching.
- **HN account support** – Log in inside the app, manage a secure session, vote, favorite, and comment through the hardened write API wrappers.
- **Thoughtful reading tools** – Rich Open Graph link previews, nested comment threads with collapse controls, Algolia-powered search, and persistent bookmarks backed by AsyncStorage.
- **Web preview & landing** – A Next.js App Router site that showcases the app, ships a dark/light marketing experience. (AI backend features coming soon)

## Monorepo Layout

```
.
├── apps/
│   ├── mobile/              # Expo + React Native app
│   │   ├── lib/
│   │   │   └── shared/      # HN API clients, auth, types, utilities
│   │   ├── hooks/           # React Query hooks
│   │   ├── components/      # UI components
│   │   └── app/             # Expo Router screens
│   └── web/                 # Next.js App Router marketing site (AI backend coming)
├── package.json             # Root scripts and tooling
├── pnpm-workspace.yaml      # Workspace definition
└── tsconfig.base.json       # Shared TypeScript configuration
```

## Getting Started

### Prerequisites

- Node.js 18 or newer
- pnpm 8+
- Xcode (for iOS simulators) and/or Android Studio (for emulators)

### Installation

```bash
pnpm install
```

### Running the Apps

```bash
# Run mobile (Expo) and web (Next.js) dev servers together
pnpm dev

# Mobile targets
pnpm mobile        # Expo dev server
pnpm mobile:ios    # Launch iOS simulator
pnpm mobile:android # Launch Android emulator
pnpm mobile:lint   # Expo workspace linting

# Web targets
pnpm web           # Next.js dev server
pnpm web:build     # Production build
pnpm web:start     # Start production server
pnpm web:lint      # Next.js workspace linting
```

### Environment Setup

- Duplicate `apps/mobile/.env.example` to `.env.local` and populate Sentry/PostHog keys (or leave blank to disable those integrations when developing).
- Duplicate `apps/web/.env.example` to `.env.local` to set `NEXT_PUBLIC_SITE_URL` for metadata when running the marketing site.

## Development Workflow

- Prefer TypeScript everywhere with explicit return types on exported functions.
- Default formatting is two-space indentation with trailing commas; the existing ESLint config enforces it.
- Before opening a PR, run:

```bash
pnpm typecheck
pnpm lint
pnpm mobile    # smoke-test the Expo app
pnpm web       # smoke-test the marketing site
```

- For focused checks: `pnpm --filter <workspace> <command>`.
- Track follow-up tasks in `todo/` rather than leaving `TODO` comments in code.

## Apps

### Mobile App (Expo)

**Package**: `@hn/mobile`

- **Framework**: Expo SDK 54 with React Compiler, Expo Router, and React Native 0.81
- **Features**: FlashList-driven feeds, story detail screens, bookmarks, search, and threaded comments
- **Authentication**: Secure HN account login via in-app WebView with vote/favorite/comment capabilities
- **Theming**: System-aware dark mode with persisted preferences, custom color palettes, and glass effects
- **iOS Widgets**: Three widget sizes (small/medium/large) with auto-updates and deep linking
- **Forking note**: Update the bundle identifiers in `apps/mobile/app.json` before shipping your own builds.

**Core Libraries** (`apps/mobile/lib/shared/`):
- **API Clients**: HN API, Algolia search, Open Graph metadata fetching
- **Authentication**: Secure session wrapper, HTML parsers, rate limiting, write operations
- **Types**: Fully typed interfaces for `HNItem`, `HNUser`, `AlgoliaStory`, etc.
- **Utilities**: HTML sanitizers, relative time formatters, URL parsing

### Web App (Next.js)

**Package**: `@hn/web`

- **Framework**: Next.js 15 App Router with Tailwind CSS
- **Purpose**: Marketing site showcasing the mobile app
- **Features**: Dark/light themed landing page, screenshots, TestFlight links
- **Future**: AI backend for premium features (story summaries, daily digest, smart notifications)

## Architecture Notes

- React Query powers all data access with tuned stale/gc timings, optimistic updates for bookmarks, and intelligent caching.
- Mobile theming, authentication state, and session management live in dedicated React Context providers to keep screens lightweight.
- Write operations enforce HTTPS, rate limits, and HTML token parsing before hitting Hacker News, preventing leaked cookies and hard-to-debug failures.
- Everything compiles against `tsconfig.base.json`, ensuring editor tooling, path alias (`@/`), and strict options stay in sync.

## Docs & Roadmap

- `todo/` – backlog notes, prototypes, and follow-up tasks; add new ideas here instead of inline TODOs.

## License

This project is open source under the [MIT License](LICENSE).

### Open Source + Premium Model

**All code is MIT licensed** – you're free to use, modify, and distribute this codebase, including the AI backend (when implemented).

**However,** the premium AI features require a backend server with OpenAI/Anthropic API access. You have two options:

#### Option 1: Premium Subscription ($0.99/month)
- ✅ We host the AI backend for you
- ✅ No setup, configuration, or API keys needed
- ✅ Optimized caching and cost-efficient infrastructure
- ✅ Support ongoing development
- ✅ 14-day free trial

**Premium features include:**
- 🤖 AI-powered story summaries (TL;DR + key points)
- 🤖 AI daily digest (push notifications)
- 🤖 AI comment thread summaries
- 🤖 Smart keyword notifications with AI context
- 🔓 Unlimited upvoting & interaction
- 🔓 Comment posting
- 🔓 Advanced widgets (medium + large sizes)
- 🔓 Offline reading mode
- 🔓 Reading history & analytics

#### Option 2: Self-Hosting (Free)
- 🛠️ Deploy your own AI backend (see `apps/web/api/` when available)
- 🛠️ Bring your own OpenAI/Anthropic API keys
- 🛠️ You pay AI providers directly (may cost more than subscription)
- 🛠️ Full control over your data and infrastructure
- 📚 See [Self-Hosting Guide](docs/self-hosting.md) (coming soon)

**Why this model?**
- The code teaches you how to build a modern HN client with AI features
- Most users find the subscription more convenient than managing infrastructure
- Self-hosting is perfect for learning, customization, or avoiding subscriptions
- Your subscription supports active development and keeps the project sustainable

**Philosophy:** Code is free, hosted services are paid. We believe in transparency, education, and giving users choice.
