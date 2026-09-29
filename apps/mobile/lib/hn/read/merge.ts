import type { AlgoliaComment, Comment, HNItem } from "../types";

export function convertHNItemToComment(hnItem: HNItem): Comment | null {
  if (hnItem.deleted || hnItem.dead || !hnItem.by || !hnItem.text) {
    return null;
  }

  return {
    id: hnItem.id,
    by: hnItem.by,
    time: hnItem.time ?? 0,
    text: hnItem.text,
    children: [],
  };
}

export function convertAlgoliaComment(
  algoliaComment: AlgoliaComment
): Comment | null {
  if (!algoliaComment.author || !algoliaComment.text) {
    return null;
  }

  const convertedChildren = algoliaComment.children
    .map(convertAlgoliaComment)
    .filter((c): c is Comment => c !== null);

  return {
    id: algoliaComment.id,
    by: algoliaComment.author,
    time: algoliaComment.created_at_i,
    text: algoliaComment.text,
    children: convertedChildren,
  };
}

function collectAlgoliaCommentIds(comments: AlgoliaComment[]): Set<number> {
  const ids = new Set<number>();

  function traverse(comment: AlgoliaComment) {
    ids.add(comment.id);
    comment.children.forEach(traverse);
  }

  comments.forEach(traverse);
  return ids;
}

// Only top-level kids: nested HN fetches are sequential and too slow
// (hundreds of comments -> tens of seconds). Deleted nested comments are rare.
function filterAlgoliaCommentsByHNKids(
  comments: AlgoliaComment[],
  hnKids: number[]
): AlgoliaComment[] {
  const hnKidsSet = new Set(hnKids);
  return comments.filter((comment) => hnKidsSet.has(comment.id));
}

export interface AlgoliaMerge {
  comments: Comment[];
  missingIds: number[];
}

/**
 * Pure part of the story merge: which Algolia top-level comments survive the
 * Firebase `kids` filter, their converted form, and which Firebase kids have
 * no Algolia counterpart and must be fetched individually.
 */
export function mergeAlgoliaWithHNKids(
  algoliaChildren: AlgoliaComment[],
  hnKids: number[] | undefined
): AlgoliaMerge {
  const kids = hnKids ?? [];
  const filtered = filterAlgoliaCommentsByHNKids(algoliaChildren, kids);

  const comments = filtered
    .map(convertAlgoliaComment)
    .filter((c): c is Comment => c !== null);

  const present = collectAlgoliaCommentIds(filtered);
  const missingIds = kids.filter((kidId) => !present.has(kidId));

  return { comments, missingIds };
}
