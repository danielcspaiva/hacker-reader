/**
 * Centralized React Query key definitions
 *
 * All query keys used throughout the app are defined here to:
 * - Prevent key string drift between files
 * - Make cache invalidation patterns discoverable
 * - Enable type-safe query key references
 */

export const queryKeys = {
  stories: (category: string) => ["stories", category] as const,
  storiesPrefix: ["stories"] as const,
  story: (id: number) => ["story", id] as const,
  item: (id: number) => ["item", id] as const,
  ogMetadata: (url: string) => ["og-metadata", url] as const,
  votes: ["votes"] as const,
  bookmarks: {
    all: ["bookmarks"] as const,
    stories: ["bookmarks", "stories"] as const,
    check: (storyId: number) => ["bookmark", "check", storyId] as const,
  },
  hiddenItems: {
    stories: ["hidden-stories"] as const,
    comments: ["hidden-comments"] as const,
  },
  blockedUsers: ["blockedUsers"] as const,
  user: (id: string) => ["user", id] as const,
  submissions: (submittedIds: number[]) => ["submissions", submittedIds] as const,
  algoliaSearch: (query: string) => ["algolia-search", query] as const,
} as const;
