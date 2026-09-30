import { collapseWhitespace, decodeEntities } from "./text";

/** Elements whose whole content is noise for reading. */
const SKIP_ELEMENTS = new Set([
  "script",
  "style",
  "noscript",
  "svg",
  "template",
  "iframe",
  "head",
  "nav",
  "footer",
  "aside",
  "form",
  "button",
  "select",
  "dialog",
]);

const BLOCK_ELEMENTS = new Set([
  "p",
  "div",
  "br",
  "li",
  "ul",
  "ol",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "tr",
  "section",
  "article",
  "main",
  "header",
  "blockquote",
  "pre",
  "table",
  "hr",
  "figure",
  "figcaption",
  "dd",
  "dt",
]);

/** Below this many words a region is not treated as "the article". */
const MIN_REGION_WORDS = 100;
/** Below this many words in total there is nothing worth summarising. */
const MIN_ARTICLE_WORDS = 80;

export const MAX_ARTICLE_WORDS = 6000;

export interface ExtractedArticle {
  text: string;
  truncated: boolean;
}

const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length;

/**
 * Linear, regex-light scan (no backtracking on adversarial markup): text from
 * the page, the longest `<article>`, and `<main>`, all with skipped elements
 * removed and block elements turned into line breaks.
 */
function collectRegions(html: string) {
  const all: string[] = [];
  const main: string[] = [];
  const articles: string[][] = [];
  let articleDepth = 0;
  let mainDepth = 0;
  let current: string[] | null = null;
  let skipName: string | null = null;
  let skipDepth = 0;

  const emit = (text: string) => {
    all.push(text);
    if (mainDepth > 0) main.push(text);
    if (current) current.push(text);
  };

  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf("<", i);
    if (lt === -1) {
      if (!skipName) emit(html.slice(i));
      break;
    }
    if (lt > i && !skipName) emit(html.slice(i, lt));

    if (html.startsWith("<!--", lt)) {
      const end = html.indexOf("-->", lt + 4);
      if (end === -1) break;
      i = end + 3;
      continue;
    }
    const gt = html.indexOf(">", lt);
    if (gt === -1) break;
    const tag = html.slice(lt + 1, gt);
    i = gt + 1;

    const match = /^(\/?)([a-zA-Z][a-zA-Z0-9]*)/.exec(tag);
    if (!match) {
      // `<!doctype>`, `<?xml ?>` are dropped; a stray "<" is text.
      if (!/^[!?]/.test(tag) && !skipName) emit(`<${tag}>`);
      continue;
    }
    const closing = match[1] === "/";
    const name = (match[2] ?? "").toLowerCase();
    const selfClosing = tag.endsWith("/");

    if (skipName) {
      if (name === skipName && !selfClosing) {
        skipDepth += closing ? -1 : 1;
        if (skipDepth === 0) skipName = null;
      }
      continue;
    }
    if (SKIP_ELEMENTS.has(name) && !closing && !selfClosing) {
      skipName = name;
      skipDepth = 1;
      continue;
    }

    if (name === "article") {
      if (!closing) {
        if (articleDepth === 0) {
          current = [];
          articles.push(current);
        }
        articleDepth++;
      } else if (articleDepth > 0) {
        articleDepth--;
        if (articleDepth === 0) current = null;
      }
    } else if (name === "main") {
      mainDepth = closing ? Math.max(0, mainDepth - 1) : mainDepth + 1;
    }

    if (BLOCK_ELEMENTS.has(name)) emit("\n");
  }

  return { all: all.join(""), main: main.join(""), articles };
}

/** Keeps at most `maxWords` words, cutting on a paragraph boundary when it can. */
export function capWords(text: string, maxWords: number): ExtractedArticle {
  const kept: string[] = [];
  let words = 0;
  for (const paragraph of text.split("\n\n")) {
    const tokens = paragraph.split(/\s+/).filter(Boolean);
    if (words + tokens.length > maxWords) {
      const room = maxWords - words;
      if (room > 0) kept.push(`${tokens.slice(0, room).join(" ")}…`);
      return { text: kept.join("\n\n"), truncated: true };
    }
    kept.push(paragraph);
    words += tokens.length;
  }
  return { text, truncated: false };
}

/**
 * Readable text from an HTML page: prefers the longest `<article>`, then
 * `<main>`, then the whole body, capped at `maxWords`. Null when the page has
 * too little text (paywall, app shell, image).
 */
export function extractArticleText(
  html: string,
  maxWords: number = MAX_ARTICLE_WORDS
): ExtractedArticle | null {
  const regions = collectRegions(html);
  const clean = (raw: string) => collapseWhitespace(decodeEntities(raw));

  let best = "";
  for (const parts of regions.articles) {
    const candidate = clean(parts.join(""));
    if (candidate.length > best.length) best = candidate;
  }
  if (countWords(best) < MIN_REGION_WORDS) {
    const main = clean(regions.main);
    best = countWords(main) >= MIN_REGION_WORDS ? main : clean(regions.all);
  }
  if (countWords(best) < MIN_ARTICLE_WORDS) return null;
  return capWords(best, maxWords);
}
