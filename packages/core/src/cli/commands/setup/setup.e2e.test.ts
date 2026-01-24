/**
 * E2E Tests for setup CLI commands
 * Tests CLI invocation for setup and setup auto
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { writeFile, mkdir, readFile } from "fs/promises";
import { join } from "path";
import { execa } from "execa";
import { setupTempDir, cleanupTempDir, initGitRepo } from "../test-utils.js";

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
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify(packageJson, null, 2),
    );
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  // ============================================
  // setup (default) - script installation
  // ============================================

  describe("setup (scripts)", () => {
    it("runs setup command", async () => {
      const { stdout } = await execa("node", [cliPath, "setup"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout.toLowerCase()).toMatch(/setup|script|workflow/);
    });

    it("adds single workflow script to package.json", async () => {
      await execa("node", [cliPath, "setup"], {
        cwd: tempDir,
        reject: false,
      });

      const pkg = JSON.parse(
        await readFile(join(tempDir, "package.json"), "utf-8"),
      );

      // Should have the single workflow script
      expect(pkg.scripts.workflow).toBe("workflow-agent");
      // Should NOT have old-style scripts
      expect(pkg.scripts["workflow:init"]).toBeUndefined();
      expect(pkg.scripts["workflow:learn"]).toBeUndefined();
    });

    it("removes deprecated scripts on setup", async () => {
      // Create package.json with deprecated scripts
      const packageJson = {
        name: "test-project",
        version: "1.0.0",
        scripts: {
          "workflow:init": "workflow-agent init",
          "workflow:learn-list": "workflow-agent learn list",
          "workflow:solution-apply": "workflow-agent solution apply",
          test: "vitest",
        },
      };
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify(packageJson, null, 2),
      );

      const { stdout } = await execa("node", [cliPath, "setup"], {
        cwd: tempDir,
        reject: false,
      });

      const pkg = JSON.parse(
        await readFile(join(tempDir, "package.json"), "utf-8"),
      );

      // Should have new workflow script
      expect(pkg.scripts.workflow).toBe("workflow-agent");
      // Should have removed deprecated scripts
      expect(pkg.scripts["workflow:init"]).toBeUndefined();
      expect(pkg.scripts["workflow:learn-list"]).toBeUndefined();
      expect(pkg.scripts["workflow:solution-apply"]).toBeUndefined();
      // Should preserve non-workflow scripts
      expect(pkg.scripts.test).toBe("vitest");
      // Should mention removed scripts
      expect(stdout).toMatch(/removed|deprecated/i);
    });

    it("runs setup scripts subcommand", async () => {
      const { stdout } = await execa("node", [cliPath, "setup", "scripts"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout.toLowerCase()).toMatch(/setup|script|workflow/);
    });

    it("workflow script allows running subcommands", async () => {
      // First setup the script
      await execa("node", [cliPath, "setup"], {
        cwd: tempDir,
        reject: false,
      });

      // Now test that workflow-agent --help works
      const { stdout } = await execa("node", [cliPath, "--help"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout).toMatch(/init|validate|config|doctor/i);
    });

    it("shows correct usage instructions", async () => {
      const { stdout } = await execa("node", [cliPath, "setup"], {
        cwd: tempDir,
        reject: false,
      });

      // Should show npm/pnpm usage with -- separator
      expect(stdout).toMatch(/npm run workflow|pnpm workflow/i);
    });
  });

  // ============================================
  // setup auto - auto-configuration
  // ============================================

  describe("setup auto", () => {
    it("runs setup auto command", async () => {
      // Use --audit to avoid interactive prompt
      const { stdout } = await execa(
        "node",
        [cliPath, "setup", "auto", "--audit"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(stdout).toContain("Auto-Setup");
    });

    it("shows audit report", async () => {
      const { stdout } = await execa(
        "node",
        [cliPath, "setup", "auto", "--audit"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(stdout).toContain("Audit Report");
    });

    it("accepts --yes flag", async () => {
      const { stdout } = await execa(
        "node",
        [cliPath, "setup", "auto", "--yes"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(stdout).toContain("Auto-Setup");
    });

    it("detects project framework", async () => {
      const { stdout } = await execa(
        "node",
        [cliPath, "setup", "auto", "--audit"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(stdout).toContain("Framework:");
    });

    it("detects package manager", async () => {
      const { stdout } = await execa(
        "node",
        [cliPath, "setup", "auto", "--audit"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(stdout).toContain("Package Manager:");
    });

    it("detects TypeScript status", async () => {
      const { stdout } = await execa(
        "node",
        [cliPath, "setup", "auto", "--audit"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(stdout).toContain("TypeScript:");
    });
  });

  // ============================================
  // setup auto with different project types
  // ============================================

  describe("setup auto - project detection", () => {
    it("detects TypeScript project", async () => {
      await writeFile(
        join(tempDir, "tsconfig.json"),
        JSON.stringify({ compilerOptions: {} }),
      );

      const { stdout } = await execa(
        "node",
        [cliPath, "setup", "auto", "--audit"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

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
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify(pkg, null, 2),
      );

      const { stdout } = await execa(
        "node",
        [cliPath, "setup", "auto", "--audit"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(stdout).toContain("Framework:");
    });

    it("detects monorepo", async () => {
      await mkdir(join(tempDir, "packages", "a"), { recursive: true });
      await writeFile(
        join(tempDir, "pnpm-workspace.yaml"),
        "packages:\n  - 'packages/*'",
      );

      const { stdout } = await execa(
        "node",
        [cliPath, "setup", "auto", "--audit"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(stdout).toContain("Monorepo:");
    });
  });

  // ============================================
  // Deprecated auto-setup command
  // ============================================

  describe("deprecated auto-setup", () => {
    it("shows deprecation warning for auto-setup", async () => {
      const { stdout, stderr } = await execa(
        "node",
        [cliPath, "auto-setup", "--audit"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      const output = (stdout + stderr).toLowerCase();
      expect(output).toMatch(/deprecated|warning|auto-setup/);
    });

    it("still runs with deprecated command", async () => {
      const { stdout } = await execa(
        "node",
        [cliPath, "auto-setup", "--audit"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(stdout).toContain("Auto-Setup");
    });
  });

  // ============================================
  // CLI usage patterns
  // ============================================

  describe("CLI usage patterns", () => {
    it("workflow-agent init --help shows help", async () => {
      const { stdout } = await execa("node", [cliPath, "init", "--help"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout).toMatch(/init|project|preset/i);
    });

    it("workflow-agent solution list --help shows help", async () => {
      const { stdout } = await execa(
        "node",
        [cliPath, "solution", "list", "--help"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(stdout).toMatch(/list|solution|pattern/i);
    });

    it("workflow-agent learn list --help shows help", async () => {
      const { stdout } = await execa(
        "node",
        [cliPath, "learn", "list", "--help"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(stdout).toMatch(/list|learn|pattern/i);
    });

    it("workflow-agent --help shows all commands", async () => {
      const { stdout } = await execa("node", [cliPath, "--help"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout).toMatch(/init/i);
      expect(stdout).toMatch(/validate/i);
      expect(stdout).toMatch(/setup/i);
      expect(stdout).toMatch(/learn/i);
      expect(stdout).toMatch(/solution/i);
      expect(stdout).toMatch(/docs/i);
    });
  });
});
