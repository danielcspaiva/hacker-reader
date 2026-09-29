/** Entities HN itself emits in item/comment HTML. */
const BASIC_ENTITIES: Record<string, string> = {
  quot: '"',
  amp: "&",
  lt: "<",
  gt: ">",
};

/** Extra named entities found in arbitrary third-party page metadata. */
const EXTENDED_ENTITIES: Record<string, string> = {
  ...BASIC_ENTITIES,
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
  reg: "®",
  trade: "™",
  bull: "•",
  deg: "°",
  euro: "€",
  pound: "£",
  times: "×",
  divide: "÷",
  minus: "−",
};

function fromCodePoint(code: number, original: string): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return original;
  return String.fromCodePoint(code);
}

function decode(text: string, named: Record<string, string>): string {
  return text.replace(
    /&(?:#[xX]([0-9a-fA-F]+)|#(\d+)|([a-zA-Z]+));/g,
    (match, hex?: string, dec?: string, name?: string) => {
      if (hex !== undefined)
        return fromCodePoint(Number.parseInt(hex, 16), match);
      if (dec !== undefined)
        return fromCodePoint(Number.parseInt(dec, 10), match);
      return named[(name ?? "").toLowerCase()] ?? match;
    }
  );
}

/**
 * Decode numeric (decimal/hex, incl. astral) and the four basic named entities
 * HN emits, in a single pass so `&amp;lt;` becomes `&lt;` and is never decoded
 * twice. Unknown named entities are left untouched.
 */
export function decodeEntities(text: string): string {
  return decode(text, BASIC_ENTITIES);
}

/** Like decodeEntities plus typographic names (`&nbsp;`, `&mdash;`, ...) for OG metadata. */
export function decodeEntitiesExtended(text: string): string {
  return decode(text, EXTENDED_ENTITIES);
}
