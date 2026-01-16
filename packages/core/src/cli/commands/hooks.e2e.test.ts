import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile, readFile, chmod } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { execa } from "execa";

/**
 * E2E Tests for the hooks command
 * Tests the git hooks management including:
 * - hooks install: Installing pre-commit and commit-msg hooks
 * - hooks uninstall: Removing hooks and restoring originals
 * - hooks status: Reporting current hook installation state
 * - Wrapper behavior for existing hooks
 */
describe("workflow hooks - E2E", () => {
  let tempDir: string;
  let cliPath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "workflow-hooks-e2e-"));
    cliPath = join(process.cwd(), "dist", "cli", "index.js");

    // Initialize git repo
    await execa("git", ["init"], { cwd: tempDir });
    await execa("git", ["config", "user.email", "test@test.com"], {
      cwd: tempDir,
    });
    await execa("git", ["config", "user.name", "Test User"], { cwd: tempDir });

    // Create basic config
    await writeFile(
      join(tempDir, "workflow.config.json"),
      JSON.stringify({
        projectName: "test-hooks",
        scopes: [
          { name: "feat", description: "New features and enhancements" },
        ],
        enforcement: "strict",
        language: "en",
      }),
    );
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("hooks install", () => {
    it("successfully installs hooks in empty hooks directory", async () => {
      const { exitCode, stdout } = await execa(
        "node",
        [cliPath, "hooks", "install"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("installed");

      // Verify hook files exist
      const preCommit = await readFile(
        join(tempDir, ".git", "hooks", "pre-commit"),
        "utf-8",
      );
      expect(preCommit).toContain("workflow");
    });

    it("creates wrapper when existing hook is present", async () => {
      const hooksDir = join(tempDir, ".git", "hooks");
      const existingHookContent = '#!/bin/bash\necho "Original hook"';

      await writeFile(join(hooksDir, "pre-commit"), existingHookContent);
      await chmod(join(hooksDir, "pre-commit"), 0o755);

      const { exitCode } = await execa("node", [cliPath, "hooks", "install"], {
        cwd: tempDir,
        reject: false,
      });

      expect(exitCode).toBe(0);

      // Original should be backed up
      const backup = await readFile(
        join(hooksDir, "pre-commit.original"),
        "utf-8",
      );
      expect(backup).toBe(existingHookContent);

      // New hook should call the original
      const newHook = await readFile(join(hooksDir, "pre-commit"), "utf-8");
      expect(newHook).toContain("pre-commit.original");
    });
  });

  describe("hooks uninstall", () => {
    it("removes installed hooks", async () => {
      // First install
      await execa("node", [cliPath, "hooks", "install"], {
        cwd: tempDir,
        reject: false,
      });

      // Then uninstall
      const { exitCode, stdout } = await execa(
        "node",
        [cliPath, "hooks", "uninstall"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("uninstalled");
    });

    it("restores original hooks when uninstalling", async () => {
      const hooksDir = join(tempDir, ".git", "hooks");
      const originalContent = '#!/bin/bash\necho "My original hook"';

      // Create existing hook
      await writeFile(join(hooksDir, "pre-commit"), originalContent);
      await chmod(join(hooksDir, "pre-commit"), 0o755);

      // Install (wraps the original)
      await execa("node", [cliPath, "hooks", "install"], {
        cwd: tempDir,
        reject: false,
      });

      // Uninstall
      await execa("node", [cliPath, "hooks", "uninstall"], {
        cwd: tempDir,
        reject: false,
      });

      // Original should be restored
      const restored = await readFile(join(hooksDir, "pre-commit"), "utf-8");
      expect(restored).toBe(originalContent);
    });
  });

  describe("hooks status", () => {
    it("reports not installed when hooks are missing", async () => {
      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "hooks", "status"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("pre-commit");
      expect(stdout).toContain("not installed");
    });

    it("reports installed status after installation", async () => {
      await execa("node", [cliPath, "hooks", "install"], {
        cwd: tempDir,
        reject: false,
      });

      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "hooks", "status"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("installed");
    });
  });

  describe("without git repository", () => {
    it("fails gracefully when no git repo exists", async () => {
      const noGitDir = await mkdtemp(join(tmpdir(), "workflow-no-git-"));

      try {
        const { exitCode, stderr } = await execa(
          "node",
          [cliPath, "hooks", "install"],
          {
            cwd: noGitDir,
            reject: false,
          },
        );

        expect(exitCode).toBe(1);
        expect(stderr).toContain("git");
      } finally {
        await rm(noGitDir, { recursive: true, force: true });
      }
    });
  });
});
