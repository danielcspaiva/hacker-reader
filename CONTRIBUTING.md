# Contributing to Hacker Reader

Thank you for your interest in contributing to Hacker Reader! This document provides guidelines and information for contributors.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Contribution Guidelines](#contribution-guidelines)
- [Contributor Benefits](#contributor-benefits)

---

## Code of Conduct

This project and everyone participating in it is expected to uphold a respectful and inclusive environment. We are committed to providing a welcoming experience for all contributors.

**Be respectful, be considerate, be constructive.**

---

## Getting Started

### Prerequisites
- Node.js 18 or newer
- pnpm 8+
- Xcode (for iOS development) or Android Studio (for Android)
- Git

### Fork and Clone

1. **Fork the repository** on GitHub
2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/hn-client.git
   cd hn-client
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/hn-client.git
   ```

---

## Development Setup

### Install Dependencies

```bash
pnpm install
```

### Run the Apps

```bash
# Run both mobile and web together
pnpm dev

# Mobile only
pnpm mobile        # Start Expo dev server
pnpm mobile:ios    # Launch iOS simulator
pnpm mobile:android # Launch Android emulator

# Web only
pnpm web           # Start Next.js dev server
```

### Monorepo Structure

```
hn-client/
├── apps/
│   ├── mobile/              # React Native + Expo app
│   │   ├── lib/
│   │   │   └── shared/      # HN API, auth, types, utilities
│   │   ├── hooks/           # React Query hooks
│   │   ├── components/      # UI components
│   │   └── app/             # Expo Router screens
│   └── web/                 # Next.js marketing site + AI backend (future)
└── docs/                    # Documentation
```

### Working with Shared Code

The mobile app contains all HN API clients, authentication, and utilities in `apps/mobile/lib/shared/`:

```typescript
// Import from shared library (mobile app only)
import { getTopStories, type HNItem } from '@/lib/shared/api'
import { SecureSession } from '@/lib/shared/auth'
import { timeAgo } from '@/lib/shared/utils'
```

The web app will have its own implementation when AI backend features are added.

---

## How to Contribute

### Reporting Bugs

**Before submitting a bug report:**
- Check existing issues to avoid duplicates
- Verify the bug exists in the latest version

**When creating a bug report, include:**
- Clear, descriptive title
- Steps to reproduce
- Expected behavior vs. actual behavior
- Screenshots/videos if applicable
- Device/platform information (iOS version, Android version, etc.)
- Relevant logs or error messages

### Suggesting Enhancements

We welcome feature suggestions! Please:
- Check existing issues/discussions first
- Provide clear use case and rationale
- Consider how it fits with project goals
- Be open to discussion and iteration

### Pull Requests

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   - Follow code style guidelines (below)
   - Write clear, descriptive commit messages
   - Add tests if applicable
   - Update documentation as needed

3. **Test thoroughly**:
   ```bash
   # Type checking
   pnpm typecheck

   # Linting
   pnpm lint

   # Run the apps
   pnpm mobile
   pnpm web
   ```

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "Add feature: brief description"
   ```

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request**:
   - Provide clear description of changes
   - Reference any related issues
   - Include screenshots/videos for UI changes
   - Ensure CI checks pass

---

## Contribution Guidelines

### Code Style

- **TypeScript**: Use strict typing, avoid `any`
- **Formatting**: 2-space indentation, trailing commas
- **Naming**:
  - Components: PascalCase (`StoryCard.tsx`)
  - Hooks: camelCase with `use` prefix (`useStories.ts`)
  - Constants: SCREAMING_SNAKE_CASE
  - Files: kebab-case for utilities, PascalCase for components

### Commit Messages

Use clear, descriptive commit messages:

```bash
# Good
git commit -m "Add AI summary button to story cards"
git commit -m "Fix crash when loading comments with deleted replies"
git commit -m "Refactor authentication context for better performance"

# Not ideal
git commit -m "fix bug"
git commit -m "updates"
git commit -m "WIP"
```

### React/React Native Best Practices

- **React Compiler is enabled** - No need for manual `useMemo`, `useCallback`, or `React.memo`
- Use functional components and hooks
- Prefer React Query for data fetching
- Use TypeScript interfaces for props
- Extract reusable logic into custom hooks
- Keep components small and focused

### File Organization

```
components/
  story-card.tsx           # Component implementation
  story-card.test.tsx      # Tests (if applicable)

hooks/
  use-stories.ts           # Custom hooks
  use-stories.test.ts      # Hook tests

lib/
  hn-api.ts                # API utilities
  og-api.ts                # External API clients
```

### Testing

- Manual testing required (no automated tests yet)
- Test on both iOS and Android when possible
- Verify dark mode support
- Check different screen sizes
- Test error states and edge cases

### Documentation

- Update README.md if changing project structure
- Add JSDoc comments for public APIs
- Update CLAUDE.md for architectural changes
- Include inline comments for complex logic

---

## Contributor Benefits

### Recognition

- Your name in the contributors list
- Credit in release notes for significant contributions

### Free Premium Access

As a thank you for contributing:
- **Bug fixes & improvements**: Free premium for 3 months
- **Significant features**: Free premium for 1 year
- **Regular contributors**: Permanent free premium access

Contact the maintainer after your PR is merged to claim your premium access!

### GitHub Sponsors

Support the project and get premium access:
- **$2/month**: Supporter badge, name in README
- **$5/month**: Premium features unlocked
- **$25/month**: Priority support, feature request priority
- **$100/month**: 1:1 consulting call (iOS/React Native questions)

---

## Areas We'd Love Help With

### High Priority
- 🐛 **Bug fixes** - Always appreciated!
- 📱 **Android testing** - Help us ensure feature parity
- 🎨 **UI/UX improvements** - Make it even more polished
- 📝 **Documentation** - Improve guides and examples
- ♿ **Accessibility** - VoiceOver, TalkBack, color contrast

### Future Features
- 🤖 **AI backend** - Help implement AI summarization (see monetization.md)
- 🔍 **Search improvements** - Better Algolia integration
- 📊 **Analytics** - Reading history, story tracking
- 🌍 **Internationalization** - Support multiple languages
- ⚙️ **Customization** - More themes, font sizes, layout options

### Nice to Have
- 🧪 **Testing** - Set up automated tests
- 🚀 **Performance** - Profile and optimize bottlenecks
- 📦 **CI/CD** - Improve build and deployment automation

---

## Questions?

- **General questions**: Open a discussion on GitHub
- **Bug reports**: Open an issue
- **Security issues**: Email directly (don't open public issue)
- **Feature ideas**: Open an issue or discussion

---

## License

By contributing to Hacker Reader, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

**Thank you for contributing to Hacker Reader!** 🎉

Every contribution, no matter how small, makes this project better for the entire Hacker News community.
