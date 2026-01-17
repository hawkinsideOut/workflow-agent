/**
 * Unit tests for visual screenshot module
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// Mock playwright
vi.mock("playwright", () => ({
  chromium: {
    launch: vi.fn(() =>
      Promise.resolve({
        newContext: vi.fn(() =>
          Promise.resolve({
            newPage: vi.fn(() =>
              Promise.resolve({
                setViewportSize: vi.fn(),
                goto: vi.fn(() => Promise.resolve()),
                waitForSelector: vi.fn(() => Promise.resolve()),
                waitForLoadState: vi.fn(() => Promise.resolve()),
                evaluate: vi.fn(() => Promise.resolve()),
                addStyleTag: vi.fn(() => Promise.resolve()),
                screenshot: vi.fn(() =>
                  Promise.resolve(Buffer.from("screenshot-data")),
                ),
                close: vi.fn(),
              }),
            ),
            close: vi.fn(),
          }),
        ),
        close: vi.fn(),
      }),
    ),
    devices: {
      "iPhone 12": {
        viewport: { width: 390, height: 844 },
        userAgent: "Mozilla/5.0...",
      },
    },
  },
}));

// Mock fs
vi.mock("fs", async () => {
  const actual = await vi.importActual("fs");
  return {
    ...actual,
    existsSync: vi.fn(() => true),
    readFileSync: vi.fn(() => Buffer.from("file-content")),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
  };
});

// Mock path
vi.mock("path", async () => {
  const actual = await vi.importActual("path");
  return {
    ...actual,
    dirname: vi.fn(() => "/test/dir"),
    join: vi.fn((...args: string[]) => args.join("/")),
  };
});

// Mock config
vi.mock("../../config/env", () => ({
  getEnv: vi.fn(() => ({
    DATA_DIR: "/test/data",
    NODE_ENV: "test",
  })),
}));

describe("Screenshot Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(async () => {
    // Clean up browser
    try {
      const { closeBrowser } = await import("../../visual/screenshot");
      await closeBrowser();
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("captureScreenshot", () => {
    it("should capture a screenshot of a URL", async () => {
      const { captureScreenshot } = await import("../../visual/screenshot");

      const result = await captureScreenshot(
        "https://example.com",
        "/test/output.png",
      );

      expect(result).toBeDefined();
      expect(result.buffer).toBeDefined();
      expect(result.path).toBe("/test/output.png");
    });

    it("should use default viewport dimensions", async () => {
      const { captureScreenshot } = await import("../../visual/screenshot");

      const result = await captureScreenshot(
        "https://example.com",
        "/test/output.png",
      );

      expect(result.viewport).toBeDefined();
      expect(result.viewport.width).toBe(1280);
      expect(result.viewport.height).toBe(720);
    });

    it("should use custom viewport dimensions", async () => {
      const { captureScreenshot } = await import("../../visual/screenshot");

      const result = await captureScreenshot(
        "https://example.com",
        "/test/output.png",
        {
          width: 1920,
          height: 1080,
        },
      );

      expect(result.viewport).toBeDefined();
      expect(result.viewport.width).toBe(1920);
      expect(result.viewport.height).toBe(1080);
    });

    it("should support full page screenshots", async () => {
      const { captureScreenshot } = await import("../../visual/screenshot");

      const result = await captureScreenshot(
        "https://example.com",
        "/test/output.png",
        {
          fullPage: true,
        },
      );

      expect(result).toBeDefined();
    });

    it("should include timestamp in result", async () => {
      const { captureScreenshot } = await import("../../visual/screenshot");

      const before = Date.now();
      const result = await captureScreenshot(
        "https://example.com",
        "/test/output.png",
      );
      const after = Date.now();

      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).getTime()).toBeGreaterThanOrEqual(
        before,
      );
      expect(new Date(result.timestamp).getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe("readScreenshot", () => {
    it("should read screenshot from disk", async () => {
      const { readScreenshot } = await import("../../visual/screenshot");

      const result = readScreenshot("/test/screenshot.png");

      expect(result).toBeInstanceOf(Buffer);
    });

    it("should throw for non-existent file", async () => {
      const fs = await import("fs");
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error("ENOENT");
      });

      const { readScreenshot } = await import("../../visual/screenshot");

      expect(() => readScreenshot("/non-existent.png")).toThrow();
    });
  });

  describe("getBaselineDir", () => {
    it("should return baseline directory path", async () => {
      const { getBaselineDir } = await import("../../visual/screenshot");

      const dir = getBaselineDir("owner", "repo");

      expect(dir).toContain("owner");
      expect(dir).toContain("repo");
    });

    it("should handle missing repo info", async () => {
      const { getBaselineDir } = await import("../../visual/screenshot");

      const dir = getBaselineDir();

      expect(dir).toBeDefined();
      expect(typeof dir).toBe("string");
      expect(dir.length).toBeGreaterThan(0);
    });
  });

  describe("closeBrowser", () => {
    it("should close the browser instance", async () => {
      const { captureScreenshot, closeBrowser } =
        await import("../../visual/screenshot");

      // First capture to initialize browser
      await captureScreenshot("https://example.com", "/test/output.png");

      // Then close
      await expect(closeBrowser()).resolves.not.toThrow();
    });

    it("should handle closing when no browser exists", async () => {
      vi.resetModules();
      const { closeBrowser } = await import("../../visual/screenshot");

      // Should not throw even if no browser is open
      await expect(closeBrowser()).resolves.not.toThrow();
    });
  });
});
