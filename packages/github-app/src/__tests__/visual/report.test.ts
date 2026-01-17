/**
 * Unit tests for visual report generation
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock GitHub client
vi.mock("../../github/client", () => ({
  getAppOctokit: vi.fn(() => ({
    checks: {
      create: vi.fn(() => Promise.resolve({ data: { id: 1 } })),
      update: vi.fn(() => Promise.resolve({ data: { id: 1 } })),
    },
    issues: {
      createComment: vi.fn(() => Promise.resolve({ data: { id: 1 } })),
    },
  })),
  getInstallationOctokit: vi.fn(() =>
    Promise.resolve({
      checks: {
        create: vi.fn(() => Promise.resolve({ data: { id: 1 } })),
        update: vi.fn(() => Promise.resolve({ data: { id: 1 } })),
      },
      issues: {
        createComment: vi.fn(() => Promise.resolve({ data: { id: 1 } })),
      },
    }),
  ),
  createCheckRun: vi.fn(() => Promise.resolve(1)),
  createPRComment: vi.fn(() => Promise.resolve(1)),
}));

// Mock config
vi.mock("../../config/env", () => ({
  getEnv: vi.fn(() => ({
    GITHUB_APP_ID: "123",
    NODE_ENV: "test",
  })),
}));

describe("Visual Report Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("generateMarkdownReport", () => {
    it("should generate Markdown report", async () => {
      const { generateMarkdownReport } = await import("../../visual/report");

      const results = {
        passed: [
          {
            baseline: { name: "homepage", url: "https://example.com" },
            confidence: 0.95,
            areIdentical: true,
            differences: [],
            summary: "No differences found",
            beforePath: "/test/before.png",
            afterPath: "/test/after.png",
            comparisonId: 1,
          },
        ],
        failed: [],
        total: 1,
      };

      const markdown = generateMarkdownReport(results);

      expect(markdown).toBeDefined();
      expect(typeof markdown).toBe("string");
      expect(markdown).toContain("Visual Testing Report");
    });

    it("should include failure details in report", async () => {
      const { generateMarkdownReport } = await import("../../visual/report");

      const results = {
        passed: [],
        failed: [
          {
            baseline: { name: "homepage", url: "https://example.com" },
            confidence: 0.75,
            areIdentical: false,
            differences: [
              {
                type: "color",
                description: "Button color changed",
                severity: "high",
              },
            ],
            summary: "Visual differences detected",
            beforePath: "/test/before.png",
            afterPath: "/test/after.png",
            comparisonId: 1,
          },
        ],
        total: 1,
      };

      const markdown = generateMarkdownReport(results);

      expect(markdown).toContain("Visual differences detected");
    });

    it("should include confidence scores", async () => {
      const { generateMarkdownReport } = await import("../../visual/report");

      const results = {
        passed: [],
        failed: [
          {
            baseline: { name: "page", url: "https://example.com" },
            confidence: 0.98,
            areIdentical: false,
            differences: [],
            summary: "Match",
            beforePath: "/test/before.png",
            afterPath: "/test/after.png",
            comparisonId: 1,
          },
        ],
        total: 1,
      };

      const markdown = generateMarkdownReport(results);

      expect(markdown).toContain("98%");
    });
  });

  describe("generateTerminalSummary", () => {
    it("should generate terminal-friendly summary", async () => {
      const { generateTerminalSummary } = await import("../../visual/report");

      const results = {
        passed: [
          {
            baseline: { name: "homepage" },
            confidence: 0.95,
          },
        ],
        failed: [],
        total: 1,
      };

      const summary = generateTerminalSummary(results);

      expect(summary).toBeDefined();
      expect(typeof summary).toBe("string");
    });
  });

  describe("postCheckRun", () => {
    it("should post check run to GitHub", async () => {
      const { postCheckRun } = await import("../../visual/report");

      const results = {
        passed: [],
        failed: [],
        total: 0,
      };

      await expect(
        postCheckRun(12345, "test-owner", "test-repo", "abc123", results),
      ).resolves.toBeDefined();
    });
  });

  describe("postPRComment", () => {
    it("should post PR comment to GitHub", async () => {
      const { postPRComment } = await import("../../visual/report");

      const results = {
        passed: [],
        failed: [],
        total: 0,
      };

      await expect(
        postPRComment(12345, "test-owner", "test-repo", 1, results),
      ).resolves.toBeDefined();
    });
  });
});
