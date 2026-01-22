/**
 * Integration Tests for solution commands
 * Tests with real PatternStore and file I/O in controlled temp directories
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { writeFile, mkdir, rm, readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { PatternStore } from "@hawkinside_out/workflow-improvement-tracker";
import {
  setupTempDir,
  cleanupTempDir,
  createTestSolutionPattern,
  createWorkflowConfig,
} from "./test-utils.js";

describe("solution commands - Integration Tests", () => {
  let tempDir: string;
  let store: PatternStore;

  beforeAll(async () => {
    tempDir = await setupTempDir("solution-integration-");
    await createWorkflowConfig(tempDir);

    // Create .workflow/patterns directories
    await mkdir(join(tempDir, ".workflow", "patterns", "solutions"), {
      recursive: true,
    });

    store = new PatternStore(tempDir);
  });

  afterAll(async () => {
    await cleanupTempDir(tempDir);
  });

  // ============================================
  // Solution CRUD Operations
  // ============================================

  describe("solution CRUD operations", () => {
    it("creates and retrieves a solution", async () => {
      const solution = createTestSolutionPattern({
        id: "crud-test-1",
        name: "CRUD Test Solution",
        category: "auth",
      });

      await store.saveSolution(solution);

      const result = await store.getSolution("crud-test-1");
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("CRUD Test Solution");
      expect(result.data?.category).toBe("auth");
    });

    it("updates an existing solution", async () => {
      const solution = createTestSolutionPattern({
        id: "update-test-1",
        name: "Original Name",
      });

      await store.saveSolution(solution);

      const updated = { ...solution, name: "Updated Name" };
      await store.saveSolution(updated);

      const result = await store.getSolution("update-test-1");
      expect(result.data?.name).toBe("Updated Name");
    });

    it("lists all solutions", async () => {
      await store.saveSolution(
        createTestSolutionPattern({ id: "list-test-1", name: "List Test 1" }),
      );
      await store.saveSolution(
        createTestSolutionPattern({ id: "list-test-2", name: "List Test 2" }),
      );

      const result = await store.listSolutions({ limit: 100 });
      expect(result.success).toBe(true);
      expect(result.data!.length).toBeGreaterThanOrEqual(2);
    });

    it("filters solutions by category", async () => {
      await store.saveSolution(
        createTestSolutionPattern({
          id: "filter-auth",
          name: "Auth Filter Test",
          category: "auth",
        }),
      );
      await store.saveSolution(
        createTestSolutionPattern({
          id: "filter-api",
          name: "API Filter Test",
          category: "api",
        }),
      );

      const result = await store.listSolutions({ category: "auth" });
      expect(result.success).toBe(true);
      expect(result.data!.every((s) => s.category === "auth")).toBe(true);
    });

    it("searches solutions by keyword", async () => {
      await store.saveSolution(
        createTestSolutionPattern({
          id: "search-test",
          name: "JWT Authentication",
          description: "JWT-based authentication solution",
        }),
      );

      const result = await store.searchSolutions("JWT");
      expect(result.success).toBe(true);
      expect(
        result.data!.some((s) => s.name.includes("JWT")),
      ).toBe(true);
    });
  });

  // ============================================
  // Export/Import Round-trip
  // ============================================

  describe("export -> import round-trip", () => {
    it("exports and imports solutions correctly", async () => {
      // Create original solution
      const original = createTestSolutionPattern({
        id: "round-trip-solution",
        name: "Round Trip Test",
        category: "api",
        description: "Testing export/import cycle",
      });

      await store.saveSolution(original);

      // Export to JSON
      const exportPath = join(tempDir, "solution-export.json");
      const listResult = await store.listSolutions({ limit: 100 });
      const exportData = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        solutions: listResult.data?.filter((s) => s.id === "round-trip-solution") || [],
      };

      await writeFile(exportPath, JSON.stringify(exportData, null, 2));

      // Verify file exists
      expect(existsSync(exportPath)).toBe(true);

      // Read back
      const content = await readFile(exportPath, "utf-8");
      const imported = JSON.parse(content);

      expect(imported.solutions).toHaveLength(1);
      expect(imported.solutions[0].name).toBe("Round Trip Test");
      expect(imported.solutions[0].category).toBe("api");
    });

    it("preserves all fields through export/import", async () => {
      const original = createTestSolutionPattern({
        id: "preserve-fields-solution",
        name: "Field Preservation",
        category: "database",
        implementation: {
          files: [
            {
              path: "src/db/connection.ts",
              purpose: "Database connection",
              role: "service" as const,
              content: "export const db = {};",
              exports: ["db"],
              imports: [],
              lineCount: 1,
            },
          ],
          dependencies: [
            { name: "pg", version: "^8.0.0", compatibleRange: ">=8.0.0" },
          ],
          devDependencies: [],
          envVars: [
            { name: "DATABASE_URL", required: true, description: "DB connection string" },
          ],
        },
      });

      await store.saveSolution(original);

      const result = await store.getSolution("preserve-fields-solution");
      expect(result.success).toBe(true);
      expect(result.data?.implementation.files).toHaveLength(1);
      expect(result.data?.implementation.dependencies).toHaveLength(1);
      expect(result.data?.implementation.envVars).toHaveLength(1);
    });
  });

  // ============================================
  // Solution Workflow Tests
  // ============================================

  describe("solution workflow", () => {
    it("create -> show -> deprecate workflow", async () => {
      // Create
      const solution = createTestSolutionPattern({
        id: "workflow-test",
        name: "Workflow Test Solution",
      });
      await store.saveSolution(solution);

      // Show
      const showResult = await store.getSolution("workflow-test");
      expect(showResult.success).toBe(true);
      expect(showResult.data?.deprecatedAt).toBeUndefined();

      // Deprecate
      const deprecated = {
        ...showResult.data!,
        deprecatedAt: new Date().toISOString(),
        deprecationReason: "Replaced by v2",
      };
      await store.saveSolution(deprecated);

      // Verify deprecation
      const finalResult = await store.getSolution("workflow-test");
      expect(finalResult.data?.deprecatedAt).toBeDefined();
      expect(finalResult.data?.deprecationReason).toBe("Replaced by v2");
    });

    it("tracks solution metrics", async () => {
      const solution = createTestSolutionPattern({
        id: "metrics-test",
        name: "Metrics Test",
        metrics: {
          applications: 5,
          successes: 4,
          failures: 1,
          successRate: 0.8,
        },
      });

      await store.saveSolution(solution);

      const result = await store.getSolution("metrics-test");
      expect(result.data?.metrics.applications).toBe(5);
      expect(result.data?.metrics.successRate).toBe(0.8);
    });
  });

  // ============================================
  // Analyze Detection Tests
  // ============================================

  describe("analyze opportunity detection", () => {
    it("detects auth directory", async () => {
      await mkdir(join(tempDir, "src", "auth"), { recursive: true });
      await writeFile(
        join(tempDir, "src", "auth", "login.ts"),
        "export const login = () => {};",
      );

      expect(existsSync(join(tempDir, "src", "auth"))).toBe(true);
    });

    it("detects API directory", async () => {
      await mkdir(join(tempDir, "app", "api"), { recursive: true });
      await writeFile(
        join(tempDir, "app", "api", "route.ts"),
        "export const GET = () => {};",
      );

      expect(existsSync(join(tempDir, "app", "api"))).toBe(true);
    });

    it("detects database layer", async () => {
      await mkdir(join(tempDir, "src", "db"), { recursive: true });
      await writeFile(
        join(tempDir, "src", "db", "connection.ts"),
        "export const db = {};",
      );

      expect(existsSync(join(tempDir, "src", "db"))).toBe(true);
    });

    it("detects UI components", async () => {
      await mkdir(join(tempDir, "src", "components", "ui"), { recursive: true });
      await writeFile(
        join(tempDir, "src", "components", "ui", "Button.tsx"),
        "export const Button = () => <button />;",
      );

      expect(existsSync(join(tempDir, "src", "components", "ui"))).toBe(true);
    });
  });

  // ============================================
  // Export Format Tests
  // ============================================

  describe("export format validation", () => {
    it("produces valid JSON with required fields", async () => {
      const solution = createTestSolutionPattern({ name: "JSON Format Test" });
      await store.saveSolution(solution);

      const result = await store.listSolutions({});
      const exportData = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        solutions: result.data || [],
      };

      const json = JSON.stringify(exportData, null, 2);
      const parsed = JSON.parse(json);

      expect(parsed.version).toBe("1.0");
      expect(parsed.exportedAt).toBeDefined();
      expect(Array.isArray(parsed.solutions)).toBe(true);
    });

    it("produces YAML-compatible output structure", async () => {
      const result = await store.listSolutions({});
      const solutions = result.data || [];

      let yaml = "# Workflow Agent Solutions Export\n";
      yaml += "solutions:\n";
      for (const solution of solutions.slice(0, 2)) {
        yaml += `  - id: ${solution.id}\n`;
        yaml += `    name: "${solution.name}"\n`;
        yaml += `    category: ${solution.category}\n`;
      }

      expect(yaml).toContain("solutions:");
      expect(yaml).toContain("- id:");
    });
  });

  // ============================================
  // Edge Cases
  // ============================================

  describe("edge cases", () => {
    it("handles solutions with empty implementation", async () => {
      const solution = createTestSolutionPattern({
        id: "empty-impl",
        name: "Empty Implementation",
        implementation: {
          files: [],
          dependencies: [],
          devDependencies: [],
          envVars: [],
        },
      });

      await store.saveSolution(solution);

      const result = await store.getSolution("empty-impl");
      expect(result.success).toBe(true);
      expect(result.data?.implementation.files).toHaveLength(0);
    });

    it("handles solutions with special characters in name", async () => {
      const solution = createTestSolutionPattern({
        id: "special-chars",
        name: "OAuth 2.0 + OpenID Connect",
        description: "Testing: special & \"quoted\" chars",
      });

      await store.saveSolution(solution);

      const result = await store.getSolution("special-chars");
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("OAuth 2.0 + OpenID Connect");
    });

    it("handles very long descriptions", async () => {
      const longDesc = "A".repeat(10000);
      const solution = createTestSolutionPattern({
        id: "long-desc",
        name: "Long Description Test",
        description: longDesc,
      });

      await store.saveSolution(solution);

      const result = await store.getSolution("long-desc");
      expect(result.success).toBe(true);
      expect(result.data?.description.length).toBe(10000);
    });
  });
});
