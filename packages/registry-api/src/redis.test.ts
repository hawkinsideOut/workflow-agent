/**
 * Unit tests for Redis store and rate limiter
 *
 * Uses mocked Redis client for isolated testing.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { PatternStore, RateLimiter, KEYS } from "../src/redis";
import type { RegistryPattern } from "../src/types";

// Mock Redis client
function createMockRedis() {
  const storage = new Map<string, unknown>();
  const sortedSets = new Map<string, Map<string, number>>();
  const hashes = new Map<string, Map<string, number>>();
  const ttls = new Map<string, number>();

  return {
    storage,
    sortedSets,
    hashes,
    ttls,

    get: vi.fn(async <T>(key: string): Promise<T | null> => {
      return (storage.get(key) as T) ?? null;
    }),

    set: vi.fn(async (key: string, value: unknown): Promise<"OK"> => {
      storage.set(key, value);
      return "OK";
    }),

    mget: vi.fn(async <T>(...keys: string[]): Promise<(T | null)[]> => {
      return keys.map((key) => (storage.get(key) as T) ?? null);
    }),

    zadd: vi.fn(
      async (
        key: string,
        item: { score: number; member: string },
      ): Promise<number> => {
        if (!sortedSets.has(key)) {
          sortedSets.set(key, new Map());
        }
        sortedSets.get(key)!.set(item.member, item.score);
        return 1;
      },
    ),

    zrange: vi.fn(
      async (
        key: string,
        _min: string,
        _max: string,
        options?: { byScore?: boolean; offset?: number; count?: number },
      ): Promise<string[]> => {
        const set = sortedSets.get(key);
        if (!set) return [];

        const entries = Array.from(set.entries())
          .sort((a, b) => a[1] - b[1])
          .map(([member]) => member);

        const offset = options?.offset ?? 0;
        const count = options?.count ?? entries.length;

        return entries.slice(offset, offset + count);
      },
    ),

    zcard: vi.fn(async (key: string): Promise<number> => {
      return sortedSets.get(key)?.size ?? 0;
    }),

    hincrby: vi.fn(
      async (
        key: string,
        field: string,
        increment: number,
      ): Promise<number> => {
        if (!hashes.has(key)) {
          hashes.set(key, new Map());
        }
        const hash = hashes.get(key)!;
        const current = hash.get(field) ?? 0;
        const newValue = current + increment;
        hash.set(field, newValue);
        return newValue;
      },
    ),

    hgetall: vi.fn(
      async <T extends Record<string, unknown>>(
        key: string,
      ): Promise<T | null> => {
        const hash = hashes.get(key);
        if (!hash) return null;
        return Object.fromEntries(hash) as T;
      },
    ),

    incrby: vi.fn(async (key: string, increment: number): Promise<number> => {
      const current = (storage.get(key) as number) ?? 0;
      const newValue = current + increment;
      storage.set(key, newValue);
      return newValue;
    }),

    ttl: vi.fn(async (key: string): Promise<number> => {
      return ttls.get(key) ?? -2;
    }),

    pexpire: vi.fn(async (key: string, ms: number): Promise<number> => {
      ttls.set(key, Math.ceil(ms / 1000));
      return 1;
    }),

    ping: vi.fn(async (): Promise<"PONG"> => "PONG"),
  };
}

describe("PatternStore", () => {
  let mockRedis: ReturnType<typeof createMockRedis>;
  let store: PatternStore;

  const testPattern: RegistryPattern = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    type: "fix",
    data: {
      name: "Test Pattern",
      description: "A test pattern",
    },
    createdAt: "2024-01-01T00:00:00Z",
    contributorId: "wf-contributor-test123",
  };

  beforeEach(() => {
    mockRedis = createMockRedis();
    store = new PatternStore(mockRedis as never);
  });

  describe("savePattern", () => {
    it("saves a new pattern successfully", async () => {
      const result = await store.savePattern(testPattern);

      expect(result.success).toBe(true);
      expect(result.isNew).toBe(true);
      expect(mockRedis.set).toHaveBeenCalledWith(
        KEYS.pattern(testPattern.id),
        testPattern,
      );
    });

    it("adds pattern to type-specific index", async () => {
      await store.savePattern(testPattern);

      expect(mockRedis.zadd).toHaveBeenCalledWith(
        KEYS.patternIndex("fix"),
        expect.objectContaining({ member: testPattern.id }),
      );
    });

    it("adds pattern to all patterns index", async () => {
      await store.savePattern(testPattern);

      expect(mockRedis.zadd).toHaveBeenCalledWith(
        KEYS.allPatterns(),
        expect.objectContaining({ member: testPattern.id }),
      );
    });

    it("updates statistics", async () => {
      await store.savePattern(testPattern);

      expect(mockRedis.hincrby).toHaveBeenCalledWith(
        KEYS.stats(),
        "total_fix",
        1,
      );
      expect(mockRedis.hincrby).toHaveBeenCalledWith(
        KEYS.stats(),
        "total_all",
        1,
      );
    });

    it("skips duplicate patterns with same hash", async () => {
      const patternWithHash = { ...testPattern, hash: "abc123" };

      // Save first time
      await store.savePattern(patternWithHash);

      // Reset mocks
      mockRedis.set.mockClear();

      // Save again with same hash
      const result = await store.savePattern(patternWithHash);

      expect(result.success).toBe(true);
      expect(result.isNew).toBe(false);
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it("updates pattern if hash is different", async () => {
      const patternWithHash = { ...testPattern, hash: "abc123" };

      // Save first time
      await store.savePattern(patternWithHash);

      // Reset mocks
      mockRedis.set.mockClear();

      // Save with different hash
      const updatedPattern = { ...patternWithHash, hash: "def456" };
      const result = await store.savePattern(updatedPattern);

      expect(result.success).toBe(true);
      expect(result.isNew).toBe(true);
      expect(mockRedis.set).toHaveBeenCalled();
    });
  });

  describe("getPattern", () => {
    it("retrieves a pattern by ID", async () => {
      mockRedis.storage.set(KEYS.pattern(testPattern.id), testPattern);

      const result = await store.getPattern(testPattern.id);

      expect(result).toEqual(testPattern);
    });

    it("returns null for non-existent pattern", async () => {
      const result = await store.getPattern("non-existent-id");

      expect(result).toBeNull();
    });
  });

  describe("getPatterns", () => {
    beforeEach(async () => {
      // Add some test patterns
      for (let i = 0; i < 5; i++) {
        const pattern = {
          ...testPattern,
          id: `pattern-${i}`,
          createdAt: new Date(2024, 0, i + 1).toISOString(),
        };
        mockRedis.storage.set(KEYS.pattern(pattern.id), pattern);
        mockRedis.sortedSets.set(
          KEYS.allPatterns(),
          mockRedis.sortedSets.get(KEYS.allPatterns()) || new Map(),
        );
        mockRedis.sortedSets
          .get(KEYS.allPatterns())!
          .set(pattern.id, new Date(pattern.createdAt).getTime());
      }
    });

    it("retrieves patterns with default limit", async () => {
      const result = await store.getPatterns({});

      expect(result.total).toBe(5);
      expect(result.patterns.length).toBeLessThanOrEqual(50);
    });

    it("respects limit parameter", async () => {
      const result = await store.getPatterns({ limit: 2 });

      expect(result.patterns).toHaveLength(2);
    });

    it("respects offset parameter", async () => {
      const result = await store.getPatterns({ offset: 2, limit: 2 });

      expect(mockRedis.zrange).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ offset: 2, count: 2 }),
      );
    });

    it("returns empty array when no patterns exist", async () => {
      mockRedis.sortedSets.clear();

      const result = await store.getPatterns({});

      expect(result.patterns).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe("getStats", () => {
    it("returns statistics", async () => {
      mockRedis.hashes.set(
        KEYS.stats(),
        new Map([
          ["total_fix", 10],
          ["total_blueprint", 5],
          ["total_all", 15],
        ]),
      );

      const result = await store.getStats();

      expect(result).toEqual({
        total_fix: 10,
        total_blueprint: 5,
        total_all: 15,
      });
    });

    it("returns empty object when no stats exist", async () => {
      const result = await store.getStats();

      expect(result).toEqual({});
    });
  });
});

describe("RateLimiter", () => {
  let mockRedis: ReturnType<typeof createMockRedis>;
  let limiter: RateLimiter;

  const testContributorId = "wf-contributor-test123";

  beforeEach(() => {
    mockRedis = createMockRedis();
    limiter = new RateLimiter(mockRedis as never, {
      maxRequests: 100,
      windowMs: 3600000, // 1 hour
    });
  });

  describe("check", () => {
    it("allows requests when under limit", async () => {
      const result = await limiter.check(testContributorId);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(100);
    });

    it("calculates remaining correctly", async () => {
      mockRedis.storage.set(KEYS.rateLimit(testContributorId), 50);
      mockRedis.ttls.set(KEYS.rateLimit(testContributorId), 1800);

      const result = await limiter.check(testContributorId);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(50);
    });

    it("blocks when at limit", async () => {
      mockRedis.storage.set(KEYS.rateLimit(testContributorId), 100);
      mockRedis.ttls.set(KEYS.rateLimit(testContributorId), 1800);

      const result = await limiter.check(testContributorId);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("blocks when over limit", async () => {
      mockRedis.storage.set(KEYS.rateLimit(testContributorId), 150);
      mockRedis.ttls.set(KEYS.rateLimit(testContributorId), 1800);

      const result = await limiter.check(testContributorId);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("returns reset time when TTL is set", async () => {
      mockRedis.storage.set(KEYS.rateLimit(testContributorId), 50);
      mockRedis.ttls.set(KEYS.rateLimit(testContributorId), 1800); // 30 minutes

      const result = await limiter.check(testContributorId);

      expect(result.resetAt).not.toBeNull();
    });
  });

  describe("increment", () => {
    it("increments counter", async () => {
      const result = await limiter.increment(testContributorId, 5);

      expect(mockRedis.incrby).toHaveBeenCalledWith(
        KEYS.rateLimit(testContributorId),
        5,
      );
      expect(result.remaining).toBe(95);
    });

    it("sets expiry on first increment", async () => {
      await limiter.increment(testContributorId, 1);

      expect(mockRedis.pexpire).toHaveBeenCalledWith(
        KEYS.rateLimit(testContributorId),
        3600000,
      );
    });

    it("does not reset expiry on subsequent increments", async () => {
      // First increment sets counter to 1
      await limiter.increment(testContributorId, 1);

      mockRedis.pexpire.mockClear();

      // Second increment adds 5 more (total 6)
      await limiter.increment(testContributorId, 5);

      // pexpire should not be called because amount (5) !== newCount (6)
      expect(mockRedis.pexpire).not.toHaveBeenCalled();
    });

    it("returns updated remaining count", async () => {
      await limiter.increment(testContributorId, 10);
      const result = await limiter.increment(testContributorId, 5);

      // After first increment: 100 - 10 = 90
      // After second increment: 90 - 5 = 85
      expect(result.remaining).toBe(85);
    });
  });
});
