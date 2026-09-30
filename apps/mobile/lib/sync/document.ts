/**
 * The synced document and its pure operations: parse, merge, prune, trim.
 *
 * One document per collection, stored as a JSON string under its own iCloud
 * key-value key:
 *
 *   { v: 1, items: { [key]: { value, updatedAt, deleted?: true } } }
 *
 * A deleted item stays in the document as a tombstone (`deleted: true`,
 * `value: null`) so the deletion reaches devices that still hold the item.
 * No React Native imports: unit-tested in node.
 */

export const DOCUMENT_VERSION = 1;

/** Tombstones older than this are dropped; a device offline longer may resurrect the item. */
export const TOMBSTONE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface SyncEntry {
  /** The stored record (JSON); null for a tombstone. */
  value: unknown;
  /** Unix ms of the last change; the last-writer-wins clock. */
  updatedAt: number;
  deleted?: true;
}

export interface SyncDocument {
  v: typeof DOCUMENT_VERSION;
  items: Record<string, SyncEntry>;
}

export type ParsedRemote =
  | { status: "missing" }
  | { status: "ok"; doc: SyncDocument }
  /** Not JSON, or not shaped like a document. Safe to overwrite with a valid one. */
  | { status: "corrupt"; reason: string }
  /** Written by a newer app version; must be left alone. */
  | { status: "unsupported"; version: number };

export function emptyDocument(): SyncDocument {
  return { v: DOCUMENT_VERSION, items: {} };
}

function isEntry(value: unknown): value is SyncEntry {
  if (typeof value !== "object" || value === null) return false;
  if (!("updatedAt" in value) || !Number.isFinite(value.updatedAt)) {
    return false;
  }
  if ("deleted" in value && value.deleted !== undefined) {
    return value.deleted === true;
  }
  // A live entry needs a value.
  return "value" in value && value.value !== null && value.value !== undefined;
}

function hasVersion(value: unknown): value is { v: number } {
  return (
    typeof value === "object" &&
    value !== null &&
    "v" in value &&
    typeof value.v === "number"
  );
}

function hasItems(value: unknown): value is { items: object } {
  return (
    typeof value === "object" &&
    value !== null &&
    "items" in value &&
    typeof value.items === "object" &&
    value.items !== null &&
    !Array.isArray(value.items)
  );
}

/**
 * Parses a stored document. Individual malformed entries are dropped (another
 * app version or a bug must not break the rest); a wrong top-level shape is
 * `corrupt`.
 */
