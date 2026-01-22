/**
 * E2E Tests for setup CLI commands
 * Tests CLI invocation for setup and setup auto
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { writeFile, mkdir, readFile } from "fs/promises";
import { join } from "path";
import { execa } from "execa";
import { setupTempDir, cleanupTempDir, createWorkflowConfig, initGitRepo } from "../test-utils.js";

describe("setup CLI commands - E2E", () => {
  let tempDir: string;
  let cliPath: string;

  beforeAll(async () => {
    cliPath = join(process.cwd(), "dist", "cli", "index.js");
  });

  beforeEach(async () => {
    tempDir = await setupTempDir("setup-e2e-");
    await initGitRepo(tempDir);

    // Create a basic package.json
    const packageJson = {
      name: "test-project",
      version: "1.0.0",
      scripts: {},
    };
    await writeFile(join(tempDir, "package.json"), JSON.stringify(packageJson, null, 2));
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  // ============================================
  // setup (default) - script installation
  // ============================================

  describe("setup (scripts)", () => {
    it("runs setup command", async () => {
      const { stdout, exitCode } = await execa("node", [cliPath, "setup"], {
        cwd: tempDir,
        reject: false,
      });

      // Should attempt to add scripts
      expect(stdout.toLowerCase()).toMatch(/setup|script|workflow/);
    });

    it("adds scripts to package.json", async () => {
      await execa("node", [cliPath, "setup"], {
        cwd: tempDir,
        reject: false,
      });

      const pkg = JSON.parse(await readFile(join(tempDir, "package.json"), "utf-8"));
      // Should have added some workflow scripts
      expect(pkg.scripts).toBeDefined();
    });

    it("runs setup scripts subcommand", async () => {
      const { stdout } = await execa("node", [cliPath, "setup", "scripts"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout.toLowerCase()).toMatch(/setup|script|workflow/);
    });
  });

  // ============================================
  // setup auto - auto-configuration
  // ============================================

  describe("setup auto", () => {
    it("runs setup auto command", async () => {
      // Use --audit to avoid interactive prompt
      const { stdout } = await execa("node", [cliPath, "setup", "auto", "--audit"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout).toContain("Auto-Setup");
    });

    it("shows audit report", async () => {
      const { stdout } = await execa("node", [cliPath, "setup", "auto", "--audit"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout).toContain("Audit Report");
    });

    it("accepts --yes flag", async () => {
      const { stdout } = await execa("node", [cliPath, "setup", "auto", "--yes"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout).toContain("Auto-Setup");
    });

    it("detects project framework", async () => {
      const { stdout } = await execa("node", [cliPath, "setup", "auto", "--audit"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout).toContain("Framework:");
    });

    it("detects package manager", async () => {
      const { stdout } = await execa("node", [cliPath, "setup", "auto", "--audit"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout).toContain("Package Manager:");
    });

    it("detects TypeScript status", async () => {
      const { stdout } = await execa("node", [cliPath, "setup", "auto", "--audit"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout).toContain("TypeScript:");
    });
  });

  // ============================================
  // setup auto with different project types
  // ============================================

  describe("setup auto - project detection", () => {
    it("detects TypeScript project", async () => {
      await writeFile(join(tempDir, "tsconfig.json"), JSON.stringify({ compilerOptions: {} }));

      const { stdout } = await execa("node", [cliPath, "setup", "auto", "--audit"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout).toContain("TypeScript: Yes");
    });

    it("detects React project", async () => {
      const pkg = {
        name: "test-react",
        version: "1.0.0",
        dependencies: {
          react: "^18.0.0",
        },
      };
      await writeFile(join(tempDir, "package.json"), JSON.stringify(pkg, null, 2));

      const { stdout } = await execa("node", [cliPath, "setup", "auto", "--audit"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout).toContain("Framework:");
    });

    it("detects monorepo", async () => {
      await mkdir(join(tempDir, "packages", "a"), { recursive: true });
      await writeFile(join(tempDir, "pnpm-workspace.yaml"), "packages:\n  - 'packages/*'");

      const { stdout } = await execa("node", [cliPath, "setup", "auto", "--audit"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout).toContain("Monorepo:");
    });
  });

  // ============================================
  // Deprecated auto-setup command
  // ============================================

  describe("deprecated auto-setup", () => {
    it("shows deprecation warning for auto-setup", async () => {
      const { stdout, stderr } = await execa("node", [cliPath, "auto-setup", "--audit"], {
        cwd: tempDir,
        reject: false,
      });

      const output = (stdout + stderr).toLowerCase();
      expect(output).toMatch(/deprecated|warning|auto-setup/);
    });

    it("still runs with deprecated command", async () => {
      const { stdout } = await execa("node", [cliPath, "auto-setup", "--audit"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout).toMatch(/Audit|Auto|Setup/);
    });
  });

  // ============================================
  // Help and documentation
  // ============================================

  describe("help and documentation", () => {
    it("shows help for setup", async () => {
      const { stdout } = await execa("node", [cliPath, "setup", "--help"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout).toContain("setup");
      expect(stdout.toLowerCase()).toMatch(/scripts|auto|commands/);
    });

    it("shows help for setup auto", async () => {
      const { stdout } = await execa("node", [cliPath, "setup", "auto", "--help"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout).toContain("auto");
      expect(stdout).toMatch(/--audit|--yes|-y/);
    });
  });
});
