import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm, mkdir, writeFile, readFile } from "fs/promises";
import { existsSync, writeFileSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  findTemplatesDirectory,
  installMandatoryTemplates,
  updateTemplates,
  type InstallTemplatesResult,
} from "./template-installer.js";
import { getMandatoryTemplateFilenames } from "../templates/metadata.js";

describe("template-installer", () => {
  let tempDir: string;
  let templatesDir: string;
  let projectDir: string;

  beforeEach(async () => {
    // Create temp directories
    tempDir = await mkdtemp(join(tmpdir(), "template-installer-test-"));
    templatesDir = join(tempDir, "templates");
    projectDir = join(tempDir, "project");

    // Create directories
    await mkdir(templatesDir, { recursive: true });
    await mkdir(projectDir, { recursive: true });

    // Create mock template files (all mandatory templates)
    const mandatoryFiles = getMandatoryTemplateFilenames();
    for (const filename of mandatoryFiles) {
      await writeFile(
        join(templatesDir, filename),
        `# ${filename}\n\nProject: {{projectName}}\nYear: {{year}}`,
        "utf-8",
      );
    }

    // Create some optional template files
    await writeFile(
      join(templatesDir, "DEPLOYMENT_STRATEGY.md"),
      "# Deployment\n\nProject: {{projectName}}",
      "utf-8",
    );
    await writeFile(
      join(templatesDir, "COMPONENT_LIBRARY.md"),
      "# Components\n\nProject: {{projectName}}",
      "utf-8",
    );
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("findTemplatesDirectory", () => {
    it("returns null when no templates directory found", () => {
      const result = findTemplatesDirectory("/nonexistent/path");
      expect(result).toBeNull();
    });

    it("finds templates in ../../templates path", async () => {
      // Create a nested directory structure
      const nestedDir = join(tempDir, "dist", "scripts");
      await mkdir(nestedDir, { recursive: true });

      // Templates should already be in tempDir/templates
      const result = findTemplatesDirectory(nestedDir);
      expect(result).toBe(join(tempDir, "templates"));
    });

    it("finds templates in ../templates path", async () => {
      const nestedDir = join(tempDir, "scripts");
      await mkdir(nestedDir, { recursive: true });

      const result = findTemplatesDirectory(nestedDir);
      expect(result).toBe(templatesDir);
    });
  });

  describe("installMandatoryTemplates", () => {
    it("installs all mandatory templates to new project", () => {
      const result = installMandatoryTemplates(projectDir, templatesDir, {
        silent: true,
      });

      expect(result.success).toBe(true);
      expect(result.installed.length).toBeGreaterThanOrEqual(7);
      expect(result.errors).toHaveLength(0);
      expect(result.guidelinesExisted).toBe(false);

      // Verify LIBRARY_INVENTORY.md is installed (now mandatory)
      expect(result.installed).toContain("LIBRARY_INVENTORY.md");

      // Verify all mandatory files exist
      const mandatoryFiles = getMandatoryTemplateFilenames();
      for (const filename of mandatoryFiles) {
        expect(existsSync(join(projectDir, "guidelines", filename))).toBe(true);
      }
    });

    it("renders template variables correctly", async () => {
      // Create package.json with project name
      await writeFile(
        join(projectDir, "package.json"),
        JSON.stringify({ name: "test-project" }),
        "utf-8",
      );

      const result = installMandatoryTemplates(projectDir, templatesDir, {
        silent: true,
      });

      expect(result.success).toBe(true);

      // Check template rendering
      const content = await readFile(
        join(projectDir, "guidelines", "AGENT_EDITING_INSTRUCTIONS.md"),
        "utf-8",
      );
      expect(content).toContain("test-project");
      expect(content).toContain(new Date().getFullYear().toString());
    });

    it("skips installation if guidelines directory exists (skipIfExists)", async () => {
      // Pre-create guidelines directory
      await mkdir(join(projectDir, "guidelines"), { recursive: true });

      const result = installMandatoryTemplates(projectDir, templatesDir, {
        silent: true,
        skipIfExists: true,
      });

      expect(result.success).toBe(true);
      expect(result.installed).toHaveLength(0);
      expect(result.guidelinesExisted).toBe(true);
    });

    it("installs templates even if guidelines exists when skipIfExists is false", async () => {
      // Pre-create guidelines directory
      await mkdir(join(projectDir, "guidelines"), { recursive: true });

      const result = installMandatoryTemplates(projectDir, templatesDir, {
        silent: true,
        skipIfExists: false,
      });

      expect(result.success).toBe(true);
      expect(result.installed.length).toBeGreaterThan(0);
      expect(result.guidelinesExisted).toBe(true);
    });

    it("only installs mandatory templates when mandatoryOnly is true", () => {
      const result = installMandatoryTemplates(projectDir, templatesDir, {
        silent: true,
        mandatoryOnly: true,
      });

      expect(result.success).toBe(true);
      // Should not include optional templates
      expect(result.installed).not.toContain("DEPLOYMENT_STRATEGY.md");
      expect(result.installed).not.toContain("COMPONENT_LIBRARY.md");
      // Should include mandatory templates
      expect(result.installed).toContain("LIBRARY_INVENTORY.md");
    });

    it("installs all templates when mandatoryOnly is false", () => {
      const result = installMandatoryTemplates(projectDir, templatesDir, {
        silent: true,
        mandatoryOnly: false,
      });

      expect(result.success).toBe(true);
      // Should include optional templates
      expect(result.installed).toContain("DEPLOYMENT_STRATEGY.md");
      expect(result.installed).toContain("COMPONENT_LIBRARY.md");
    });

    it("skips existing files without force flag", async () => {
      // First installation
      installMandatoryTemplates(projectDir, templatesDir, { silent: true });

      // Modify a file
      const filePath = join(
        projectDir,
        "guidelines",
        "AGENT_EDITING_INSTRUCTIONS.md",
      );
      await writeFile(filePath, "# Custom content", "utf-8");

      // Second installation without force
      const result = installMandatoryTemplates(projectDir, templatesDir, {
        silent: true,
        skipIfExists: false,
      });

      expect(result.skipped.length).toBeGreaterThan(0);

      // File should retain custom content
      const content = await readFile(filePath, "utf-8");
      expect(content).toBe("# Custom content");
    });

    it("overwrites existing files with force flag", async () => {
      // First installation
      installMandatoryTemplates(projectDir, templatesDir, { silent: true });

      // Modify a file
      const filePath = join(
        projectDir,
        "guidelines",
        "AGENT_EDITING_INSTRUCTIONS.md",
      );
      await writeFile(filePath, "# Custom content", "utf-8");

      // Second installation with force
      const result = installMandatoryTemplates(projectDir, templatesDir, {
        silent: true,
        skipIfExists: false,
        force: true,
      });

      expect(result.updated.length).toBeGreaterThan(0);
      expect(result.updated).toContain("AGENT_EDITING_INSTRUCTIONS.md");

      // File should have template content again (rendered with project name)
      const content = await readFile(filePath, "utf-8");
      expect(content).toContain("Project:");
      expect(content).not.toBe("# Custom content");
    });

    it("returns error when templates directory does not exist", () => {
      const result = installMandatoryTemplates(
        projectDir,
        "/nonexistent/templates",
        { silent: true },
      );

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("Templates directory not found");
    });

    it("handles missing package.json gracefully", () => {
      // No package.json in projectDir
      const result = installMandatoryTemplates(projectDir, templatesDir, {
        silent: true,
      });

      expect(result.success).toBe(true);
      // Should use directory name as project name
    });

    it("includes LIBRARY_INVENTORY.md in mandatory templates", () => {
      const mandatoryFiles = getMandatoryTemplateFilenames();
      expect(mandatoryFiles).toContain("LIBRARY_INVENTORY.md");
    });
  });

  describe("updateTemplates", () => {
    it("installs all templates including optional ones", () => {
      const result = updateTemplates(projectDir, templatesDir, {
        silent: true,
      });

      expect(result.success).toBe(true);
      // Should include optional templates
      expect(result.installed).toContain("DEPLOYMENT_STRATEGY.md");
      expect(result.installed).toContain("COMPONENT_LIBRARY.md");
      // Should include mandatory templates
      expect(result.installed).toContain("LIBRARY_INVENTORY.md");
    });

    it("updates existing templates with force flag", async () => {
      // First installation
      updateTemplates(projectDir, templatesDir, { silent: true });

      // Modify a file
      const filePath = join(
        projectDir,
        "guidelines",
        "LIBRARY_INVENTORY.md",
      );
      await writeFile(filePath, "# Custom library content", "utf-8");

      // Update with force
      const result = updateTemplates(projectDir, templatesDir, {
        silent: true,
        force: true,
      });

      expect(result.updated).toContain("LIBRARY_INVENTORY.md");

      // File should have template content (rendered with project name)
      const content = await readFile(filePath, "utf-8");
      expect(content).toContain("Project:");
      expect(content).not.toBe("# Custom library content");
    });

    it("skips existing templates without force flag", async () => {
      // First installation
      updateTemplates(projectDir, templatesDir, { silent: true });

      // Modify a file
      const filePath = join(
        projectDir,
        "guidelines",
        "TESTING_STRATEGY.md",
      );
      const customContent = "# My custom testing strategy";
      await writeFile(filePath, customContent, "utf-8");

      // Update without force
      const result = updateTemplates(projectDir, templatesDir, {
        silent: true,
        force: false,
      });

      expect(result.skipped).toContain("TESTING_STRATEGY.md");

      // File should retain custom content
      const content = await readFile(filePath, "utf-8");
      expect(content).toBe(customContent);
    });
  });

  describe("mandatory template consistency", () => {
    it("all mandatory templates are correctly identified", () => {
      const mandatoryFiles = getMandatoryTemplateFilenames();

      // Expected 7 mandatory templates after LIBRARY_INVENTORY.md promotion
      expect(mandatoryFiles).toHaveLength(7);

      // Verify specific mandatory templates
      expect(mandatoryFiles).toContain("AGENT_EDITING_INSTRUCTIONS.md");
      expect(mandatoryFiles).toContain("BRANCHING_STRATEGY.md");
      expect(mandatoryFiles).toContain("TESTING_STRATEGY.md");
      expect(mandatoryFiles).toContain("SELF_IMPROVEMENT_MANDATE.md");
      expect(mandatoryFiles).toContain("PATTERN_ANALYSIS_WORKFLOW.md");
      expect(mandatoryFiles).toContain("SINGLE_SOURCE_OF_TRUTH.md");
      expect(mandatoryFiles).toContain("LIBRARY_INVENTORY.md");
    });

    it("LIBRARY_INVENTORY.md is mandatory to prevent broken cross-references", () => {
      // This test documents the reason for the change
      const mandatoryFiles = getMandatoryTemplateFilenames();
      expect(mandatoryFiles).toContain("LIBRARY_INVENTORY.md");

      // LIBRARY_INVENTORY.md is referenced by:
      // - AGENT_EDITING_INSTRUCTIONS.md
      // - SINGLE_SOURCE_OF_TRUTH.md
      // Both of which are mandatory, so LIBRARY_INVENTORY.md must also be mandatory
    });
  });
});
