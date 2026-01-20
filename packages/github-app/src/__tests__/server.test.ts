/**
 * Unit tests for HTTP Server
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Hono } from "hono";

// Mock dependencies
vi.mock("../db/client", () => ({
  initDatabase: vi.fn(() =>
    Promise.resolve({
      run: vi.fn(),
      exec: vi.fn(() => []),
      close: vi.fn(),
    }),
  ),
  getDatabase: vi.fn(() => ({
    run: vi.fn(),
    exec: vi.fn(() => []),
    close: vi.fn(),
  })),
  closeDatabase: vi.fn(),
}));

vi.mock("../db/queries", () => ({
  logWebhookEvent: vi.fn(() => ({ id: 1 })),
  markWebhookProcessed: vi.fn(),
  getRecentWebhookEvents: vi.fn(() => []),
  getActiveAttempts: vi.fn(() => []),
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 100, resetAt: null })),
  incrementRateLimit: vi.fn(),
  batchCreatePatterns: vi.fn(() => ({ inserted: 2, skipped: 0, errors: [] })),
  getPatterns: vi.fn(() => ({
    patterns: [
      {
        id: 1,
        pattern_id: "test-uuid-1",
        pattern_type: "fix",
        pattern_data: '{"name":"Test Fix"}',
        contributor_id: "wf-test-123",
        pattern_hash: null,
        created_at: "2026-01-20T00:00:00.000Z",
        updated_at: "2026-01-20T00:00:00.000Z",
      },
    ],
    total: 1,
  })),
  getPatternById: vi.fn((id: string) =>
    id === "test-uuid-1"
      ? {
          id: 1,
          pattern_id: "test-uuid-1",
          pattern_type: "fix",
          pattern_data: '{"name":"Test Fix"}',
          contributor_id: "wf-test-123",
          pattern_hash: null,
          created_at: "2026-01-20T00:00:00.000Z",
          updated_at: "2026-01-20T00:00:00.000Z",
        }
      : null
  ),
  getPatternsNewerThan: vi.fn(() => []),
}));

vi.mock("../webhooks/index", () => ({
  handleWebhook: vi.fn(() => Promise.resolve()),
  getWebhooks: vi.fn(),
}));

vi.mock("../config/env", () => ({
  getEnv: vi.fn(() => ({
    NODE_ENV: "test",
    PORT: 3000,
    GITHUB_APP_ID: "123",
    GITHUB_PRIVATE_KEY: "test-key",
    GITHUB_WEBHOOK_SECRET: "test-secret",
  })),
  isDev: vi.fn(() => true),
  isProd: vi.fn(() => false),
}));

describe("HTTP Server", () => {
  let app: Hono;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    const serverModule = await import("../server");
    app = serverModule.app;
  });

  describe("GET /health", () => {
    it("should return healthy status", async () => {
      const res = await app.request("/health");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("healthy");
    });

    it("should include uptime information", async () => {
      const res = await app.request("/health");
      const body = await res.json();

      expect(body.uptime).toBeDefined();
      expect(typeof body.uptime).toBe("number");
    });

    it("should include timestamp", async () => {
      const res = await app.request("/health");
      const body = await res.json();

      expect(body.timestamp).toBeDefined();
    });
  });

  describe("GET /status", () => {
    it("should return status information", async () => {
      const res = await app.request("/status");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("running");
    });
  });

  describe("POST /webhook", () => {
    it("should reject missing event header", async () => {
      const res = await app.request("/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });

    it("should reject missing signature header", async () => {
      const res = await app.request("/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-GitHub-Event": "push",
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("404 handler", () => {
    it("should return 404 for unknown routes", async () => {
      const res = await app.request("/unknown-route");

      expect(res.status).toBe(404);
    });

    it("should include path in 404 response", async () => {
      const res = await app.request("/some/deep/path");
      const body = await res.json();

      expect(body.path).toBe("/some/deep/path");
    });
  });

  describe("CORS", () => {
    it("should include CORS headers for OPTIONS", async () => {
      const res = await app.request("/health", {
        method: "OPTIONS",
        headers: {
          Origin: "http://localhost:3000",
        },
      });

      expect(res.status).toBe(204);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBeDefined();
    });
  });

  describe("Pattern Registry - POST /patterns/push", () => {
    it("should reject missing contributor ID header", async () => {
      const res = await app.request("/patterns/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ patterns: [] }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Missing x-contributor-id header");
    });

    it("should accept valid pattern push", async () => {
      const res = await app.request("/patterns/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-contributor-id": "wf-test-123",
        },
        body: JSON.stringify({
          patterns: [
            {
              id: "550e8400-e29b-41d4-a716-446655440000",
              type: "fix",
              data: { name: "Test Pattern" },
            },
            {
              id: "550e8400-e29b-41d4-a716-446655440001",
              type: "blueprint",
              data: { name: "Test Blueprint" },
            },
          ],
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.status).toBe("ok");
      expect(body.pushed).toBe(2);
      expect(body.rateLimit).toBeDefined();
      expect(body.rateLimit.remaining).toBe(100);
    });

    it("should reject invalid pattern data", async () => {
      const res = await app.request("/patterns/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-contributor-id": "wf-test-123",
        },
        body: JSON.stringify({
          patterns: [
            {
              id: "not-a-uuid",
              type: "invalid-type",
              data: {},
            },
          ],
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Validation failed");
    });
  });

  describe("Pattern Registry - GET /patterns/pull", () => {
    it("should return patterns list", async () => {
      const res = await app.request("/patterns/pull");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.patterns).toBeDefined();
      expect(Array.isArray(body.patterns)).toBe(true);
      expect(body.pagination).toBeDefined();
    });

    it("should support type filter", async () => {
      const res = await app.request("/patterns/pull?type=fix");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.patterns).toBeDefined();
    });

    it("should support pagination parameters", async () => {
      const res = await app.request("/patterns/pull?limit=10&offset=5");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.pagination.limit).toBe(10);
      expect(body.pagination.offset).toBe(5);
    });
  });

  describe("Pattern Registry - GET /patterns/:id", () => {
    it("should return pattern by ID", async () => {
      const res = await app.request("/patterns/test-uuid-1");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe("test-uuid-1");
      expect(body.type).toBe("fix");
    });

    it("should return 404 for non-existent pattern", async () => {
      const res = await app.request("/patterns/non-existent-uuid");

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe("Pattern not found");
    });
  });
});
