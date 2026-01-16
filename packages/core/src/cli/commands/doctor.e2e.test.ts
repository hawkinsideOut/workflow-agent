import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { execa } from "execa";
import { getMandatoryTemplateFilenames } from "../../templates/metadata.js";

/**
 * E2E Tests for the doctor command
 * Tests the health check functionality including:
 * - Configuration validation
 * - Guidelines presence check
 * - Git hooks status
 * - CI/CD setup validation
 */
describe("workflow doctor - E2E", () => {
  let tempDir: string;
  let cliPath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "workflow-doctor-e2e-"));
    cliPath = join(process.cwd(), "dist", "cli", "index.js");
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("without configuration", () => {
    it("fails with error when no config exists", async () => {
      const { exitCode } = await execa("node", [cliPath, "doctor"], {
        cwd: tempDir,
        reject: false,
      });

      expect(exitCode).toBe(1);
    });
  });

  describe("with valid configuration", () => {
    beforeEach(async () => {
      // Create a valid workflow setup
      await writeFile(
        join(tempDir, "workflow.config.json"),
        JSON.stringify({
          projectName: "test-project",
          scopes: [
            { name: "feat", description: "New features and enhancements" },
          ],
          enforcement: "strict",
          language: "en",
        }),
      );

      // Create guidelines directory with mandatory templates
      const guidelinesDir = join(tempDir, "guidelines");
      await mkdir(guidelinesDir, { recursive: true });
      for (const filename of getMandatoryTemplateFilenames()) {
        await writeFile(join(guidelinesDir, filename), `# ${filename}`);
      }
    });

    it("passes health check with all mandatory guidelines", async () => {
      const { stdout } = await execa("node", [cliPath, "doctor"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout).toContain("Configuration loaded successfully");
      expect(stdout).toContain("mandatory guidelines present");
    });
  });

  describe("missing guidelines", () => {
    beforeEach(async () => {
      await writeFile(
        join(tempDir, "workflow.config.json"),
        JSON.stringify({
          projectName: "test-project",
          scopes: [
            { name: "feat", description: "New features and enhancements" },
          ],
        }),
      );
      // Create empty guidelines dir
      await mkdir(join(tempDir, "guidelines"), { recursive: true });
    });

    it("reports missing mandatory guidelines", async () => {
      const { stdout, exitCode } = await execa("node", [cliPath, "doctor"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout).toContain("Missing");
      expect(exitCode).toBe(1);
    });
  });

  describe("--check-guidelines-only flag", () => {
    it("exits 0 when guidelines are present", async () => {
      await writeFile(
        join(tempDir, "workflow.config.json"),
        JSON.stringify({
          projectName: "test",
          scopes: [
            { name: "feat", description: "New features and enhancements" },
          ],
        }),
      );

      const guidelinesDir = join(tempDir, "guidelines");
      await mkdir(guidelinesDir, { recursive: true });
      for (const filename of getMandatoryTemplateFilenames()) {
        await writeFile(join(guidelinesDir, filename), `# ${filename}`);
      }

      const { exitCode } = await execa(
        "node",
        [cliPath, "doctor", "--check-guidelines-only"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
    });

    it("exits 1 when guidelines are missing", async () => {
      await writeFile(
        join(tempDir, "workflow.config.json"),
        JSON.stringify({
          projectName: "test",
          scopes: [
            { name: "feat", description: "New features and enhancements" },
          ],
          enforcement: "strict",
          language: "en",
        }),
      );
      await mkdir(join(tempDir, "guidelines"), { recursive: true });

      const { exitCode } = await execa(
        "node",
        [cliPath, "doctor", "--check-guidelines-only"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(1);
    });
  });

  describe("git hooks check", () => {
    beforeEach(async () => {
      await writeFile(
        join(tempDir, "workflow.config.json"),
        JSON.stringify({
          projectName: "test",
          scopes: [
            { name: "feat", description: "New features and enhancements" },
          ],
          enforcement: "strict",
          language: "en",
        }),
      );

      const guidelinesDir = join(tempDir, "guidelines");
      await mkdir(guidelinesDir, { recursive: true });
      for (const filename of getMandatoryTemplateFilenames()) {
        await writeFile(join(guidelinesDir, filename), `# ${filename}`);
      }
    });

    it("reports when no git repository exists", async () => {
      const { stdout, stderr, exitCode } = await execa(
        "node",
        [cliPath, "doctor"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      // Check combined output - hooks check may report warning for no git repo
      const output = stdout + stderr;
      expect(output).toMatch(/No git repository|git repository/i);
    });

    it("reports hooks status when git repo exists", async () => {
      await execa("git", ["init"], { cwd: tempDir });

      const { stdout, stderr } = await execa("node", [cliPath, "doctor"], {
        cwd: tempDir,
        reject: false,
      });

      // Check combined output for git hooks section
      const output = stdout + stderr;
      expect(output).toMatch(/Git Hooks|hooks/i);
    });
  });
});
