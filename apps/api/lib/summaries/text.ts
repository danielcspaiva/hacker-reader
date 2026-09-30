const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  copy: "©",
};

/** Decodes the common named entities and every numeric one. */
export function decodeEntities(text: string): string {
  return text.replace(
    /&(?:#(\d{1,7})|#[xX]([0-9a-fA-F]{1,6})|([a-zA-Z]{2,8}));/g,
    (match, dec?: string, hex?: string, name?: string) => {
      if (name) return NAMED_ENTITIES[name.toLowerCase()] ?? match;
      const code = dec ? Number(dec) : parseInt(hex ?? "", 16);
      if (!Number.isInteger(code) || code <= 0 || code > 0x10ffff) return match;
      return String.fromCodePoint(code);
    }
  );
}

/** Trims every line, collapses runs of spaces and keeps at most one blank line. */
export function collapseWhitespace(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t\f\v ]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * HN comment HTML (from Algolia) to plain text: paragraphs become blank lines,
 * links keep their href, every other tag is dropped.
 */
export function commentHtmlToText(html: string): string {
  const text = html
    .replace(/<p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<a\b[^>]*?\bhref="([^"]*)"[^>]*>[\s\S]*?<\/a>/gi, " $1 ")
    .replace(/<\/?(?:pre|code|i|em|b|strong|u|span)\b[^>]*>/gi, "")
    .replace(/<[^>]*>/g, "");
  return collapseWhitespace(decodeEntities(text));
}

/** Escapes text placed inside the prompt's pseudo-XML so data cannot forge tags. */
export function escapeForPrompt(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function truncateChars(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max).trimEnd()}…`;
}
