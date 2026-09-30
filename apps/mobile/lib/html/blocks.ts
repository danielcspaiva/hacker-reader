import { parseHTMLWithLinks } from "./parse";

/** An inline run inside a paragraph. A link always carries its url. */
export type Span =
  | { type: "text"; content: string }
  | { type: "link"; content: string; url: string }
  | { type: "code"; content: string };

/** A rendered chunk of a comment: prose, a `>` quote (marker removed) or a code block. */
export type Block =
  | { kind: "paragraph"; spans: Span[] }
  | { kind: "quote"; spans: Span[] }
  | { kind: "code"; content: string };

const BARE_URL = /(https?:\/\/[^\s<>"]*[^\s<>".,;:!?)\]'])/;

/** Splits text on bare URLs so they become links. */
function pushText(spans: Span[], segment: string) {
  segment.split(BARE_URL).forEach((piece, index) => {
    if (!piece) return;
    if (index % 2 === 1) {
      spans.push({ type: "link", content: piece, url: piece });
    } else {
      spans.push({ type: "text", content: piece });
    }
  });
}

function stripQuote(spans: Span[]): Span[] | null {
  const [first, ...rest] = spans;
  if (first?.type !== "text") return null;
  const trimmed = first.content.trimStart();
  if (!trimmed.startsWith(">")) return null;
  return [{ type: "text", content: trimmed.replace(/^>\s?/, "") }, ...rest];
}

/** Drops leading and trailing whitespace from the first and last text span. */
function trimEdges(spans: Span[]): Span[] {
  return spans.map((span, index) => {
    if (span.type !== "text") return span;
    let content = span.content;
    if (index === 0) content = content.trimStart();
    if (index === spans.length - 1) content = content.trimEnd();
    return { ...span, content };
  });
}

function buildBlocks(html: string): Block[] {
  const parts = parseHTMLWithLinks(html);
  if (!parts) return [];

  const blocks: Block[] = [];
  let spans: Span[] = [];

  const flush = () => {
    if (spans.some((span) => span.content.trim())) {
      const quoted = stripQuote(spans);
      blocks.push(
        quoted
          ? { kind: "quote", spans: trimEdges(quoted) }
          : { kind: "paragraph", spans: trimEdges(spans) }
      );
    }
    spans = [];
  };

  for (const part of parts) {
    if (part.type === "text") {
      part.content.split(/\n{2,}|\n(?=\s*>)/).forEach((segment, index) => {
        if (index > 0) flush();
        if (segment) pushText(spans, segment);
      });
    } else if (part.type === "link") {
      spans.push(part);
    } else if (part.content.includes("\n")) {
      flush();
      blocks.push({ kind: "code", content: part.content.replace(/\n$/, "") });
    } else {
      spans.push(part);
    }
  }
  flush();

  return blocks;
}

// Recycled comment cells re-render with HTML they have parsed before; parse
// each string once. Bounded so a long session doesn't keep every thread alive.
const BLOCK_CACHE_LIMIT = 3000;
const blockCache = new Map<string, Block[]>();

/** HN comment HTML as render-ready blocks (memoized per string). */
export function getBlocks(html: string): Block[] {
  const cached = blockCache.get(html);
  if (cached) return cached;
  const blocks = buildBlocks(html);
  if (blockCache.size >= BLOCK_CACHE_LIMIT) {
    const oldest = blockCache.keys().next();
    if (!oldest.done) blockCache.delete(oldest.value);
  }
  blockCache.set(html, blocks);
  return blocks;
}
