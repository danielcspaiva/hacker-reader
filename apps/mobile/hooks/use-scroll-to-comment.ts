import type { FlashListRef } from "@shopify/flash-list";
import { useEffect, useRef, useState, type RefObject } from "react";

const SCROLL_DELAY_MS = 350;
const HIGHLIGHT_MS = 2500;

/** Scrolls a comment row to just below the header. */
export function scrollToCommentRow<T>(
  listRef: RefObject<FlashListRef<T> | null>,
  index: number,
  topOffset: number
) {
  void listRef.current?.scrollToIndex({
    index,
    animated: true,
    viewPosition: 0,
    viewOffset: -topOffset,
  });
}

interface UseScrollToCommentOptions<T> {
  listRef: RefObject<FlashListRef<T> | null>;
  /** The `commentId` route param, if the screen was opened on a comment. */
  commentId: string | undefined;
  /** Where that comment sits in the list, or -1 while it is not there (yet). */
  index: number;
  /** Space to leave above the comment, to clear the header. */
  topOffset: number;
}

/**
 * Scrolls a deep-linked comment into view once, then highlights it briefly.
 * Returns the id to highlight (or null).
 */
export function useScrollToComment<T>({
  listRef,
  commentId,
  index,
  topOffset,
}: UseScrollToCommentOptions<T>) {
  const scrolledTo = useRef<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);

  useEffect(() => {
    if (!commentId || index < 0 || scrolledTo.current === commentId) return;
    const timer = setTimeout(() => {
      scrolledTo.current = commentId;
      scrollToCommentRow(listRef, index, topOffset);
      setHighlightedId(Number(commentId));
    }, SCROLL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [commentId, index, topOffset, listRef]);

  useEffect(() => {
    if (highlightedId === null) return;
    const timer = setTimeout(() => setHighlightedId(null), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [highlightedId]);

  return highlightedId;
}
