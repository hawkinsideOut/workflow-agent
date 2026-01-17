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
  getActiveRetryAttempts: vi.fn(() => []),
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
});
