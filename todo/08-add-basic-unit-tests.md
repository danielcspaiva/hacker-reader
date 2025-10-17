# Add Basic Unit Tests

**Priority**: Short Term (High Impact, Medium Effort)
**Category**: Code Quality / Best Practices
**Estimated Time**: 2-3 hours

## Problem

The codebase currently has **zero test coverage**. This means:

- No automated verification of functionality
- Regressions can slip through unnoticed
- Refactoring is risky
- No documentation of expected behavior
- Hard to onboard new developers

**High-value test candidates**:
- Utility functions (timeAgo, parseHTMLWithLinks, getDomain)
- API functions (typed responses, error handling)
- Custom hooks (data transformation logic)

## Solution

Set up Jest testing infrastructure and add tests for critical utilities and functions.

### Implementation Steps

#### 1. Install Testing Dependencies

```bash
pnpm add -D jest @testing-library/react-native @testing-library/jest-native @types/jest jest-expo
```

#### 2. Create Jest Configuration

**File**: `jest.config.js`

```javascript
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@shopify/flash-list)',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
```

#### 3. Create Jest Setup File

**File**: `jest.setup.js`

```javascript
import '@testing-library/jest-native/extend-expect';

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  Stack: {
    Screen: 'Screen',
  },
}));

// Mock expo-web-browser
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
}));

// Silence console errors during tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};
```

#### 4. Update package.json

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

#### 5. Create Time Utility Tests

**File**: `lib/utils/__tests__/time.test.ts`

```typescript
import { timeAgo } from '../time';

describe('timeAgo', () => {
  beforeEach(() => {
    // Mock Date.now to return consistent timestamp
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000); // Nov 14, 2023
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return minutes for times less than 1 hour ago', () => {
    const thirtyMinutesAgo = 1700000000 - 30 * 60; // 30 minutes
    expect(timeAgo(thirtyMinutesAgo)).toBe('30m ago');
  });

  it('should return hours for times less than 1 day ago', () => {
    const fiveHoursAgo = 1700000000 - 5 * 60 * 60; // 5 hours
    expect(timeAgo(fiveHoursAgo)).toBe('5h ago');
  });

  it('should return days for times more than 1 day ago', () => {
    const threeDaysAgo = 1700000000 - 3 * 24 * 60 * 60; // 3 days
    expect(timeAgo(threeDaysAgo)).toBe('3d ago');
  });

  it('should handle edge case: exactly 1 hour', () => {
    const oneHourAgo = 1700000000 - 60 * 60;
    expect(timeAgo(oneHourAgo)).toBe('1h ago');
  });

  it('should handle edge case: exactly 1 day', () => {
    const oneDayAgo = 1700000000 - 24 * 60 * 60;
    expect(timeAgo(oneDayAgo)).toBe('1d ago');
  });

  it('should handle very recent times (0 minutes)', () => {
    const now = 1700000000;
    expect(timeAgo(now)).toBe('0m ago');
  });

  it('should handle old timestamps (365 days)', () => {
    const oneYearAgo = 1700000000 - 365 * 24 * 60 * 60;
    expect(timeAgo(oneYearAgo)).toBe('365d ago');
  });
});
```

#### 6. Create HTML Utility Tests

**File**: `lib/utils/__tests__/html.test.ts`

```typescript
import { parseHTMLWithLinks } from '../html';

describe('parseHTMLWithLinks', () => {
  it('should return null for undefined input', () => {
    expect(parseHTMLWithLinks(undefined)).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(parseHTMLWithLinks('')).toBeNull();
  });

  it('should parse plain text without links', () => {
    const html = 'This is plain text';
    const result = parseHTMLWithLinks(html);

    expect(result).toEqual([
      { type: 'text', content: 'This is plain text' }
    ]);
  });

  it('should parse text with a link', () => {
    const html = 'Check out <a href="https://example.com">this link</a> here';
    const result = parseHTMLWithLinks(html);

    expect(result).toEqual([
      { type: 'text', content: 'Check out ' },
      { type: 'link', content: 'this link', url: 'https://example.com' },
      { type: 'text', content: ' here' }
    ]);
  });

  it('should parse multiple links', () => {
    const html = 'First <a href="https://one.com">link</a> and second <a href="https://two.com">link</a>';
    const result = parseHTMLWithLinks(html);

    expect(result).toHaveLength(5);
    expect(result![1]).toEqual({ type: 'link', content: 'link', url: 'https://one.com' });
    expect(result![3]).toEqual({ type: 'link', content: 'link', url: 'https://two.com' });
  });

  it('should convert paragraph tags to newlines', () => {
    const html = 'First paragraph<p>Second paragraph';
    const result = parseHTMLWithLinks(html);

    expect(result![0].content).toContain('\n\n');
  });

  it('should decode HTML entities', () => {
    const html = 'A &amp; B &quot;quoted&quot; &#x2F; &#x27;';
    const result = parseHTMLWithLinks(html);

    expect(result![0].content).toBe('A & B "quoted" / \'');
  });

  it('should handle links with encoded entities in URL', () => {
    const html = '<a href="https://example.com&#x2F;path">link</a>';
    const result = parseHTMLWithLinks(html);

    expect(result![0]).toEqual({
      type: 'link',
      content: 'link',
      url: 'https://example.com/path'
    });
  });

  it('should remove italic tags', () => {
    const html = 'This is <i>italic</i> text';
    const result = parseHTMLWithLinks(html);

    expect(result![0].content).toBe('This is italic text');
  });

  it('should handle complex HN comment HTML', () => {
    const html = 'Great article!<p>Check out <a href="https://news.ycombinator.com">HN</a> for more.<p>What do you think?';
    const result = parseHTMLWithLinks(html);

    expect(result).toContain(
      expect.objectContaining({ type: 'link', url: 'https://news.ycombinator.com' })
    );
    expect(result![0].content).toContain('Great article!');
  });
});
```

