/**
 * Integration tests for API endpoints
 *
 * Tests the full request/response cycle with mocked Redis.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the redis module before importing handlers
const mockStorage = new Map<string, unknown>();
const mockSortedSets = new Map<string, Map<string, number>>();
const mockHashes = new Map<string, Map<string, number>>();
const mockTtls = new Map<string, number>();

const mockRedis = {
  get: vi.fn(async <T>(key: string): Promise<T | null> => {
    return (mockStorage.get(key) as T) ?? null;
  }),
  set: vi.fn(async (key: string, value: unknown): Promise<"OK"> => {
    mockStorage.set(key, value);
    return "OK";
  }),
  mget: vi.fn(async <T>(...keys: string[]): Promise<(T | null)[]> => {
    return keys.map((key) => (mockStorage.get(key) as T) ?? null);
  }),
  zadd: vi.fn(
    async (
      key: string,
      item: { score: number; member: string },
    ): Promise<number> => {
      if (!mockSortedSets.has(key)) {
        mockSortedSets.set(key, new Map());
      }
      mockSortedSets.get(key)!.set(item.member, item.score);
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
      const set = mockSortedSets.get(key);
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
    return mockSortedSets.get(key)?.size ?? 0;
  }),
  hincrby: vi.fn(
    async (key: string, field: string, increment: number): Promise<number> => {
      if (!mockHashes.has(key)) {
        mockHashes.set(key, new Map());
      }
      const hash = mockHashes.get(key)!;
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
      const hash = mockHashes.get(key);
      if (!hash) return null;
      return Object.fromEntries(hash) as T;
    },
  ),
  incrby: vi.fn(async (key: string, increment: number): Promise<number> => {
    const current = (mockStorage.get(key) as number) ?? 0;
    const newValue = current + increment;
    mockStorage.set(key, newValue);
    return newValue;
  }),
  ttl: vi.fn(async (key: string): Promise<number> => {
    return mockTtls.get(key) ?? -2;
  }),
  pexpire: vi.fn(async (key: string, ms: number): Promise<number> => {
    mockTtls.set(key, Math.ceil(ms / 1000));
    return 1;
  }),
  ping: vi.fn(async (): Promise<"PONG"> => "PONG"),
};

// Mock the createRedisClient function
vi.mock("../src/redis", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/redis")>();
  return {
    ...original,
    createRedisClient: () => mockRedis,
  };
});

// Create mock request/response helpers
function createMockRequest(options: {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  query?: Record<string, string | string[]>;
}): {
  method: string;
  headers: Record<string, string>;
  body: unknown;
  query: Record<string, string | string[]>;
} {
  return {
    method: options.method ?? "GET",
    headers: options.headers ?? {},
    body: options.body ?? null,
    query: options.query ?? {},
  };
}

function createMockResponse(): {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
  setHeader: ReturnType<typeof vi.fn>;
  _status: number;
  _body: unknown;
} {
  const res = {
    _status: 200,
    _body: null as unknown,
    status: vi.fn().mockImplementation((code: number) => {
      res._status = code;
      return res;
    }),
    json: vi.fn().mockImplementation((body: unknown) => {
      res._body = body;
      return res;
    }),
    setHeader: vi.fn().mockReturnThis(),
  };
  return res;
}

// Set up environment variables for tests
beforeEach(() => {
  process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

  // Clear mock data
  mockStorage.clear();
  mockSortedSets.clear();
  mockHashes.clear();
  mockTtls.clear();

  // Clear mock call history
  vi.clearAllMocks();
});

afterEach(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

describe("Health Endpoint", () => {
  it("returns ok status on successful ping", async () => {
    const { default: handler } = await import("../api/health");

    const req = createMockRequest({ method: "GET" });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(200);
    expect(res._body).toMatchObject({
      status: "ok",
      version: "1.0.0",
    });
  });

  it("rejects non-GET methods", async () => {
    const { default: handler } = await import("../api/health");

    const req = createMockRequest({ method: "POST" });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(405);
  });
});

describe("Push Endpoint", () => {
  const validPattern = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    type: "fix",
    data: {
      name: "Test Fix Pattern",
      description: "A test pattern for fixing common issues",
    },
  };

  const validHeaders = {
    "x-contributor-id": "wf-contributor-test123abc",
  };

  it("pushes valid patterns successfully", async () => {
    const { default: handler } = await import("../api/patterns/push");

    const req = createMockRequest({
      method: "POST",
      headers: validHeaders,
      body: { patterns: [validPattern] },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(200);
    expect(res._body).toMatchObject({
      status: "ok",
      pushed: 1,
      skipped: 0,
    });
  });

  it("rejects requests without contributor ID", async () => {
    const { default: handler } = await import("../api/patterns/push");

    const req = createMockRequest({
      method: "POST",
      body: { patterns: [validPattern] },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({
      error: "Invalid contributor ID",
    });
  });

  it("rejects invalid pattern data", async () => {
    const { default: handler } = await import("../api/patterns/push");

    const req = createMockRequest({
      method: "POST",
      headers: validHeaders,
      body: { patterns: [{ id: "invalid", type: "fix", data: {} }] },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({
      error: "Invalid request body",
    });
  });

  it("rate limits after exceeding quota", async () => {
    const { default: handler } = await import("../api/patterns/push");

    // Set rate limit to max
    mockStorage.set("ratelimit:wf-contributor-test123abc", 100);
    mockTtls.set("ratelimit:wf-contributor-test123abc", 3600);

    const req = createMockRequest({
      method: "POST",
      headers: validHeaders,
      body: { patterns: [validPattern] },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(429);
    expect(res._body).toMatchObject({
      error: "Rate limit exceeded",
    });
  });

  it("skips duplicate patterns with same hash", async () => {
    const { default: handler } = await import("../api/patterns/push");

    const patternWithHash = { ...validPattern, hash: "abc123" };

    // First push
    const req1 = createMockRequest({
      method: "POST",
      headers: validHeaders,
      body: { patterns: [patternWithHash] },
    });
    const res1 = createMockResponse();
    await handler(req1 as never, res1 as never);

    expect(res1._body).toMatchObject({ pushed: 1, skipped: 0 });

    // Second push with same hash
    const req2 = createMockRequest({
      method: "POST",
      headers: validHeaders,
      body: { patterns: [patternWithHash] },
    });
    const res2 = createMockResponse();
    await handler(req2 as never, res2 as never);

    expect(res2._body).toMatchObject({ pushed: 0, skipped: 1 });
  });

  it("rejects non-POST methods", async () => {
    const { default: handler } = await import("../api/patterns/push");

    const req = createMockRequest({ method: "GET" });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(405);
  });
});

describe("Pull Endpoint", () => {
  beforeEach(() => {
    // Add some test patterns
    const testPatterns = [
      {
        id: "pattern-1",
        type: "fix",
        data: { name: "Fix 1", description: "First fix pattern" },
        createdAt: "2024-01-01T00:00:00Z",
        contributorId: "contributor-1",
      },
      {
        id: "pattern-2",
        type: "blueprint",
        data: { name: "Blueprint 1", description: "First blueprint" },
        createdAt: "2024-01-02T00:00:00Z",
        contributorId: "contributor-1",
      },
    ];

    for (const pattern of testPatterns) {
      mockStorage.set(`pattern:${pattern.id}`, pattern);

      if (!mockSortedSets.has("patterns:all")) {
        mockSortedSets.set("patterns:all", new Map());
      }
      mockSortedSets
        .get("patterns:all")!
        .set(pattern.id, new Date(pattern.createdAt).getTime());

      if (!mockSortedSets.has(`patterns:${pattern.type}`)) {
        mockSortedSets.set(`patterns:${pattern.type}`, new Map());
      }
      mockSortedSets
        .get(`patterns:${pattern.type}`)!
        .set(pattern.id, new Date(pattern.createdAt).getTime());
    }
  });

  it("returns all patterns by default", async () => {
    const { default: handler } = await import("../api/patterns/pull");

    const req = createMockRequest({ method: "GET" });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(200);
    expect(res._body).toMatchObject({
      pagination: expect.objectContaining({
        total: 2,
      }),
    });
  });

  it("filters by pattern type", async () => {
    const { default: handler } = await import("../api/patterns/pull");

    const req = createMockRequest({
      method: "GET",
      query: { type: "fix" },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(200);
    expect(res._body).toMatchObject({
      pagination: expect.objectContaining({
        total: 1,
      }),
    });
  });

  it("respects limit parameter", async () => {
    const { default: handler } = await import("../api/patterns/pull");

    const req = createMockRequest({
      method: "GET",
      query: { limit: "1" },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(200);
    const body = res._body as {
      patterns: unknown[];
      pagination: { hasMore: boolean };
    };
    expect(body.patterns).toHaveLength(1);
    expect(body.pagination.hasMore).toBe(true);
  });

  it("sets cache headers", async () => {
    const { default: handler } = await import("../api/patterns/pull");

    const req = createMockRequest({ method: "GET" });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res.setHeader).toHaveBeenCalledWith(
      "Cache-Control",
      expect.stringContaining("s-maxage"),
    );
  });

  it("rejects non-GET methods", async () => {
    const { default: handler } = await import("../api/patterns/pull");

    const req = createMockRequest({ method: "POST" });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(405);
  });
});

describe("Get Pattern by ID Endpoint", () => {
  const testPattern = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    type: "fix",
    data: { name: "Test Pattern", description: "A test pattern" },
    createdAt: "2024-01-01T00:00:00Z",
    contributorId: "contributor-1",
  };

  beforeEach(() => {
    mockStorage.set(`pattern:${testPattern.id}`, testPattern);
  });

  it("returns a pattern by ID", async () => {
    const { default: handler } = await import("../api/patterns/[id]");

    const req = createMockRequest({
      method: "GET",
      query: { id: testPattern.id },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(200);
    expect(res._body).toMatchObject({
      id: testPattern.id,
      type: "fix",
    });
  });

  it("returns 404 for non-existent pattern", async () => {
    const { default: handler } = await import("../api/patterns/[id]");

    const req = createMockRequest({
      method: "GET",
      query: { id: "00000000-0000-0000-0000-000000000000" },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(404);
    expect(res._body).toMatchObject({
      error: "Pattern not found",
    });
  });

  it("returns 400 for invalid UUID", async () => {
    const { default: handler } = await import("../api/patterns/[id]");

    const req = createMockRequest({
      method: "GET",
      query: { id: "invalid-id" },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({
      error: "Invalid pattern ID",
    });
  });

  it("sets cache headers", async () => {
    const { default: handler } = await import("../api/patterns/[id]");

    const req = createMockRequest({
      method: "GET",
      query: { id: testPattern.id },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res.setHeader).toHaveBeenCalledWith(
      "Cache-Control",
      expect.stringContaining("s-maxage"),
    );
  });

  it("rejects non-GET methods", async () => {
    const { default: handler } = await import("../api/patterns/[id]");

    const req = createMockRequest({
      method: "DELETE",
      query: { id: testPattern.id },
    });
    const res = createMockResponse();

    await handler(req as never, res as never);

    expect(res._status).toBe(405);
  });
});
