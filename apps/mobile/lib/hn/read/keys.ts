import type { StoryCategory } from "../constants";
import type { SearchOptions } from "./search-params";

/**
 * Query-key factory: the only place query-key literals live. Return types are
 * mutable tuples because React Query's generics expect that.
 */
export const hnKeys = {
  /** Prefix matching every category's story list (for invalidation). */
  allStories: (): ["stories"] => ["stories"],
  stories: (category: StoryCategory): ["stories", StoryCategory] => [
    "stories",
    category,
  ],
  item: (id: number): ["item", number] => ["item", id],
  story: (id: number): ["story", number] => ["story", id],
  user: (username: string | null): ["user", string | null] => [
    "user",
    username,
  ],
  submissions: (
    ids: number[] | undefined
  ): ["submissions", number[] | undefined] => ["submissions", ids],
  ogMetadata: (
    url: string | undefined
  ): ["og-metadata", string | undefined] => ["og-metadata", url],
  /** Every param that changes the results is part of the key. */
  search: (
    query: string,
    options: SearchOptions
  ): ["algolia-search", string, SearchOptions] => [
    "algolia-search",
    query,
    options,
  ],
  /** Parent story id resolved for a comment (submissions screen). */
  commentStory: (commentId: number): ["comment-story-id", number] => [
    "comment-story-id",
    commentId,
  ],
  votes: (): ["votes"] => ["votes"],
  /** Bookmarked story ids; also the prefix of every bookmark query. */
  bookmarks: (): ["bookmarks"] => ["bookmarks"],
  bookmarkedStories: (): ["bookmarks", "stories"] => ["bookmarks", "stories"],
  hidden: (): ["hidden-stories"] => ["hidden-stories"],
  readStories: (): ["read-stories"] => ["read-stories"],
  blockedUsers: (): ["blockedUsers"] => ["blockedUsers"],
  searchOptions: (): ["search-options"] => ["search-options"],
  recentSearches: (): ["recent-searches"] => ["recent-searches"],
};