#### 7. Create URL Utility Tests

**File**: `lib/utils/__tests__/url.test.ts`

```typescript
import { getDomain } from '../url';

describe('getDomain', () => {
  it('should return null for undefined', () => {
    expect(getDomain(undefined)).toBeNull();
  });

  it('should extract domain from simple URL', () => {
    expect(getDomain('https://example.com')).toBe('example.com');
  });

  it('should remove www. prefix', () => {
    expect(getDomain('https://www.example.com')).toBe('example.com');
  });

  it('should handle URLs with paths', () => {
    expect(getDomain('https://example.com/path/to/page')).toBe('example.com');
  });

  it('should handle URLs with query params', () => {
    expect(getDomain('https://example.com?param=value')).toBe('example.com');
  });

  it('should handle URLs with ports', () => {
    expect(getDomain('https://example.com:8080')).toBe('example.com');
  });

  it('should handle subdomains', () => {
    expect(getDomain('https://blog.example.com')).toBe('blog.example.com');
  });

  it('should handle www with subdomain', () => {
    expect(getDomain('https://www.blog.example.com')).toBe('blog.example.com');
  });

  it('should return null for invalid URL', () => {
    expect(getDomain('not a url')).toBeNull();
  });

  it('should handle different protocols', () => {
    expect(getDomain('http://example.com')).toBe('example.com');
    expect(getDomain('ftp://example.com')).toBe('example.com');
  });
});
```

#### 8. Create API Tests

**File**: `lib/__tests__/hn-api.test.ts`

```typescript
import { getTopStories, getItem, getItems } from '../hn-api';

// Mock global fetch
global.fetch = jest.fn();

describe('hn-api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTopStories', () => {
    it('should fetch and slice top stories', async () => {
      const mockIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockIds,
      });

      const result = await getTopStories(0, 5);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://hacker-news.firebaseio.com/v0/topstories.json'
      );
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle offset and limit', async () => {
      const mockIds = Array.from({ length: 100 }, (_, i) => i + 1);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockIds,
      });

      const result = await getTopStories(30, 30);

      expect(result).toEqual(mockIds.slice(30, 60));
      expect(result).toHaveLength(30);
    });
  });

  describe('getItem', () => {
    it('should fetch item by ID', async () => {
      const mockItem = {
        id: 123,
        title: 'Test Story',
        by: 'testuser',
        score: 100,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockItem,
      });

      const result = await getItem(123);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://hacker-news.firebaseio.com/v0/item/123.json'
      );
      expect(result).toEqual(mockItem);
    });

    it('should throw error on failed fetch', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(getItem(999)).rejects.toThrow('API error: 404');
    });
  });

  describe('getItems', () => {
    it('should fetch multiple items in parallel', async () => {
      const mockItems = [
        { id: 1, title: 'Story 1' },
        { id: 2, title: 'Story 2' },
        { id: 3, title: 'Story 3' },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockItems[0] })
        .mockResolvedValueOnce({ ok: true, json: async () => mockItems[1] })
        .mockResolvedValueOnce({ ok: true, json: async () => mockItems[2] });

      const result = await getItems([1, 2, 3]);

      expect(result).toEqual(mockItems);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });
});
```

#### 9. Run Tests

```bash
# Run all tests
pnpm test

# Run in watch mode
pnpm test:watch

# Generate coverage report
pnpm test:coverage
```

## Files to Create

- `jest.config.js`
- `jest.setup.js`
- `lib/utils/__tests__/time.test.ts`
- `lib/utils/__tests__/html.test.ts`
- `lib/utils/__tests__/url.test.ts`
- `lib/__tests__/hn-api.test.ts`

## Files to Modify

- `package.json` (add test scripts)

## Expected Coverage

After completing these tests:
- **Utility functions**: 100% coverage
- **API functions**: 80%+ coverage
- **Overall**: 40-50% coverage (good starting point)

## Benefits

- Confidence in refactoring
- Catch regressions early
- Documentation of expected behavior
- Faster debugging
- Easier code reviews

## Testing Checklist

- [ ] All tests pass
- [ ] Coverage report generates
- [ ] Tests run in CI/CD (future)
- [ ] Edge cases covered
- [ ] Error cases tested
- [ ] Mocks work correctly

## Future Test Additions

Once basic tests are in place, add:

1. **Component tests**: StoryCard, LinkPreview, Comment
2. **Hook tests**: useStories, useStory, useOGMetadata
3. **Integration tests**: Full user flows
4. **E2E tests**: Critical paths with Detox
5. **Snapshot tests**: Component rendering

## Useful Test Commands

```bash
# Run specific test file
pnpm test time.test.ts

# Run tests matching pattern
pnpm test --testNamePattern="timeAgo"

# Update snapshots (when adding snapshot tests)
pnpm test -- -u

# Run with verbose output
pnpm test --verbose

# Clear cache
pnpm test --clearCache
```
