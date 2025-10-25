# Repository Guidelines

## Project Structure & Module Organization
- Root uses a pnpm workspace; shared TypeScript config lives in `tsconfig.base.json`.
- `apps/mobile/` runs Expo Router. Screens sit under `app/(tabs)/`, shared views in `components/`, and APIs in `lib/`.
- `apps/web/` is a Next.js App Router app rooted in `app/` with Tailwind config in `tailwind.config.ts` and shared UI in `app/(components)/`.
- `packages/shared/` exposes API clients, types, and utilities reused by both apps via the `@hn/shared` alias.
- `api-docs/` hosts reference material; `todo/` tracks backlog notes and experiments.

## Build, Test, and Development Commands
- `pnpm install`: bootstrap all workspaces.
- `pnpm dev`: run web and mobile dev servers concurrently (Expo + Next.js).
- `pnpm mobile` / `pnpm web`: focus on a single app; pair with `mobile:ios`, `mobile:android`, or `web:build` as needed.
- `pnpm typecheck` / `pnpm shared:typecheck`: run TypeScript validation across the monorepo or the shared package only.
- `pnpm lint` / `pnpm mobile:lint`: enforce ESLint rules on every workspace or the Expo app.
- `pnpm clean` and `pnpm reset`: clear build caches or perform a full reinstall when dependencies drift.

## Coding Style & Naming Conventions
- TypeScript everywhere; keep strict typings and favor explicit return types on exported functions.
- Follow the existing two-space indentation and trailing comma style enforced by ESLint.
- Name React components with PascalCase, hooks with `use*`, files and directories with kebab-case (e.g., `story-card.tsx`).
- Reuse shared logic via `@hn/shared` and Expo aliases like `@/components`; avoid relative import ladders.
- Prefer functional React patterns—React Compiler is enabled, so skip manual memoization utilities.

## Testing Guidelines
- A dedicated automated test suite is not configured yet; always run `pnpm typecheck` and `pnpm lint`, then smoke-test both apps (`pnpm mobile`, `pnpm web`) before submitting.
- When adding tests, colocate them with the code under `__tests__/` or `*.test.ts` files and wire an accompanying workspace script (e.g., `pnpm --filter @hn/mobile test`). Document new commands in your PR.
- Provide emulator or browser verification notes for user-facing changes and mention any known edge cases.

## Commit & Pull Request Guidelines
- Commits follow an imperative tone with focused scope (e.g., `Refactor story fetching and enhance UI components`). Keep summaries under ~70 characters.
- Before pushing, ensure linting, type checks, and relevant dev builds pass. Include screenshots or screen recordings for UI tweaks in mobile or web.
- Reference related issues in the PR description, outline testing evidence, and note any follow-up tasks in `todo/` instead of leaving TODO comments in code.
- For cross-workspace changes, describe how each package was affected and flag any necessary reset commands (`pnpm reset`).
