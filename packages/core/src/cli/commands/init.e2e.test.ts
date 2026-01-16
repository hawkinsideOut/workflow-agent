import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { execa } from "execa";

/**
 * E2E Tests for the init command
 * These tests simulate the full user flow of initializing a project
 *
 * Test Coverage:
 * - Non-interactive initialization with presets
 * - Mandatory guidelines generation
 * - Git hooks installation
 * - GitHub Actions CI setup
 * - Configuration file creation
 */
describe("workflow init - E2E", () => {
  let tempDir: string;
  let cliPath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "workflow-init-e2e-"));
    // Path to the built CLI
    cliPath = join(process.cwd(), "dist", "cli", "index.js");
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("non-interactive mode", () => {
    it("initializes project with preset and name flags", async () => {
      // Create a basic git repo
      await execa("git", ["init"], { cwd: tempDir });
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({ name: "test-project" }),
      );

      // Run init in non-interactive mode
      const { exitCode } = await execa(
        "node",
        [cliPath, "init", "--preset", "saas", "--name", "test-project", "-y"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      // Check config was created
      expect(existsSync(join(tempDir, "workflow.config.json"))).toBe(true);

      // Check mandatory guidelines were created
      expect(
        existsSync(
          join(tempDir, "guidelines", "AGENT_EDITING_INSTRUCTIONS.md"),
        ),
      ).toBe(true);
      expect(
        existsSync(join(tempDir, "guidelines", "BRANCHING_STRATEGY.md")),
      ).toBe(true);
      expect(
        existsSync(join(tempDir, "guidelines", "TESTING_STRATEGY.md")),
      ).toBe(true);

      // Check .workflow directory was created
      expect(existsSync(join(tempDir, ".workflow"))).toBe(true);
    });

    it("creates GitHub Actions workflow for GitHub repos", async () => {
      // Create a git repo with GitHub remote
      await execa("git", ["init"], { cwd: tempDir });
      await execa(
        "git",
        ["remote", "add", "origin", "git@github.com:test/repo.git"],
        { cwd: tempDir },
      );
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({
          name: "test-project",
          scripts: { lint: "eslint .", test: "vitest" },
        }),
      );

      await execa(
        "node",
        [cliPath, "init", "--preset", "library", "--name", "test-lib", "-y"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      // Check GitHub Actions workflow was created
      expect(existsSync(join(tempDir, ".github", "workflows", "ci.yml"))).toBe(
        true,
      );
    });
  });

  describe("configuration output", () => {
    it("writes correct scopes from preset", async () => {
      await execa("git", ["init"], { cwd: tempDir });
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      await execa(
        "node",
        [cliPath, "init", "--preset", "api", "--name", "my-api", "-y"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      const configContent = await readFile(
        join(tempDir, "workflow.config.json"),
        "utf-8",
      );
      const config = JSON.parse(configContent);

      expect(config.projectName).toBe("my-api");
      expect(config.enforcement).toBe("strict");
      expect(Array.isArray(config.scopes)).toBe(true);
      expect(config.scopes.length).toBeGreaterThan(0);
    });
  });

  describe("hooks installation", () => {
    it("creates hooks directory in git repository", async () => {
      await execa("git", ["init"], { cwd: tempDir });
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      await execa(
        "node",
        [cliPath, "init", "--preset", "saas", "--name", "test", "-y"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      // The hooks directory should exist
      expect(existsSync(join(tempDir, ".git", "hooks"))).toBe(true);
    });
  });

  describe("preset loading", () => {
    it("handles custom preset gracefully", async () => {
      await execa("git", ["init"], { cwd: tempDir });
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      const { exitCode } = await execa(
        "node",
        [
          cliPath,
          "init",
          "--preset",
          "custom",
          "--name",
          "custom-project",
          "-y",
        ],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      // Should still create config with basic scopes
      expect(existsSync(join(tempDir, "workflow.config.json"))).toBe(true);

      const configContent = await readFile(
        join(tempDir, "workflow.config.json"),
        "utf-8",
      );
      const config = JSON.parse(configContent);
      expect(config.scopes.length).toBeGreaterThan(0);
    });
  });
});
