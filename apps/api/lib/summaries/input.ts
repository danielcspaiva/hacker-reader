import type { JsonValue } from "../json";
import { isFiniteNumber, isJsonObject, isString } from "../json";
import type { ExtractedArticle } from "./article-extract";
import { commentHtmlToText, escapeForPrompt, truncateChars } from "./text";

/** Approximate tokens from characters (good enough for a budget). */
export const estimateTokens = (chars: number) => Math.ceil(chars / 4);

export const COMMENT_TOKEN_BUDGET = 25_000;
const COMMENT_CHAR_CAP = 2000;
/** Per-comment framing (tag, ids) in the prompt, in tokens. */
const COMMENT_OVERHEAD_TOKENS = 12;
const STORY_TEXT_CHAR_CAP = 6000;
const MAX_TREE_DEPTH = 400;

export interface CommentNode {
  id: number;
  /** Plain text; empty for deleted/dead comments. */
  text: string;
  children: CommentNode[];
}

export interface StoryData {
  id: number;
  type: string;
  title: string;
  url?: string;
  /** Plain text of an Ask HN / text post. */
  text?: string;
  points?: number;
  comments: CommentNode[];
}

function parseComment(value: JsonValue, depth: number): CommentNode | null {
  if (!isJsonObject(value) || !isFiniteNumber(value.id)) return null;
  const children: CommentNode[] = [];
  if (Array.isArray(value.children) && depth < MAX_TREE_DEPTH) {
    for (const child of value.children) {
      const parsed = parseComment(child, depth + 1);
      if (parsed) children.push(parsed);
    }
  }
  return {
    id: value.id,
    text: isString(value.text) ? commentHtmlToText(value.text) : "",
    children,
  };
}

/** Validates an Algolia `items/{id}` body into a story with its full comment tree. */
export function parseAlgoliaStory(body: JsonValue): StoryData | null {
  if (!isJsonObject(body) || !isFiniteNumber(body.id)) return null;
  const comments: CommentNode[] = [];
  if (Array.isArray(body.children)) {
    for (const child of body.children) {
      const parsed = parseComment(child, 1);
      if (parsed) comments.push(parsed);
    }
  }
  const story: StoryData = {
    id: body.id,
    type: isString(body.type) ? body.type : "story",
    title: isString(body.title) ? body.title : "",
    comments,
  };
  if (isString(body.url) && body.url) story.url = body.url;
  if (isString(body.text) && body.text) {
    const text = commentHtmlToText(body.text);
    if (text) story.text = text;
  }
  if (isFiniteNumber(body.points)) story.points = body.points;
  return story;
}

export interface SelectedComment {
  id: number;
  /** Nearest included ancestor; null for a top-level comment. */
  parentId: number | null;
  text: string;
}

export interface CommentSelection {
  selected: SelectedComment[];
  /** Live (non-empty) comments in the whole tree. */
  totalComments: number;
  tokens: number;
}

/**
 * Picks comments breadth-first across the whole tree (top-level threads in HN
 * rank order, then their replies, and so on) until `budgetTokens` is spent, so
 * every top-level thread is covered before any thread goes deep. Deleted
 * comments are skipped but their replies are still reached.
 */
export function selectComments(
  roots: CommentNode[],
  budgetTokens: number = COMMENT_TOKEN_BUDGET
): CommentSelection {
  interface Queued {
    node: CommentNode;
    parentId: number | null;
  }
  const selected: SelectedComment[] = [];
  let totalComments = 0;
  let tokens = 0;
  let full = false;

  const queue: Queued[] = roots.map((node) => ({ node, parentId: null }));
  for (let head = 0; head < queue.length; head++) {
    const { node, parentId } = queue[head]!;
    const hasText = node.text.length > 0;
    if (hasText) totalComments++;

    let keptId = parentId;
    if (hasText && !full) {
      const text = truncateChars(node.text, COMMENT_CHAR_CAP);
      const cost = estimateTokens(text.length) + COMMENT_OVERHEAD_TOKENS;
      if (tokens + cost > budgetTokens) {
        full = true;
      } else {
        tokens += cost;
        selected.push({ id: node.id, parentId, text });
        keptId = node.id;
      }
    }
    for (const child of node.children) {
      queue.push({ node: child, parentId: keptId });
    }
  }
  return { selected, totalComments, tokens };
}

export interface SummaryInput {
  /** The user message sent to the model. */
  content: string;
  /** Comment ids present in `content`; model citations are checked against it. */
  commentIds: Set<number>;
  /** Live comments in the whole thread (not only the ones included). */
  commentCount: number;
  hasArticle: boolean;
  /** True when there is an article or the story's own text to summarise. */
  hasSource: boolean;
}

/**
 * The user message. Everything here is untrusted public text, so it is
 * escaped (it cannot close our tags) and wrapped in labelled sections; the
 * system prompt tells the model to treat it as data only.
 */
export function buildSummaryInput(
  story: StoryData,
  article: ExtractedArticle | null,
  selection: CommentSelection
): SummaryInput {
  const parts: string[] = [];
  parts.push(`<story id="${story.id}">`);
  parts.push(`<title>${escapeForPrompt(story.title)}</title>`);
  if (story.url) parts.push(`<url>${escapeForPrompt(story.url)}</url>`);
  if (story.points !== undefined)
    parts.push(`<points>${story.points}</points>`);
  if (story.text) {
    parts.push(
      `<story_text>\n${escapeForPrompt(truncateChars(story.text, STORY_TEXT_CHAR_CAP))}\n</story_text>`
    );
  }
  parts.push("</story>");

  if (article) {
    const note = article.truncated ? ' truncated="true"' : "";
    parts.push(
      `<article${note}>\n${escapeForPrompt(article.text)}\n</article>`
    );
  }

  parts.push(
    `<comments included="${selection.selected.length}" total="${selection.totalComments}">`
  );
  for (const comment of selection.selected) {
    const parent =
      comment.parentId === null ? "" : ` reply_to="${comment.parentId}"`;
    parts.push(
      `<comment id="${comment.id}"${parent}>\n${escapeForPrompt(comment.text)}\n</comment>`
    );
  }
  parts.push("</comments>");

  return {
    content: parts.join("\n"),
    commentIds: new Set(selection.selected.map((comment) => comment.id)),
    commentCount: selection.totalComments,
    hasArticle: article !== null,
    hasSource: article !== null || Boolean(story.text),
  };
}
