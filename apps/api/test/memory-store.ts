import type { Store } from "../lib/store";

/** In-memory `Store` for tests. TTLs are recorded, not enforced. */
export class MemoryStore implements Store {
  /** JSON-encoded, like Redis round-trips values. */
  readonly values = new Map<string, string>();
  readonly ttls = new Map<string, number>();
  readonly sets = new Map<string, Set<string>>();

  async get<T>(key: string): Promise<T | null> {
    const raw = this.values.get(key);
    return raw === undefined ? null : JSON.parse(raw);
  }

  async set<T>(
    key: string,
    value: T,
    options?: { ttlSeconds?: number }
  ): Promise<void> {
    this.values.set(key, JSON.stringify(value));
    if (options?.ttlSeconds) this.ttls.set(key, options.ttlSeconds);
    else this.ttls.delete(key);
  }

  async del(...keys: string[]): Promise<void> {
    for (const key of keys) {
      this.values.delete(key);
      this.ttls.delete(key);
    }
  }

  async incr(key: string, ttlSeconds: number): Promise<number> {
    const next = Number(this.values.get(key) ?? 0) + 1;
    this.values.set(key, String(next));
    if (next === 1) this.ttls.set(key, ttlSeconds);
    return next;
  }

  async incrBy(
    key: string,
    amount: number,
    ttlSeconds: number
  ): Promise<number> {
    const next = Number(this.values.get(key) ?? 0) + amount;
    this.values.set(key, String(next));
    if (next === amount) this.ttls.set(key, ttlSeconds);
    return next;
  }

  async setIfAbsent<T>(
    key: string,
    value: T,
    ttlSeconds: number
  ): Promise<boolean> {
    if (this.values.has(key)) return false;
    this.values.set(key, JSON.stringify(value));
    this.ttls.set(key, ttlSeconds);
    return true;
  }

  async sadd(key: string, ...members: string[]): Promise<void> {
    const set = this.sets.get(key) ?? new Set<string>();
    for (const member of members) set.add(member);
    this.sets.set(key, set);
  }

  async srem(key: string, ...members: string[]): Promise<void> {
    for (const member of members) this.sets.get(key)?.delete(member);
  }

  async smembers(key: string): Promise<string[]> {
    return [...(this.sets.get(key) ?? [])];
  }
}
