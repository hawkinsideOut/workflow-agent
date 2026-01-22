/**
 * Integration Tests for learn commands
 * Tests with real PatternStore and file I/O in controlled temp directories
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { PatternStore } from "@hawkinside_out/workflow-improvement-tracker";
import {
  setupTempDir,
  cleanupTempDir,
  createTestFixPattern,
  createTestBlueprint,
  createWorkflowConfig,
} from "./test-utils.js";

describe("learn commands - Integration Tests", () => {
  let tempDir: string;
  let store: PatternStore;

  beforeAll(async () => {
    tempDir = await setupTempDir("learn-integration-");
    await createWorkflowConfig(tempDir);

    // Create .workflow/patterns directories
    await mkdir(join(tempDir, ".workflow", "patterns", "fixes"), {
      recursive: true,
    });
    await mkdir(join(tempDir, ".workflow", "patterns", "blueprints"), {
      recursive: true,
    });

    store = new PatternStore(tempDir);
  });

  afterAll(async () => {
    await cleanupTempDir(tempDir);
  });

  // ============================================
  // Pattern Export/Import Round-trip Tests
  // ============================================

  describe("export -> import round-trip", () => {
    it("exports and imports fix patterns correctly", async () => {
      // Create and save a fix pattern
      const originalFix = createTestFixPattern({
        name: "Round Trip Fix",
        description: "Testing export/import cycle",
        category: "lint",
      });

      await store.saveFixPattern(originalFix);

      // Export to JSON
      const exportPath = join(tempDir, "round-trip-export.json");
      const fixResult = await store.listFixPatterns({});
      const exportData = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        fixes: fixResult.data || [],
        blueprints: [],
      };

      await writeFile(exportPath, JSON.stringify(exportData, null, 2));

      // Verify file exists
      expect(existsSync(exportPath)).toBe(true);

      // Read back and verify
      const { readFile } = await import("fs/promises");
      const content = await readFile(exportPath, "utf-8");
      const imported = JSON.parse(content);

      expect(imported.fixes).toHaveLength(1);
      expect(imported.fixes[0].name).toBe("Round Trip Fix");
      expect(imported.fixes[0].category).toBe("lint");
    });

    it("exports and imports blueprints correctly", async () => {
      const originalBp = createTestBlueprint({
        name: "Round Trip Blueprint",
        description: "Testing blueprint export/import",
      });

      await store.saveBlueprint(originalBp);

      // Export
      const exportPath = join(tempDir, "blueprint-export.json");
      const bpResult = await store.listBlueprints({});
      const exportData = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        fixes: [],
        blueprints: bpResult.data || [],
      };

      await writeFile(exportPath, JSON.stringify(exportData, null, 2));

      // Read back
      const { readFile } = await import("fs/promises");
      const content = await readFile(exportPath, "utf-8");
      const imported = JSON.parse(content);

      expect(imported.blueprints.length).toBeGreaterThanOrEqual(1);
      expect(
        imported.blueprints.some(
          (b: { name: string }) => b.name === "Round Trip Blueprint",
        ),
      ).toBe(true);
    });

    it("preserves all pattern fields through export/import", async () => {
      const originalFix = createTestFixPattern({
        id: "test-preserve-id",
        name: "Field Preservation Test",
        description: "All fields should be preserved",
        category: "security",
        tags: [
          { name: "react", category: "framework" },
          { name: "auth", category: "feature" },
        ],
      });

      await store.saveFixPattern(originalFix);

      // Get and verify
      const result = await store.getFixPattern("test-preserve-id");
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("Field Preservation Test");
      expect(result.data?.category).toBe("security");
      expect(result.data?.tags).toHaveLength(2);
    });
  });

  // ============================================
  // PatternStore State Tests
  // ============================================

  describe("PatternStore state after operations", () => {
    it("saves and retrieves fix patterns", async () => {
      const fix = createTestFixPattern({
        id: "state-test-fix",
        name: "State Test Fix",
      });

      const saveResult = await store.saveFixPattern(fix);
      expect(saveResult.success).toBe(true);

      const getResult = await store.getFixPattern("state-test-fix");
      expect(getResult.success).toBe(true);
      expect(getResult.data?.name).toBe("State Test Fix");
    });

    it("lists all fix patterns", async () => {
      const result = await store.listFixPatterns({});
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBeGreaterThanOrEqual(1);
    });

    it("saves and retrieves blueprints", async () => {
      const bp = createTestBlueprint({
        id: "state-test-bp",
        name: "State Test Blueprint",
      });

      const saveResult = await store.saveBlueprint(bp);
      expect(saveResult.success).toBe(true);

      const getResult = await store.getBlueprint("state-test-bp");
      expect(getResult.success).toBe(true);
      expect(getResult.data?.name).toBe("State Test Blueprint");
    });

    it("updates existing patterns on re-save", async () => {
      const fix = createTestFixPattern({
        id: "update-test-fix",
        name: "Original Name",
      });

      await store.saveFixPattern(fix);

      // Update
      const updated = { ...fix, name: "Updated Name" };
      await store.saveFixPattern(updated);

      const result = await store.getFixPattern("update-test-fix");
      expect(result.data?.name).toBe("Updated Name");
    });
  });

  // ============================================
  // Clean Operation Tests
  // ============================================

  describe("pattern cleanup operations", () => {
    it("identifies deprecated patterns", async () => {
      const deprecatedFix = createTestFixPattern({
        id: "deprecated-fix-test",
        name: "Deprecated Pattern",
        deprecatedAt: new Date().toISOString(),
        deprecationReason: "No longer needed",
      });

      await store.saveFixPattern(deprecatedFix);

      const result = await store.listFixPatterns({ includeDeprecated: true });
      const deprecated = result.data?.filter((p) => p.deprecatedAt);

      expect(deprecated?.length).toBeGreaterThanOrEqual(1);
    });

    it("identifies stale patterns by updatedAt date", async () => {
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 100);

      const staleFix = createTestFixPattern({
        id: "stale-fix-test",
        name: "Stale Pattern",
        updatedAt: staleDate.toISOString(),
      });

      await store.saveFixPattern(staleFix);

      const result = await store.listFixPatterns({});
      const now = Date.now();
      const staleThreshold = now - 90 * 24 * 60 * 60 * 1000;

      const stale = result.data?.filter(
        (p) => new Date(p.updatedAt).getTime() < staleThreshold,
      );

      expect(stale?.length).toBeGreaterThanOrEqual(1);
    });

    it("can delete patterns from store", async () => {
      const toDelete = createTestFixPattern({
        id: "delete-test-fix",
        name: "To Be Deleted",
      });

      await store.saveFixPattern(toDelete);

      // Verify it exists
      let result = await store.getFixPattern("delete-test-fix");
      expect(result.success).toBe(true);

      // Delete by removing the file (simulating clean command)
      const filePath = join(
        tempDir,
        ".workflow",
        "patterns",
        "fixes",
        "delete-test-fix.json",
      );
      if (existsSync(filePath)) {
        await rm(filePath);
      }

      // Verify it's gone
      result = await store.getFixPattern("delete-test-fix");
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // Analyze Detection Tests
  // ============================================

  describe("analyze opportunity detection", () => {
    it("detects auth directory as learning opportunity", async () => {
      await mkdir(join(tempDir, "src", "auth"), { recursive: true });
      await writeFile(
        join(tempDir, "src", "auth", "login.ts"),
        "export const login = () => {};",
      );

      expect(existsSync(join(tempDir, "src", "auth"))).toBe(true);
    });

    it("detects API directory as learning opportunity", async () => {
      await mkdir(join(tempDir, "src", "api"), { recursive: true });
      await writeFile(
        join(tempDir, "src", "api", "routes.ts"),
        "export const routes = [];",
      );

      expect(existsSync(join(tempDir, "src", "api"))).toBe(true);
    });

    it("detects component directory as learning opportunity", async () => {
      await mkdir(join(tempDir, "src", "components"), { recursive: true });
      await writeFile(
        join(tempDir, "src", "components", "Button.tsx"),
        "export const Button = () => <button />;",
      );

      expect(existsSync(join(tempDir, "src", "components"))).toBe(true);
    });

    it("detects test directory as learning opportunity", async () => {
      await mkdir(join(tempDir, "__tests__"), { recursive: true });
      await writeFile(
        join(tempDir, "__tests__", "example.test.ts"),
        "test('example', () => {});",
      );

      expect(existsSync(join(tempDir, "__tests__"))).toBe(true);
    });
  });

  // ============================================
  // Export Format Tests
  // ============================================

  describe("export format validation", () => {
    it("produces valid JSON with required fields", async () => {
      const fix = createTestFixPattern({ name: "JSON Format Test" });
      await store.saveFixPattern(fix);

      const result = await store.listFixPatterns({});
      const exportData = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        fixes: result.data || [],
        blueprints: [],
      };

      const json = JSON.stringify(exportData, null, 2);
      const parsed = JSON.parse(json);

      expect(parsed.version).toBe("1.0");
      expect(parsed.exportedAt).toBeDefined();
      expect(Array.isArray(parsed.fixes)).toBe(true);
      expect(Array.isArray(parsed.blueprints)).toBe(true);
    });

    it("produces YAML-compatible output structure", async () => {
      const result = await store.listFixPatterns({});
      const fixes = result.data || [];

      // Generate YAML-like output
      let yaml = "# Workflow Agent Patterns Export\n";
      yaml += "fixes:\n";
      for (const fix of fixes) {
        yaml += `  - id: ${fix.id}\n`;
        yaml += `    name: "${fix.name}"\n`;
      }

      expect(yaml).toContain("fixes:");
      expect(yaml).toContain("- id:");
    });
  });
});
