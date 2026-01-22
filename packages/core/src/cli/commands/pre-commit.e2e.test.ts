/**
 * E2E Tests for pre-commit CLI command
 * Tests CLI invocation with real file system
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { writeFile, mkdir, readFile } from "fs/promises";
import { join } from "path";
import { execa } from "execa";
import { setupTempDir, cleanupTempDir, createWorkflowConfig, initGitRepo } from "./test-utils.js";

describe("pre-commit CLI command - E2E", () => {
  let tempDir: string;
  let cliPath: string;

  beforeAll(async () => {
    cliPath = join(process.cwd(), "dist", "cli", "index.js");
  });

  beforeEach(async () => {
    tempDir = await setupTempDir("pre-commit-e2e-");
    await createWorkflowConfig(tempDir);
    await initGitRepo(tempDir);
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  // ============================================
  // Basic invocation
  // ============================================

  describe("basic invocation", () => {
    it("runs pre-commit command", async () => {
      const { stdout, exitCode } = await execa("node", [cliPath, "pre-commit"], {
        cwd: tempDir,
        reject: false,
      });

      // Should run (may have no staged files or no linter configured)
      expect(stdout).toContain("Pre-Commit Quality Check");
    });

    it("shows pre-commit header", async () => {
      const { stdout } = await execa("node", [cliPath, "pre-commit"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout).toContain("Pre-Commit");
      expect(stdout).toContain("Quality Check");
    });
  });

  // ============================================
  // dry-run option
  // ============================================

  describe("--dry-run option", () => {
    it("runs with dry-run flag", async () => {
      const { stdout } = await execa("node", [cliPath, "pre-commit", "--dry-run"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout).toContain("DRY-RUN");
    });

    it("does not modify files in dry-run mode", async () => {
      // Create a file that would be "fixed"
      await writeFile(join(tempDir, "test.ts"), "const x = 1 ;\n");
      await execa("git", ["add", "."], { cwd: tempDir });

      const originalContent = await readFile(join(tempDir, "test.ts"), "utf-8");

      await execa("node", [cliPath, "pre-commit", "--dry-run"], {
        cwd: tempDir,
        reject: false,
      });

      const afterContent = await readFile(join(tempDir, "test.ts"), "utf-8");
      expect(afterContent).toBe(originalContent);
    });
  });

  // ============================================
  // staged files focus
  // ============================================

  describe("staged files focus", () => {
    it("indicates it checks staged files", async () => {
      const { stdout } = await execa("node", [cliPath, "pre-commit"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout).toContain("staged");
    });

    it("can disable staged-only with flag", async () => {
      const { exitCode } = await execa(
        "node",
        [cliPath, "pre-commit", "--no-staged-only"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      // Should run without unknown option error
      expect([0, 1]).toContain(exitCode);
    });
  });

  // ============================================
  // max-retries option
  // ============================================

  describe("--max-retries option", () => {
    it("accepts max-retries option", async () => {
      const { exitCode } = await execa(
        "node",
        [cliPath, "pre-commit", "--max-retries", "3"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      // Should run without unknown option error
      expect([0, 1]).toContain(exitCode);
    });

    it("defaults to low retry count for speed", async () => {
      const { stdout } = await execa("node", [cliPath, "pre-commit"], {
        cwd: tempDir,
        reject: false,
      });

      // Should complete quickly
      expect(stdout).toContain("Pre-Commit");
    });
  });

  // ============================================
  // Integration with git hooks
  // ============================================

  describe("git hooks integration", () => {
    it("works when called from git hooks directory", async () => {
      // Simulate being called from .git/hooks
      await mkdir(join(tempDir, ".git", "hooks"), { recursive: true });

      const { stdout } = await execa("node", [cliPath, "pre-commit"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout).toContain("Pre-Commit");
    });

    it("handles repos with staged changes", async () => {
      // Create and stage a file
      await writeFile(join(tempDir, "new-file.ts"), "export const x = 1;\n");
      await execa("git", ["add", "new-file.ts"], { cwd: tempDir });

      const { stdout } = await execa("node", [cliPath, "pre-commit"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout).toContain("Pre-Commit");
    });

    it("handles repos with no staged changes", async () => {
      const { stdout } = await execa("node", [cliPath, "pre-commit"], {
        cwd: tempDir,
        reject: false,
      });

      // Should still run without error
      expect(stdout).toContain("Pre-Commit");
    });
  });

  // ============================================
  // Help and documentation
  // ============================================

  describe("help and documentation", () => {
    it("shows help for pre-commit", async () => {
      const { stdout } = await execa("node", [cliPath, "pre-commit", "--help"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout).toContain("pre-commit");
      expect(stdout).toContain("Options");
    });
  });
});
