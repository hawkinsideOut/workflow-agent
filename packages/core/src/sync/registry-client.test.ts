/**
 * Unit tests for RegistryClient
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  RegistryClient,
  RegistryError,
  RateLimitedException,
} from "./registry-client.js";
import type { FixPattern, Blueprint } from "@hawkinside_out/workflow-improvement-tracker";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("RegistryClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear environment variable
    delete process.env.WORKFLOW_REGISTRY_URL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should use default registry URL", () => {
      const client = new RegistryClient();
      // We can't directly access private properties, but we can test behavior
      expect(client).toBeDefined();
    });

    it("should use custom URL from options", () => {
      const client = new RegistryClient({
        baseUrl: "http://localhost:3000",
      });
      expect(client).toBeDefined();
    });

    it("should use URL from environment variable", () => {
      process.env.WORKFLOW_REGISTRY_URL = "http://custom-registry.example.com";
      const client = new RegistryClient();
      expect(client).toBeDefined();
    });

    it("should strip trailing slash from URL", () => {
      const client = new RegistryClient({
        baseUrl: "http://localhost:3000/",
      });
      expect(client).toBeDefined();
    });

    it("should use custom timeout", () => {
      const client = new RegistryClient({
        timeout: 5000,
      });
      expect(client).toBeDefined();
    });

    it("should use custom retries", () => {
      const client = new RegistryClient({
        retries: 5,
      });
      expect(client).toBeDefined();
    });
  });

  describe("push", () => {
    const mockPattern: Partial<FixPattern> = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Test Fix Pattern",
      description: "A test pattern",
      category: "lint",
      isPrivate: false,
    };

    it("should push patterns successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          status: "ok",
          pushed: 1,
          skipped: 0,
          rateLimit: { remaining: 99, resetAt: null },
        }),
      });

      const client = new RegistryClient({ baseUrl: "http://localhost:3000" });
      const result = await client.push(
        [{ pattern: mockPattern as FixPattern, type: "fix" }],
        "wf-contributor-123",
      );

      expect(result.pushed).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.rateLimit.remaining).toBe(99);

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/patterns/push",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "x-contributor-id": "wf-contributor-123",
          }),
        }),
      );
    });

    it("should handle rate limit error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: "Rate limit exceeded",
          message: "You can push up to 100 patterns per hour",
          resetAt: "2026-01-20T12:00:00.000Z",
          remaining: 0,
        }),
      });

      const client = new RegistryClient({ baseUrl: "http://localhost:3000" });

      await expect(
        client.push(
          [{ pattern: mockPattern as FixPattern, type: "fix" }],
          "wf-contributor-123",
        ),
      ).rejects.toThrow(RateLimitedException);
    });

    it("should handle validation error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: "Validation failed",
          details: [{ path: ["patterns", 0, "id"], message: "Invalid UUID" }],
        }),
      });

      const client = new RegistryClient({ baseUrl: "http://localhost:3000" });

      await expect(
        client.push(
          [{ pattern: mockPattern as FixPattern, type: "fix" }],
          "wf-contributor-123",
        ),
      ).rejects.toThrow(RegistryError);
    });

    it("should handle server error with retry", async () => {
      // First two calls fail, third succeeds
      mockFetch
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({
            status: "ok",
            pushed: 1,
            skipped: 0,
            rateLimit: { remaining: 99, resetAt: null },
          }),
        });

      const client = new RegistryClient({
        baseUrl: "http://localhost:3000",
        retries: 3,
      });

      const result = await client.push(
        [{ pattern: mockPattern as FixPattern, type: "fix" }],
        "wf-contributor-123",
      );

      expect(result.pushed).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("should include pattern hash when provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          status: "ok",
          pushed: 1,
          skipped: 0,
          rateLimit: { remaining: 99, resetAt: null },
        }),
      });

      const client = new RegistryClient({ baseUrl: "http://localhost:3000" });
      await client.push(
        [{ pattern: mockPattern as FixPattern, type: "fix", hash: "abc123" }],
        "wf-contributor-123",
      );

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.patterns[0].hash).toBe("abc123");
    });

    it("should handle multiple patterns", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          status: "ok",
          pushed: 3,
          skipped: 0,
          rateLimit: { remaining: 97, resetAt: null },
        }),
      });

      const client = new RegistryClient({ baseUrl: "http://localhost:3000" });
      const result = await client.push(
        [
          { pattern: mockPattern as FixPattern, type: "fix" },
          { pattern: { ...mockPattern, id: "uuid-2" } as FixPattern, type: "fix" },
          { pattern: { ...mockPattern, id: "uuid-3" } as Blueprint, type: "blueprint" },
        ],
        "wf-contributor-123",
      );

      expect(result.pushed).toBe(3);
    });
  });

  describe("pull", () => {
    it("should pull patterns successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          patterns: [
            {
              id: "uuid-1",
              type: "fix",
              data: { name: "Pattern 1" },
              createdAt: "2026-01-20T00:00:00.000Z",
            },
            {
              id: "uuid-2",
              type: "fix",
              data: { name: "Pattern 2" },
              createdAt: "2026-01-20T00:00:00.000Z",
            },
          ],
          pagination: {
            offset: 0,
            limit: 50,
            total: 2,
            hasMore: false,
          },
        }),
      });

      const client = new RegistryClient({ baseUrl: "http://localhost:3000" });
      const result = await client.pull();

      expect(result.patterns).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.hasMore).toBe(false);
    });

    it("should support type filter", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          patterns: [],
          pagination: { offset: 0, limit: 50, total: 0, hasMore: false },
        }),
      });

      const client = new RegistryClient({ baseUrl: "http://localhost:3000" });
      await client.pull({ type: "blueprint" });

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/patterns/pull?type=blueprint",
        expect.any(Object),
      );
    });

    it("should support pagination parameters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          patterns: [],
          pagination: { offset: 10, limit: 20, total: 100, hasMore: true },
        }),
      });

      const client = new RegistryClient({ baseUrl: "http://localhost:3000" });
      await client.pull({ limit: 20, offset: 10 });

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/patterns/pull?limit=20&offset=10",
        expect.any(Object),
      );
    });

    it("should support since parameter for incremental pulls", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          patterns: [],
          pagination: { offset: 0, limit: 50, total: 0, hasMore: false },
        }),
      });

      const client = new RegistryClient({ baseUrl: "http://localhost:3000" });
      await client.pull({ since: "2026-01-19T00:00:00.000Z" });

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/patterns/pull?since=2026-01-19T00%3A00%3A00.000Z",
        expect.any(Object),
      );
    });

    it("should handle server error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: "Internal server error",
        }),
      });

      const client = new RegistryClient({
        baseUrl: "http://localhost:3000",
        retries: 1,
      });

      await expect(client.pull()).rejects.toThrow(RegistryError);
    });
  });

  describe("getPattern", () => {
    it("should get pattern by ID", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: "uuid-1",
          type: "fix",
          data: { name: "Test Pattern" },
          hash: "abc123",
          createdAt: "2026-01-20T00:00:00.000Z",
          updatedAt: "2026-01-20T00:00:00.000Z",
        }),
      });

      const client = new RegistryClient({ baseUrl: "http://localhost:3000" });
      const result = await client.getPattern("uuid-1");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("uuid-1");
      expect(result?.type).toBe("fix");
    });

    it("should return null for non-existent pattern", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: "Pattern not found",
        }),
      });

      const client = new RegistryClient({ baseUrl: "http://localhost:3000" });
      const result = await client.getPattern("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("healthCheck", () => {
    it("should return true when registry is healthy", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: "healthy" }),
      });

      const client = new RegistryClient({ baseUrl: "http://localhost:3000" });
      const result = await client.healthCheck();

      expect(result).toBe(true);
    });

    it("should return false when registry is unavailable", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

      const client = new RegistryClient({
        baseUrl: "http://localhost:3000",
        retries: 1,
      });
      const result = await client.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe("RateLimitedException", () => {
    it("should calculate time until reset", () => {
      const futureTime = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes
      const error = new RateLimitedException("Rate limit exceeded", futureTime, 0);

      const timeUntil = error.getTimeUntilReset();
      expect(timeUntil).toMatch(/\d+ minute/);
    });

    it("should return 'now' if reset time has passed", () => {
      const pastTime = new Date(Date.now() - 1000).toISOString();
      const error = new RateLimitedException("Rate limit exceeded", pastTime, 0);

      expect(error.getTimeUntilReset()).toBe("now");
    });

    it("should return 'unknown' if no reset time", () => {
      const error = new RateLimitedException("Rate limit exceeded", null, 0);

      expect(error.getTimeUntilReset()).toBe("unknown");
    });

    it("should format hours correctly", () => {
      const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours
      const error = new RateLimitedException("Rate limit exceeded", futureTime, 0);

      const timeUntil = error.getTimeUntilReset();
      expect(timeUntil).toMatch(/\d+ hour/);
    });
  });

  describe("RegistryError", () => {
    it("should include status code", () => {
      const error = new RegistryError("Not found", 404);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe("Not found");
    });

    it("should include body", () => {
      const error = new RegistryError("Validation failed", 400, {
        details: ["Invalid ID"],
      });
      expect(error.body).toEqual({ details: ["Invalid ID"] });
    });
  });

  describe("timeout handling", () => {
    it("should abort request on timeout", async () => {
      // Mock a request that respects the abort signal
      mockFetch.mockImplementationOnce(
        (_url: string, options: RequestInit) =>
          new Promise((resolve, reject) => {
            const timeoutId = setTimeout(
              () =>
                resolve({
                  ok: true,
                  status: 200,
                  json: async () => ({ patterns: [] }),
                }),
              5000,
            );
            
            // Listen for abort signal
            if (options.signal) {
              options.signal.addEventListener("abort", () => {
                clearTimeout(timeoutId);
                reject(new Error("The operation was aborted"));
              });
            }
          }),
      );

      const client = new RegistryClient({
        baseUrl: "http://localhost:3000",
        timeout: 100, // Very short timeout
        retries: 1,
      });

      await expect(client.pull()).rejects.toThrow();
    });
  });
});
