import { useEffect, useRef, useState } from "react";

import { useReadStories } from "@/hooks/use-read-stories";
import {
  maxCommentId,
  type ReadStoryEntry,
  type StoryWithComments,
} from "@/lib/hn";

/**
 * Records that a story was opened and returns the entry from BEFORE this
 * visit (undefined on a first visit, or until the stored list has loaded), so
 * "new comment" markers stay put while the stored state moves on. The visit is
 * recorded again when a refresh brings in newer comments, without touching the
 * snapshot. Does nothing inside a peek preview.
 */
export function useStoryVisit(
  story: StoryWithComments,
  isInsidePreview: boolean
) {
  const { isLoaded, getEntry, recordVisit } = useReadStories();
  const [previous, setPrevious] = useState<ReadStoryEntry | undefined>();
  const snapshotTaken = useRef(false);

  const latestCommentId = maxCommentId(story.comments);
  const commentCount = story.descendants || 0;

  useEffect(() => {
    if (isInsidePreview || !isLoaded) return;
    if (!snapshotTaken.current) {
      snapshotTaken.current = true;
      setPrevious(getEntry(story.id));
    }
    recordVisit({
      id: story.id,
      commentCount,
      maxCommentId: latestCommentId,
    });
    // getEntry/recordVisit change identity every render; the snapshot is
    // taken once and a visit is recorded per change of the story's numbers.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [isInsidePreview, isLoaded, story.id, commentCount, latestCommentId]);

  return previous;
}
