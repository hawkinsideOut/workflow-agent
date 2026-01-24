/**
 * Redis client wrapper for Upstash
 *
 * Provides a consistent interface for interacting with the pattern store.
 */

import { Redis } from "@upstash/redis";
import type { RegistryPattern, PatternType } from "./types";

// Keys for Redis storage
const KEYS = {
  pattern: (id: string) => `pattern:${id}`,
  patternIndex: (type: PatternType) => `patterns:${type}`,
  allPatterns: () => "patterns:all",
  rateLimit: (contributorId: string) => `ratelimit:${contributorId}`,
  stats: () => "stats:global",
} as const;

/**
 * Create a Redis client from environment variables
 */
export function createRedisClient(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      "Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN environment variables",
    );
  }

  return new Redis({ url, token });
}

/**
 * Pattern Store - handles CRUD operations for patterns
 */
export class PatternStore {
  constructor(private readonly redis: Redis) {}

  /**
   * Save a pattern to the store
   */
  async savePattern(
    pattern: RegistryPattern,
  ): Promise<{ success: boolean; isNew: boolean }> {
    const key = KEYS.pattern(pattern.id);
    const existing = await this.redis.get<RegistryPattern>(key);

    // Check if pattern already exists with same hash (duplicate)
    if (existing && existing.hash === pattern.hash) {
      return { success: true, isNew: false };
    }

    // Save the pattern
    await this.redis.set(key, pattern);

    // Add to type-specific index (sorted by createdAt timestamp)
    const score = new Date(pattern.createdAt).getTime();
    await this.redis.zadd(KEYS.patternIndex(pattern.type), {
      score,
      member: pattern.id,
    });

    // Add to all patterns index
    await this.redis.zadd(KEYS.allPatterns(), {
      score,
      member: pattern.id,
    });

    // Update stats
    await this.redis.hincrby(KEYS.stats(), `total_${pattern.type}`, 1);
    await this.redis.hincrby(KEYS.stats(), "total_all", 1);

    return { success: true, isNew: true };
  }

  /**
   * Get a pattern by ID
   */
  async getPattern(id: string): Promise<RegistryPattern | null> {
    return this.redis.get<RegistryPattern>(KEYS.pattern(id));
  }

  /**
   * Get patterns with pagination and optional filtering
   */
  async getPatterns(options: {
    type?: PatternType;
    limit?: number;
    offset?: number;
    since?: string;
  }): Promise<{ patterns: RegistryPattern[]; total: number }> {
    const { type, limit = 50, offset = 0, since } = options;

    const indexKey = type ? KEYS.patternIndex(type) : KEYS.allPatterns();

    // Get total count
    const total = await this.redis.zcard(indexKey);

    // Build range query
    let minScore: number | "-inf" = "-inf";
    if (since) {
      const sinceTime = new Date(since).getTime();
      if (!isNaN(sinceTime)) {
        minScore = sinceTime + 1; // Exclusive of 'since' timestamp
      }
    }

    // Get pattern IDs from sorted set (by score)
    const ids = await this.redis.zrange(indexKey, minScore, "+inf", {
      byScore: true,
      offset,
      count: limit,
    });

    if (ids.length === 0) {
      return { patterns: [], total };
    }

    // Fetch all patterns in parallel
    const patternKeys = (ids as string[]).map((id) => KEYS.pattern(id));
    const patterns = await this.redis.mget<RegistryPattern[]>(...patternKeys);

    // Filter out nulls and return
    const validPatterns = patterns.filter(
      (p): p is RegistryPattern => p !== null,
    );

    return { patterns: validPatterns, total };
  }

  /**
   * Get global statistics
   */
  async getStats(): Promise<Record<string, number>> {
    const stats = await this.redis.hgetall<Record<string, number>>(
      KEYS.stats(),
    );
    return stats ?? {};
  }
}

/**
 * Rate Limiter - handles rate limiting per contributor
 */
export class RateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(
    private readonly redis: Redis,
    options: { maxRequests?: number; windowMs?: number } = {},
  ) {
    this.maxRequests = options.maxRequests ?? 100; // 100 patterns per window
    this.windowMs = options.windowMs ?? 60 * 60 * 1000; // 1 hour window
  }

  /**
   * Check if a contributor is rate limited
   */
  async check(
    contributorId: string,
  ): Promise<{ allowed: boolean; remaining: number; resetAt: string | null }> {
    const key = KEYS.rateLimit(contributorId);
    const now = Date.now();

    // Get current count and TTL
    const [count, ttl] = await Promise.all([
      this.redis.get<number>(key),
      this.redis.ttl(key),
    ]);

    const currentCount = count ?? 0;
    const remaining = Math.max(0, this.maxRequests - currentCount);

    // Calculate reset time
    let resetAt: string | null = null;
    if (ttl > 0) {
      resetAt = new Date(now + ttl * 1000).toISOString();
    }

    return {
      allowed: remaining > 0,
      remaining,
      resetAt,
    };
  }

  /**
   * Increment the rate limit counter
   */
  async increment(
    contributorId: string,
    amount: number = 1,
  ): Promise<{ remaining: number; resetAt: string | null }> {
    const key = KEYS.rateLimit(contributorId);
    const now = Date.now();

    // Increment counter
    const newCount = await this.redis.incrby(key, amount);

    // Set expiry if this is the first increment in the window
    if (newCount === amount) {
      await this.redis.pexpire(key, this.windowMs);
    }

    // Get TTL for reset time
    const ttl = await this.redis.ttl(key);
    const resetAt = ttl > 0 ? new Date(now + ttl * 1000).toISOString() : null;

    return {
      remaining: Math.max(0, this.maxRequests - newCount),
      resetAt,
    };
  }
}

export { KEYS };
