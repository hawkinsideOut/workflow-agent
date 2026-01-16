import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm, mkdir, writeFile, readFile, chmod } from "fs/promises";
import { existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  isCI,
  getGitHooksDir,
  hasGitRepo,
  installHooks,
  uninstallHooks,
  getHookStatus,
  getAllHooksStatus,
} from "./hooks.js";

describe("hooks utility", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "workflow-hooks-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("isCI", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      vi.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("returns true when CI env var is set", () => {
      process.env.CI = "true";
      expect(isCI()).toBe(true);
    });

    it("returns true when GITHUB_ACTIONS is set", () => {
      process.env.GITHUB_ACTIONS = "true";
      expect(isCI()).toBe(true);
    });

    it("returns false when no CI env vars are set", () => {
      delete process.env.CI;
      delete process.env.GITHUB_ACTIONS;
      delete process.env.GITLAB_CI;
      delete process.env.CIRCLECI;
      delete process.env.TRAVIS;
      delete process.env.JENKINS_URL;
      delete process.env.BUILDKITE;
      delete process.env.TF_BUILD;
      expect(isCI()).toBe(false);
    });
  });

  describe("hasGitRepo", () => {
    it("returns false when no .git directory exists", () => {
      expect(hasGitRepo(tempDir)).toBe(false);
    });

    it("returns true when .git directory exists", async () => {
      await mkdir(join(tempDir, ".git"), { recursive: true });
      expect(hasGitRepo(tempDir)).toBe(true);
    });
  });

  describe("getGitHooksDir", () => {
    it("returns correct path to hooks directory", () => {
      expect(getGitHooksDir(tempDir)).toBe(join(tempDir, ".git", "hooks"));
    });
  });

  describe("installHooks", () => {
    it("fails when no git repository exists", async () => {
      const results = await installHooks(undefined, tempDir);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain("No git repository");
    });

    it("installs hooks successfully in a git repo", async () => {
      const hooksDir = join(tempDir, ".git", "hooks");
      await mkdir(hooksDir, { recursive: true });

      const results = await installHooks(undefined, tempDir);

      expect(results.every((r) => r.success)).toBe(true);
      expect(existsSync(join(hooksDir, "pre-commit"))).toBe(true);
      expect(existsSync(join(hooksDir, "commit-msg"))).toBe(true);
    });

    it("wraps existing hooks", async () => {
      const hooksDir = join(tempDir, ".git", "hooks");
      await mkdir(hooksDir, { recursive: true });
      await writeFile(
        join(hooksDir, "pre-commit"),
        '#!/bin/sh\necho "original"',
        "utf-8",
      );
      await chmod(join(hooksDir, "pre-commit"), 0o755);

      const results = await installHooks(undefined, tempDir);

      expect(
        results.find((r) => r.hookType === "pre-commit")?.wrappedExisting,
      ).toBe(true);
      expect(existsSync(join(hooksDir, "pre-commit.original"))).toBe(true);
    });
  });

  describe("uninstallHooks", () => {
    it("removes workflow hooks", async () => {
      const hooksDir = join(tempDir, ".git", "hooks");
      await mkdir(hooksDir, { recursive: true });

      await installHooks(undefined, tempDir);
      const results = await uninstallHooks(tempDir);

      expect(results.every((r) => r.success)).toBe(true);
      expect(existsSync(join(hooksDir, "pre-commit"))).toBe(false);
    });

    it("restores original hooks when uninstalling", async () => {
      const hooksDir = join(tempDir, ".git", "hooks");
      await mkdir(hooksDir, { recursive: true });

      const originalContent = '#!/bin/sh\necho "original"';
      await writeFile(join(hooksDir, "pre-commit"), originalContent, "utf-8");
      await chmod(join(hooksDir, "pre-commit"), 0o755);

      await installHooks(undefined, tempDir);
      const results = await uninstallHooks(tempDir);

      expect(
        results.find((r) => r.hookType === "pre-commit")?.wrappedExisting,
      ).toBe(true);

      const restoredContent = await readFile(
        join(hooksDir, "pre-commit"),
        "utf-8",
      );
      expect(restoredContent).toBe(originalContent);
    });
  });

  describe("getHookStatus", () => {
    it("returns not installed when hook does not exist", async () => {
      await mkdir(join(tempDir, ".git", "hooks"), { recursive: true });

      const status = await getHookStatus("pre-commit", tempDir);

      expect(status.installed).toBe(false);
      expect(status.hasExistingHook).toBe(false);
    });

    it("returns installed when workflow hook exists", async () => {
      const hooksDir = join(tempDir, ".git", "hooks");
      await mkdir(hooksDir, { recursive: true });
      await installHooks(undefined, tempDir);

      const status = await getHookStatus("pre-commit", tempDir);

      expect(status.installed).toBe(true);
    });
  });

  describe("getAllHooksStatus", () => {
    it("returns status for all hook types", async () => {
      await mkdir(join(tempDir, ".git", "hooks"), { recursive: true });

      const statuses = await getAllHooksStatus(tempDir);

      expect(statuses).toHaveLength(2);
      expect(statuses.map((s) => s.hookType)).toContain("pre-commit");
      expect(statuses.map((s) => s.hookType)).toContain("commit-msg");
    });
  });
});
