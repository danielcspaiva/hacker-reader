# Hacker Reader

> A polished Hacker News experience for mobile and web, powered by Expo, Next.js, and a shared TypeScript core.

## Table of Contents
- [Overview](#overview)
- [Key Features](#key-features)
- [Monorepo Layout](#monorepo-layout)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Apps](#running-the-apps)
- [Development Workflow](#development-workflow)
- [Workspace Packages](#workspace-packages)
  - [@hn/mobile (Expo app)](#hnmobile-expo-app)
  - [@hn/web (Next.js site)](#hnweb-nextjs-site)
  - [@hn/shared](#hnshared)
- [Architecture Notes](#architecture-notes)
- [Docs & Roadmap](#docs--roadmap)
- [License](#license)

## Overview

Hacker Reader is a cross-platform Hacker News client that ships a native-quality mobile app alongside a marketing and preview site. The codebase lives in a pnpm workspace so the apps can share API clients, authentication helpers, and utilities while keeping platform-specific UI separate. Everything is written in TypeScript and tuned for strict typings, fast feedback loops, and seamless contributor onboarding.

## Key Features

- **Native mobile experience** – Browse Top, New, Show HN, Ask HN, and Jobs feeds with FlashList, themed layouts, haptic feedback, and deep React Query caching.
- **HN account support** – Log in inside the app, manage a secure session, vote, favorite, and comment through the hardened write API wrappers.
- **Thoughtful reading tools** – Rich Open Graph link previews, nested comment threads with collapse controls, Algolia-powered search, and persistent bookmarks backed by AsyncStorage.
- **Web preview & landing** – A Next.js App Router site that showcases the app, ships a dark/light marketing experience, and reuses shared clients for real data.
- **Shared foundation** – One set of API clients, types, and utilities published from `@hn/shared`, plus a common base `tsconfig` and linting rules across every workspace.

## Monorepo Layout

```
.
├── apps/
│   ├── mobile/          # Expo + React Native app
│   └── web/             # Next.js App Router marketing site
├── packages/
│   └── shared/          # Reusable API clients, auth helpers, types, utilities
├── api-docs/            # Reference material and integration notes
├── todo/                # Backlog experiments and follow-up tasks
├── package.json         # Root scripts and tooling
├── pnpm-workspace.yaml  # Workspace definition
└── tsconfig.base.json   # Shared TypeScript configuration
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

- For focused checks: `pnpm shared:typecheck` and `pnpm --filter <workspace> <command>`.
- Track follow-up tasks in `todo/` rather than leaving `TODO` comments in code.

## Workspace Packages

### @hn/mobile (Expo app)

- Expo SDK 54 with the React Compiler, Expo Router, and React Native 0.81.
- FlashList-driven feeds, story detail screens, bookmarks, search, and threaded comments.
- Secure Hacker News authentication via in-app login (WebView) plus vote/favorite/comment mutations using the shared write API.
- System-aware theming with persisted preferences, custom color palettes, glass effect support, and subtle haptics.

### @hn/web (Next.js site)

- Next.js 15 App Router with Tailwind CSS and a fully themed landing page.
- Showcases real screenshots, feature highlights, and links to TestFlight / web previews.
- Shares API clients, types, and formatting helpers from `@hn/shared` for consistency.

### @hn/shared

- REST and scraping clients for the Hacker News API, Algolia HN search, and Open Graph metadata.
- Hardened authentication utilities: secure session wrapper, HTML parsers, rate limiting, and write operations (vote, unvote, favorite, comment).
- Shared types (`HNItem`, `HNUser`, `AlgoliaStory`, etc.) plus utility helpers like HTML sanitizers and relative time formatters.
- Ships a `tsconfig` and single entrypoint so both apps consume the same strongly typed surface.

## Architecture Notes

- React Query powers all data access with tuned stale/gc timings, optimistic updates for bookmarks, and cache hydration between shared clients.
- Mobile theming, authentication state, and session management live in dedicated React Context providers to keep screens lightweight.
- Write operations enforce HTTPS, rate limits, and HTML token parsing before hitting Hacker News, preventing leaked cookies and hard-to-debug failures.
- Everything compiles against `tsconfig.base.json`, ensuring editor tooling, path aliases (`@/` and `@hn/`), and strict options stay in sync.

## Docs & Roadmap

- `api-docs/` – in-progress reference material for Hacker News endpoints, Algolia search, and authentication flows.
- `todo/` – backlog notes, prototypes, and follow-up tasks; add new ideas here instead of inline TODOs.

## License

MIT
