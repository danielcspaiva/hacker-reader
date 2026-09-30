import { Redis } from "@upstash/redis";

/**
 * The only storage surface the API uses. Upstash Redis in production, an
 * in-memory fake in tests (`test/memory-store.ts`). Values are JSON.
 */
export interface Store {
  get<T>(key: string): Promise<T | null>;
  set<T>(
    key: string,
    value: T,
    options?: { ttlSeconds?: number }
  ): Promise<void>;
  del(...keys: string[]): Promise<void>;
  /** Increments a counter; the TTL is applied when the key is created. */
  incr(key: string, ttlSeconds: number): Promise<number>;
  sadd(key: string, ...members: string[]): Promise<void>;
  srem(key: string, ...members: string[]): Promise<void>;
  smembers(key: string): Promise<string[]>;
}

class UpstashStore implements Store {
  constructor(private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    return this.redis.get<T>(key);
  }

  async set<T>(
    key: string,
    value: T,
    options?: { ttlSeconds?: number }
  ): Promise<void> {
    if (options?.ttlSeconds) {
      await this.redis.set(key, value, { ex: options.ttlSeconds });
    } else {
      await this.redis.set(key, value);
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length > 0) await this.redis.del(...keys);
  }

  async incr(key: string, ttlSeconds: number): Promise<number> {
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, ttlSeconds);
    return count;
  }

  async sadd(key: string, ...members: string[]): Promise<void> {
    if (members.length > 0)
      await this.redis.sadd(key, members[0]!, ...members.slice(1));
  }

  async srem(key: string, ...members: string[]): Promise<void> {
    if (members.length > 0) await this.redis.srem(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    return this.redis.smembers(key);
  }
}

let cached: Store | undefined;

/**
 * The shared store. Reads `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
 * (the `KV_REST_API_*` names some Vercel integrations inject also work).
 */
export function getStore(): Store {
  if (cached) return cached;
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error(
      "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required"
    );
  }
  cached = new UpstashStore(new Redis({ url, token }));
  return cached;
}
