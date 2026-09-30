# Hacker Reader

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

![Hacker Reader Cover](assets/repo/cover-light.png)

> A polished Hacker News experience for iOS, powered by Expo and React Native.

[![Download on the App Store](https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83)](https://apps.apple.com/us/app/hacker-reader/id6754137305)

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
- **HN account support** – Log in inside the app, manage a secure session, vote, post comments, and delete your own comments through the hardened write API wrappers with optimistic UI updates.
- **Thoughtful reading tools** – Rich Open Graph link previews, nested comment threads with collapse controls, Algolia-powered search, and persistent bookmarks backed by AsyncStorage.
- **iOS Widgets** – Small, medium and large home screen widgets plus a lock screen widget showing Top Stories, built with `expo-widgets` and refreshed on their own (every 30 minutes when stale), with deep links to stories.
- **Web preview & landing** – A Next.js App Router marketing site showcasing the app.

## Monorepo Layout

```
.
├── apps/
│   ├── mobile/              # Expo + React Native app
│   │   ├── lib/hn/          # HN API clients, auth, local stores, types
│   │   ├── lib/format/      # time and URL formatting
│   │   ├── lib/html/        # entity decoding and HTML parsing
│   │   ├── hooks/           # React Query hooks
│   │   ├── components/ui/   # design-system primitives
│   │   ├── components/      # feature components
│   │   ├── widgets/         # iOS widget layout and provider
│   │   └── app/             # Expo Router screens
│   ├── api/                 # Next.js route handlers: Hacker Reader Pro backend
│   └── web/                 # Next.js App Router marketing site (AI backend coming)
├── package.json             # Root scripts and tooling
├── pnpm-workspace.yaml      # Workspace definition
└── tsconfig.base.json       # Shared TypeScript configuration
```

## Getting Started

### Prerequisites

- Node.js 18 or newer
- pnpm 12 (pinned via `packageManager`)
- Xcode (for iOS development)

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
pnpm mobile:lint   # oxlint in apps/mobile
pnpm --filter @hn/mobile test   # Node tests for the HN layer

# Web targets
pnpm web           # Next.js dev server
pnpm web:build     # Production build
pnpm web:start     # Start production server
pnpm web:lint      # oxlint in apps/web
```

### Environment Setup

- Duplicate `apps/mobile/.env.example` to `.env.local` and populate Sentry/PostHog keys (or leave blank to disable those integrations when developing).
- Hacker Reader Pro is optional: set `EXPO_PUBLIC_REVENUECAT_IOS_KEY` and `EXPO_PUBLIC_API_URL` in the mobile env to enable it (leave blank to hide it); the backend lives in `apps/api` (see its README).
- Duplicate `apps/web/.env.example` to `.env.local` to set `NEXT_PUBLIC_SITE_URL` for metadata when running the marketing site.

## Development Workflow

- Prefer TypeScript everywhere with explicit return types on exported functions.
- Default formatting is two-space indentation with trailing commas; oxfmt enforces it.
- Before opening a PR, run:

```bash
pnpm typecheck
pnpm lint          # oxlint, then oxfmt --check
pnpm format        # oxfmt write
pnpm mobile    # smoke-test the Expo app
pnpm web       # smoke-test the marketing site
```

- For focused checks: `pnpm --filter <workspace> <command>`.
- Track follow-up tasks in `todo/` rather than leaving `TODO` comments in code.

## Apps

### Mobile App (Expo)

**Package**: `@hn/mobile`

- **Platform**: iOS (Android support coming soon)
- **Framework**: Expo SDK 58 (preview) with React Compiler, Expo Router, and React Native 0.88
- **Features**: FlashList-driven feeds, story detail screens, bookmarks, search, and threaded comments with full posting and deletion capabilities
- **Authentication**: Secure HN account login via a native login form with vote/comment/delete capabilities
- **Theming**: System-aware light/dark themes on warm solid surfaces with a persisted preference; native iOS 26 chrome for headers and tabs (see `apps/mobile/docs/design-language.md`)
- **Home Screen Widgets**: Small (1 story), medium (2), large (7) and lock screen widgets showing Top Stories, deep linking to stories, refreshed by the app and by a self-refreshing timeline provider

**Core Libraries** (`apps/mobile/lib/hn/`, `lib/link-preview/`, `lib/format/`, `lib/html/`):

- **API Clients**: HN API, Algolia search, Open Graph metadata fetching
- **Authentication**: Secure session wrapper, HTML parsers, rate limiting, write operations
- **Types**: Fully typed interfaces for `HNItem`, `HNUser`, `AlgoliaStory`, etc.
- **Utilities**: HTML entity decoding and parsing, relative time formatters, URL parsing

### Web App (Next.js)

**Package**: `@hn/web`

- **Framework**: Next.js 15 App Router with Tailwind CSS
- **Purpose**: Marketing site showcasing the mobile app
- **Features**: Dark/light themed landing page, screenshots, App Store links

## Architecture Notes

- React Query powers all data access with tuned stale/gc timings, optimistic updates for bookmarks, and intelligent caching.
- Mobile theming, authentication state, and session management live in dedicated React Context providers to keep screens lightweight.
- Write operations enforce HTTPS, rate limits, and HTML token parsing before hitting Hacker News, preventing leaked cookies and hard-to-debug failures.
- Everything compiles against `tsconfig.base.json`, ensuring editor tooling, path alias (`@/`), and strict options stay in sync.

## Docs & Roadmap

- `todo/` – backlog notes, prototypes, and follow-up tasks; add new ideas here instead of inline TODOs.

## License

This project is open source under the [MIT License](LICENSE).
