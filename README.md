# Hacker News Client - Monorepo

A modern Hacker News client built as a **pnpm monorepo** with both a React Native (Expo) mobile app and a Next.js web app, sharing common code through workspace packages.

## 📁 Project Structure

```
hn-client/
├── apps/
│   ├── mobile/          # Expo React Native app (iOS/Android)
│   └── web/             # Next.js web app
├── packages/
│   └── shared/          # Shared utilities, types, and API clients
├── package.json         # Root workspace configuration
├── pnpm-workspace.yaml  # Workspace definition
└── tsconfig.base.json   # Shared TypeScript config
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and pnpm 8+
- For mobile: Xcode (iOS) or Android Studio (Android)

### Installation

```bash
# Install all dependencies (runs in all workspaces)
pnpm install
```

## 📱 Mobile App (Expo)

The mobile app is built with Expo Router and React Native.

### Development

```bash
# Start Expo dev server
pnpm mobile

# Run on iOS simulator
pnpm mobile:ios

# Run on Android emulator
pnpm mobile:android

# Lint mobile code
pnpm mobile:lint
```

### Features
- 📰 Browse Top, New, Ask, Show, and Jobs stories
- 💬 View comments with collapsible threads
- 🔖 Bookmark stories (persisted locally)
- 🔍 Search stories via Algolia
- 🎨 Dark mode support
- ⚡️ Infinite scrolling with React Query
- 🖼️ Link previews with Open Graph metadata

### Tech Stack
- Expo SDK 54 with React Native 0.81
- Expo Router for file-based navigation
- React Query for data fetching
- FlashList for performant lists
- TypeScript

## 🌐 Web App (Next.js)

The web app is built with Next.js 15 (App Router) and Tailwind CSS.

### Development

```bash
# Start Next.js dev server
pnpm web

# Build for production
pnpm web:build

# Start production server
pnpm web:start

# Lint web code
pnpm web:lint
```

### Features
- 📰 Browse Hacker News stories
- 🎨 Responsive design with Tailwind CSS
- ⚡️ Server-side rendering and static generation
- 📦 Uses shared API clients from `@hn/shared`

### Tech Stack
- Next.js 15 with App Router
- React 19
- Tailwind CSS
- React Query
- TypeScript

## 📦 Shared Package

The `@hn/shared` package contains code shared between mobile and web:

### What's Included
- **API Clients**: Hacker News API, Algolia search, Open Graph metadata
- **Types**: HNItem, HNUser, AlgoliaStory, etc.
- **Utilities**: HTML parsing, time formatting, URL extraction

### Structure
```
packages/shared/src/
├── api/          # API clients (hn-api, algolia-api, og-api)
├── types/        # Shared TypeScript types
├── utils/        # Utility functions
└── index.ts      # Main entry point
```

### Usage

```typescript
// Import from the shared package in any app
import { getTopStories, type HNItem, timeAgo } from '@hn/shared';
```

## 🛠️ Development Scripts

### Root Commands
```bash
# Run type checking across all packages
pnpm typecheck

# Run linting across all packages
pnpm lint

# Clean all build artifacts and node_modules
pnpm clean

# Full reset (clean + reinstall)
pnpm reset
```

### Workspace Commands
```bash
# Run typecheck in shared package only
pnpm shared:typecheck

# Filter commands to specific workspaces
pnpm --filter @hn/mobile <command>
pnpm --filter @hn/web <command>
pnpm --filter @hn/shared <command>
```

## 🏗️ Architecture

### Data Fetching Strategy
Both apps use React Query with identical configuration:
- 5-minute stale time
- 10-minute garbage collection
- No refetch on window focus
- Shared cache keys for consistency

### Code Sharing Philosophy
- ✅ **Shared**: API clients, types, utility functions, business logic
- ❌ **Not Shared**: UI components (platform-specific)
- 🔄 **Future**: Could add `@hn/ui` package for truly cross-platform components

### Monorepo Benefits
- **Single source of truth** for API clients and types
- **Consistent data fetching** across platforms
- **Unified TypeScript configuration**
- **Simplified dependency management**
- **Atomic commits** across mobile and web

## 📝 Adding New Features

### To Add a New API Endpoint

1. Add the function to `packages/shared/src/api/`
2. Export it from `packages/shared/src/index.ts`
3. Use it in mobile (`apps/mobile/`) or web (`apps/web/`)

### To Add a New Shared Utility

1. Add the utility to `packages/shared/src/utils/`
2. Export it from the utils index
3. Use it across both apps

## 🔧 Troubleshooting

### Workspace Dependencies Not Resolving
```bash
pnpm install
```

### Mobile App Build Issues
```bash
cd apps/mobile
rm -rf node_modules .expo
cd ../..
pnpm install
```

### TypeScript Errors
```bash
pnpm typecheck
```

## 📄 License

MIT

## 🙏 Acknowledgments

- [Hacker News API](https://github.com/HackerNews/API)
- [Algolia HN Search](https://hn.algolia.com/api)
