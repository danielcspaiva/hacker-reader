import AsyncStorage from '@react-native-async-storage/async-storage';

const BOOKMARKS_KEY = '@hn_bookmarks';

export interface BookmarkedStory {
  id: number;
  bookmarkedAt: number; // timestamp
}

/**
 * Get all bookmarked story IDs sorted by most recently bookmarked
 */
export async function getBookmarks(): Promise<BookmarkedStory[]> {
  try {
    const data = await AsyncStorage.getItem(BOOKMARKS_KEY);
    if (!data) return [];

    const bookmarks = JSON.parse(data) as BookmarkedStory[];
    // Sort by most recently bookmarked first
    return bookmarks.sort((a, b) => b.bookmarkedAt - a.bookmarkedAt);
  } catch (error) {
    console.error('Error getting bookmarks:', error);
    return [];
  }
}

/**
 * Add a story to bookmarks
 */
export async function addBookmark(storyId: number): Promise<void> {
  try {
    const bookmarks = await getBookmarks();

    // Check if already bookmarked
    if (bookmarks.some(b => b.id === storyId)) {
      return;
    }

    const newBookmark: BookmarkedStory = {
      id: storyId,
      bookmarkedAt: Date.now(),
    };

    const updatedBookmarks = [newBookmark, ...bookmarks];
    await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updatedBookmarks));
  } catch (error) {
    console.error('Error adding bookmark:', error);
    throw error;
  }
}

/**
 * Remove a story from bookmarks
 */
export async function removeBookmark(storyId: number): Promise<void> {
  try {
    const bookmarks = await getBookmarks();
    const filtered = bookmarks.filter(b => b.id !== storyId);
    await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing bookmark:', error);
    throw error;
  }
}

/**
 * Remove all bookmarks
 */
export async function clearBookmarks(): Promise<void> {
  try {
    await AsyncStorage.removeItem(BOOKMARKS_KEY);
  } catch (error) {
    console.error('Error clearing bookmarks:', error);
    throw error;
  }
}

/**
 * Check if a story is bookmarked
 */
export async function isBookmarked(storyId: number): Promise<boolean> {
  try {
    const bookmarks = await getBookmarks();
    return bookmarks.some(b => b.id === storyId);
  } catch (error) {
    console.error('Error checking bookmark:', error);
    return false;
  }
}

/**
 * Get bookmarked story IDs only (for simpler queries)
 */
export async function getBookmarkIds(): Promise<number[]> {
  const bookmarks = await getBookmarks();
  return bookmarks.map(b => b.id);
}
