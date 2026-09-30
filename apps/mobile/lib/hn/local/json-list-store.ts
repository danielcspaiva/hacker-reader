/**
 * A persisted JSON array of records, behind a key-value storage.
 *
 * Reads and writes throw on any storage or parse failure and never report:
 * callers (hooks) report once. A failed read must not turn into a write of
 * `[]`, which would wipe the user's saved list, so `update` propagates the read
 * failure instead of falling back to an empty list.
 */

/** The slice of AsyncStorage the store needs (also trivial to fake in tests). */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface JsonListStore<T> {
  /** Current records; malformed entries are dropped. Throws if storage fails or the JSON is corrupt. */
  read(): Promise<T[]>;
  /** Serialized read-modify-write. Returns the list that was written. */
  update(change: (items: T[]) => T[]): Promise<T[]>;
  clear(): Promise<void>;
}

export function createJsonListStore<T>({
  key,
  guard,
  storage,
}: {
  key: string;
  guard: (value: unknown) => value is T;
  storage: KeyValueStorage;
}): JsonListStore<T> {
  async function read(): Promise<T[]> {
    const json = await storage.getItem(key);
    if (!json) return [];
    // Validate at the boundary: drop entries from an older or malformed shape.
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter(guard) : [];
  }

  // Writes queue behind each other so two quick taps can't lose an update.
  let queue: Promise<unknown> = Promise.resolve();

  function update(change: (items: T[]) => T[]): Promise<T[]> {
    const run = queue.then(async () => {
      const next = change(await read());
      await storage.setItem(key, JSON.stringify(next));
      return next;
    });
    queue = run.catch(() => {});
    return run;
  }

  return {
    read,
    update,
    async clear() {
      await storage.removeItem(key);
    },
  };
}
