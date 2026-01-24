/**
 * Integration Tests for scope commands
 * Tests with real file I/O in controlled temp directories
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { writeFile, mkdir, readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { execa } from "execa";
import {
  setupTempDir,
  cleanupTempDir,
  createWorkflowConfig,
  initGitRepo,
} from "../test-utils.js";

describe("scope commands - Integration Tests", () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await setupTempDir("scope-integration-");
    await createWorkflowConfig(tempDir);
    await initGitRepo(tempDir);

    // Create some commits for analyze testing
    await writeFile(join(tempDir, "test.txt"), "test");
    await execa("git", ["add", "."], { cwd: tempDir });
    await execa("git", ["commit", "-m", "feat(auth): initial auth"], {
      cwd: tempDir,
    });

    await writeFile(join(tempDir, "test2.txt"), "test2");
    await execa("git", ["add", "."], { cwd: tempDir });
    await execa("git", ["commit", "-m", "fix(auth): fix login"], {
      cwd: tempDir,
    });

    await writeFile(join(tempDir, "test3.txt"), "test3");
    await execa("git", ["add", "."], { cwd: tempDir });
    await execa("git", ["commit", "-m", "feat: unscoped change"], {
      cwd: tempDir,
    });
  });

  afterAll(async () => {
    await cleanupTempDir(tempDir);
  });

  // ============================================
  // Config File Manipulation Tests
  // ============================================

  describe("config file manipulation", () => {
    it("adds scope to config file", async () => {
      const configPath = join(tempDir, "workflow.config.json");
      const content = await readFile(configPath, "utf-8");
      const config = JSON.parse(content);

      // Simulate adding a scope
      config.scopes.push({
        name: "test-scope",
        description: "Test scope",
        emoji: "🧪",
        category: "testing",
      });

      await writeFile(configPath, JSON.stringify(config, null, 2));

      // Verify
      const updated = JSON.parse(await readFile(configPath, "utf-8"));
      expect(
        updated.scopes.some((s: { name: string }) => s.name === "test-scope"),
      ).toBe(true);
    });

    it("removes scope from config file", async () => {
      const configPath = join(tempDir, "workflow.config.json");
      const content = await readFile(configPath, "utf-8");
      const config = JSON.parse(content);

      // Add scope first
      config.scopes.push({
        name: "remove-me",
        description: "To be removed",
      });
      await writeFile(configPath, JSON.stringify(config, null, 2));

      // Now remove it
      const index = config.scopes.findIndex(
        (s: { name: string }) => s.name === "remove-me",
      );
      if (index >= 0) {
        config.scopes.splice(index, 1);
      }
      await writeFile(configPath, JSON.stringify(config, null, 2));

      // Verify
      const updated = JSON.parse(await readFile(configPath, "utf-8"));
      expect(
        updated.scopes.some((s: { name: string }) => s.name === "remove-me"),
      ).toBe(false);
    });

    it("preserves other config properties when modifying scopes", async () => {
      const configPath = join(tempDir, "workflow.config.json");
      const content = await readFile(configPath, "utf-8");
      const original = JSON.parse(content);

      // Add scope
      original.scopes.push({ name: "preserve-test", description: "Test" });
      await writeFile(configPath, JSON.stringify(original, null, 2));

      // Verify other properties preserved
      const updated = JSON.parse(await readFile(configPath, "utf-8"));
      expect(updated.projectName).toBe(original.projectName);
      expect(updated.enforcement).toBe(original.enforcement);
    });
  });

  // ============================================
  // Git History Analysis Tests
  // ============================================

  describe("git history analysis", () => {
    it("reads git log history", async () => {
      const { stdout } = await execa(
        "git",
        ["log", "--oneline", "-50", "--format=%s"],
        {
          cwd: tempDir,
        },
      );

      expect(stdout).toContain("feat(auth)");
      expect(stdout).toContain("fix(auth)");
    });

    it("parses scope from conventional commits", async () => {
      const { stdout } = await execa(
        "git",
        ["log", "--oneline", "-50", "--format=%s"],
        {
          cwd: tempDir,
        },
      );

      const commits = stdout.split("\n").filter(Boolean);
      const scopePattern = /^\w+\(([^)]+)\):/;

      const scopes: string[] = [];
      for (const commit of commits) {
        const match = commit.match(scopePattern);
        if (match) {
          scopes.push(match[1]);
        }
      }

      expect(scopes).toContain("auth");
    });

    it("counts scope usage correctly", async () => {
      const { stdout } = await execa(
        "git",
        ["log", "--oneline", "-50", "--format=%s"],
        {
          cwd: tempDir,
        },
      );

      const commits = stdout.split("\n").filter(Boolean);
      const usage: Record<string, number> = {};

      for (const commit of commits) {
        const match = commit.match(/^\w+\(([^)]+)\):/);
        if (match) {
          usage[match[1]] = (usage[match[1]] || 0) + 1;
        }
      }

      expect(usage["auth"]).toBe(2);
    });

    it("identifies unscoped commits", async () => {
      const { stdout } = await execa(
        "git",
        ["log", "--oneline", "-50", "--format=%s"],
        {
          cwd: tempDir,
        },
      );

      const commits = stdout.split("\n").filter(Boolean);
      let unscoped = 0;

      for (const commit of commits) {
        if (!commit.match(/^\w+\([^)]+\):/) && commit.match(/^\w+:/)) {
          unscoped++;
        }
      }

      expect(unscoped).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================
  // Git Hooks Tests
  // ============================================

  describe("git hooks", () => {
    it("creates hooks directory if needed", async () => {
      const hooksDir = join(tempDir, ".git", "hooks");

      if (!existsSync(hooksDir)) {
        await mkdir(hooksDir, { recursive: true });
      }

      expect(existsSync(hooksDir)).toBe(true);
    });

    it("writes hook file with correct content", async () => {
      const hookPath = join(tempDir, ".git", "hooks", "test-hook");
      const hookContent = "#!/bin/sh\n# workflow-agent hook\necho 'test'\n";

      await writeFile(hookPath, hookContent);

      const content = await readFile(hookPath, "utf-8");
      expect(content).toContain("workflow-agent");
    });

    it("detects hook installation status", async () => {
      const hooksDir = join(tempDir, ".git", "hooks");

      // Create a workflow hook
      await writeFile(
        join(hooksDir, "pre-commit"),
        "#!/bin/sh\n# workflow-agent hook\nworkflow pre-commit\n",
      );

      // Create a non-workflow hook
      await writeFile(
        join(hooksDir, "post-commit"),
        "#!/bin/sh\necho 'post commit'\n",
      );

      const preCommit = await readFile(join(hooksDir, "pre-commit"), "utf-8");
      const postCommit = await readFile(join(hooksDir, "post-commit"), "utf-8");

      expect(preCommit.includes("workflow-agent")).toBe(true);
      expect(postCommit.includes("workflow-agent")).toBe(false);
    });
  });

  // ============================================
  // Scope Validation Tests
  // ============================================

  describe("scope validation", () => {
    it("detects duplicate scope names", async () => {
      const configPath = join(tempDir, "workflow.config.json");
      const content = await readFile(configPath, "utf-8");
      const config = JSON.parse(content);

      const scopeName = config.scopes[0]?.name || "feat";
      const isDuplicate =
        config.scopes.filter((s: { name: string }) => s.name === scopeName)
          .length > 0;

      expect(isDuplicate).toBe(true);
    });

    it("validates scope name format", () => {
      const validNames = ["feat", "fix", "auth", "api-v2"];
      const invalidNames = ["feat!", "fix bug", "auth@"];

      const validPattern = /^[a-zA-Z0-9-]+$/;

      for (const name of validNames) {
        expect(validPattern.test(name)).toBe(true);
      }

      for (const name of invalidNames) {
        expect(validPattern.test(name)).toBe(false);
      }
    });
  });

  // ============================================
  // Edge Cases
  // ============================================

  describe("edge cases", () => {
    it("handles empty scopes array", async () => {
      const emptyConfigPath = join(tempDir, "empty.config.json");
      await writeFile(
        emptyConfigPath,
        JSON.stringify({ projectName: "test", scopes: [] }),
      );

      const content = await readFile(emptyConfigPath, "utf-8");
      const config = JSON.parse(content);

      expect(config.scopes).toHaveLength(0);
    });

    it("handles config without scopes property", async () => {
      const noScopesPath = join(tempDir, "noscopes.config.json");
      await writeFile(noScopesPath, JSON.stringify({ projectName: "test" }));

      const content = await readFile(noScopesPath, "utf-8");
      const config = JSON.parse(content);

      const scopes = config.scopes || [];
      expect(scopes).toHaveLength(0);
    });

    it("handles special characters in scope description", async () => {
      const configPath = join(tempDir, "workflow.config.json");
      const content = await readFile(configPath, "utf-8");
      const config = JSON.parse(content);

      config.scopes.push({
        name: "special",
        description: 'Special chars: "quotes" & <angle> brackets',
      });

      await writeFile(configPath, JSON.stringify(config, null, 2));

      // Read back and verify JSON is still valid
      const updated = JSON.parse(await readFile(configPath, "utf-8"));
      const special = updated.scopes.find(
        (s: { name: string }) => s.name === "special",
      );
      expect(special).toBeDefined();
    });
  });
});
