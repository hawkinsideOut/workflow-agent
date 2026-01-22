/**
 * Unit Tests for pre-commit CLI command
 * Tests the pre-commit command logic with mocked dependencies
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies before imports
vi.mock("chalk", () => ({
  default: {
    bold: {
      cyan: (s: string) => s,
    },
    yellow: (s: string) => s,
    dim: (s: string) => s,
    green: (s: string) => s,
    red: (s: string) => s,
  },
}));

vi.mock("./verify.js", () => ({
  verifyCommand: vi.fn().mockResolvedValue(undefined),
}));

import { preCommitCommand } from "./pre-commit.js";
import { verifyCommand } from "./verify.js";

describe("preCommitCommand - Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.log during tests
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================
  // Default behavior
  // ============================================

  describe("default behavior", () => {
    it("calls verifyCommand with fix enabled by default", async () => {
      await preCommitCommand({});

      expect(verifyCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          fix: true,
        }),
      );
    });

    it("disables commit in pre-commit context", async () => {
      await preCommitCommand({});

      expect(verifyCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          commit: false,
        }),
      );
    });

    it("disables learn for speed in pre-commit", async () => {
      await preCommitCommand({});

      expect(verifyCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          learn: false,
        }),
      );
    });

    it("uses lower default maxRetries for speed", async () => {
      await preCommitCommand({});

      expect(verifyCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          maxRetries: "5",
        }),
      );
    });
  });

  // ============================================
  // stagedOnly option
  // ============================================

  describe("stagedOnly option", () => {
    it("defaults to staged-only mode", async () => {
      await preCommitCommand({});

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("staged files"),
      );
    });

    it("can disable staged-only mode", async () => {
      await preCommitCommand({ stagedOnly: false });

      // Should not show staged-only message
      expect(verifyCommand).toHaveBeenCalled();
    });
  });

  // ============================================
  // dryRun option
  // ============================================

  describe("dryRun option", () => {
    it("passes dryRun to verifyCommand", async () => {
      await preCommitCommand({ dryRun: true });

      expect(verifyCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          dryRun: true,
        }),
      );
    });

    it("logs dry-run mode message", async () => {
      await preCommitCommand({ dryRun: true });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("DRY-RUN"),
      );
    });

    it("defaults dryRun to false", async () => {
      await preCommitCommand({});

      expect(verifyCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          dryRun: false,
        }),
      );
    });
  });

  // ============================================
  // maxRetries option
  // ============================================

  describe("maxRetries option", () => {
    it("accepts custom maxRetries", async () => {
      await preCommitCommand({ maxRetries: "10" });

      expect(verifyCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          maxRetries: "10",
        }),
      );
    });

    it("uses string value for maxRetries", async () => {
      await preCommitCommand({ maxRetries: "3" });

      expect(verifyCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          maxRetries: "3",
        }),
      );
    });
  });

  // ============================================
  // Console output
  // ============================================

  describe("console output", () => {
    it("prints pre-commit header", async () => {
      await preCommitCommand({});

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Pre-Commit Quality Check"),
      );
    });

    it("shows staged files message when stagedOnly", async () => {
      await preCommitCommand({ stagedOnly: true });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("staged files"),
      );
    });
  });

  // ============================================
  // Error handling
  // ============================================

  describe("error handling", () => {
    it("propagates errors from verifyCommand", async () => {
      const mockError = new Error("Verify failed");
      vi.mocked(verifyCommand).mockRejectedValueOnce(mockError);

      await expect(preCommitCommand({})).rejects.toThrow("Verify failed");
    });

    it("handles verification failures gracefully", async () => {
      vi.mocked(verifyCommand).mockRejectedValueOnce(new Error("Lint error"));

      await expect(preCommitCommand({})).rejects.toThrow("Lint error");
    });
  });
});