export function parseDocument(json: string | null | undefined): ParsedRemote {
  if (json === null || json === undefined || json === "") {
    return { status: "missing" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { status: "corrupt", reason: "invalid JSON" };
  }
  if (!hasVersion(parsed))
    return { status: "corrupt", reason: "not a document" };
  if (parsed.v > DOCUMENT_VERSION) {
    return { status: "unsupported", version: parsed.v };
  }
  if (parsed.v !== DOCUMENT_VERSION) {
    return { status: "corrupt", reason: `unknown version ${parsed.v}` };
  }
  if (!hasItems(parsed)) return { status: "corrupt", reason: "missing items" };
  const items: Record<string, SyncEntry> = {};
  for (const [key, entry] of Object.entries(parsed.items)) {
    if (isEntry(entry)) items[key] = entry;
  }
  return { status: "ok", doc: { v: DOCUMENT_VERSION, items } };
}

export function serializeDocument(doc: SyncDocument): string {
  return JSON.stringify(doc);
}

/**
 * Which of two entries for the same key wins. Symmetric, so every device
 * converges on the same document regardless of merge order:
 * newer `updatedAt` wins; on a tie a tombstone beats a live entry; between two
 * live entries the lexicographically larger JSON wins.
 */
export function pickWinner(a: SyncEntry, b: SyncEntry): SyncEntry {
  if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt ? a : b;
  if (Boolean(a.deleted) !== Boolean(b.deleted)) return a.deleted ? a : b;
  return canonicalJson(a.value) >= canonicalJson(b.value) ? a : b;
}

/** Last-writer-wins union of two documents, per item. */
export function mergeDocuments(a: SyncDocument, b: SyncDocument): SyncDocument {
  const items: Record<string, SyncEntry> = { ...a.items };
  for (const [key, entry] of Object.entries(b.items)) {
    const existing = items[key];
    items[key] = existing ? pickWinner(existing, entry) : entry;
  }
  return { v: DOCUMENT_VERSION, items };
}

/** Drops tombstones past their TTL. */
export function pruneTombstones(doc: SyncDocument, now: number): SyncDocument {
  const items: Record<string, SyncEntry> = {};
  for (const [key, entry] of Object.entries(doc.items)) {
    if (entry.deleted && now - entry.updatedAt > TOMBSTONE_TTL_MS) continue;
    items[key] = entry;
  }
  return { v: DOCUMENT_VERSION, items };
}

/**
 * Keeps at most `maxLive` live entries (the most recently updated ones).
 * Tombstones are never counted or dropped here.
 */
export function limitLiveEntries(
  doc: SyncDocument,
  maxLive: number
): SyncDocument {
  const live = Object.entries(doc.items)
    .filter(([, entry]) => !entry.deleted)
    .sort(([, a], [, b]) => b.updatedAt - a.updatedAt);
  if (live.length <= maxLive) return doc;
  const dropped = new Set(live.slice(maxLive).map(([key]) => key));
  const items: Record<string, SyncEntry> = {};
  for (const [key, entry] of Object.entries(doc.items)) {
    if (!dropped.has(key)) items[key] = entry;
  }
  return { v: DOCUMENT_VERSION, items };
}

export interface TrimResult {
  doc: SyncDocument;
  dropped: number;
}

/**
 * Trims a document to `maxBytes` of serialized JSON, oldest entry first
 * (tombstones and live items alike). Only the copy pushed to iCloud is
 * trimmed: a device never loses local data because the cloud copy is full, and
 * an entry missing from the cloud is not a deletion.
 */
export function trimToBudget(doc: SyncDocument, maxBytes: number): TrimResult {
  if (byteLength(serializeDocument(doc)) <= maxBytes)
    return { doc, dropped: 0 };
  const oldestFirst = Object.entries(doc.items).sort(
    ([, a], [, b]) => a.updatedAt - b.updatedAt
  );
  const items = { ...doc.items };
  let size = byteLength(serializeDocument(doc));
  let dropped = 0;
  for (const [key, entry] of oldestFirst) {
    if (size <= maxBytes) break;
    // Bytes this entry contributes: `"key":entry,`.
    size -=
      byteLength(JSON.stringify(key)) + byteLength(JSON.stringify(entry)) + 2;
    delete items[key];
    dropped += 1;
  }
  return { doc: { v: DOCUMENT_VERSION, items }, dropped };
}

function utf8Width(codePoint: number): number {
  if (codePoint < 0x80) return 1;
  if (codePoint < 0x800) return 2;
  return codePoint < 0x10000 ? 3 : 4;
}

/** UTF-8 byte length (iCloud limits are in bytes). */
export function byteLength(text: string): number {
  let bytes = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    bytes += utf8Width(code);
  }
  return bytes;
}

export function countLive(doc: SyncDocument): number {
  return Object.values(doc.items).filter((entry) => !entry.deleted).length;
}

/** Equality that ignores key order (objects round-trip through JSON on each device). */
export function documentsEqual(a: SyncDocument, b: SyncDocument): boolean {
  return canonicalJson(a.items) === canonicalJson(b.items);
}

type JsonLike =
  | string
  | number
  | boolean
  | null
  | JsonLike[]
  | { [key: string]: JsonLike };

function isObject(value: JsonLike): value is { [key: string]: JsonLike } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** JSON with object keys sorted at every level, so equal data compares equal. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key: string, inner: JsonLike) =>
    isObject(inner)
      ? Object.fromEntries(
          Object.entries(inner).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        )
      : inner
  );
}
