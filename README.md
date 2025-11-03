# Hacker Reader

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

![Hacker Reader Cover](assets/repo/cover-light.png)

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
- **Web preview & landing** – A Next.js App Router site that showcases the app with a dark/light marketing experience.

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
├── api-docs/                # Reference material and integration notes
├── package.json             # Root scripts and tooling
├── pnpm-workspace.yaml      # Workspace definition
└── tsconfig.base.json       # Shared TypeScript configuration
```

## Getting Started

### Prerequisites

- Node.js 18 or newer
- pnpm 8+
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

- For focused checks: `pnpm --filter <workspace> <command>`.
- Track follow-up tasks in `todo/` rather than leaving `TODO` comments in code.

## Apps

### Mobile App (Expo)

**Package**: `@hn/mobile`

- **Platform**: iOS (Android support coming soon)
- **Framework**: Expo SDK 54 with React Compiler, Expo Router, and React Native 0.81
- **Features**: FlashList-driven feeds, story detail screens, bookmarks, search, and threaded comments
- **Authentication**: Secure HN account login via in-app WebView with vote/favorite/comment capabilities
- **Theming**: System-aware dark mode with persisted preferences, custom color palettes, and glass effects
- **Home Screen Widgets**: Three widget sizes (small/medium/large) displaying Top Stories with auto-updates every 30 minutes, deep linking to stories, and offline support via cached data

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

## Architecture Notes

- React Query powers all data access with tuned stale/gc timings, optimistic updates for bookmarks, and intelligent caching.
- Mobile theming, authentication state, and session management live in dedicated React Context providers to keep screens lightweight.
- Write operations enforce HTTPS, rate limits, and HTML token parsing before hitting Hacker News, preventing leaked cookies and hard-to-debug failures.
- Everything compiles against `tsconfig.base.json`, ensuring editor tooling, path alias (`@/`), and strict options stay in sync.

## Docs & Roadmap

- `api-docs/` – in-progress reference material for Hacker News endpoints, Algolia search, and authentication flows.
- `todo/` – backlog notes, prototypes, and follow-up tasks; add new ideas here instead of inline TODOs.

## License

This project is open source under the [MIT License](LICENSE).
