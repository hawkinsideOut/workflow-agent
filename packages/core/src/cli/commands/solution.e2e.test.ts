import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import {
  PatternStore,
  type SolutionPattern,
  type SolutionCategory,
} from "@hawkinside_out/workflow-improvement-tracker";

/**
 * E2E Tests for the solution commands
 * Tests the solution pattern functionality including:
 * - Capturing solution patterns
 * - Listing solutions
 * - Searching solutions
 * - Applying solutions
 * - Deprecating solutions
 * - Statistics display
 */

// Test directory for each test
let testDir: string;
let store: PatternStore;

// Helper to create a valid solution pattern
function createTestSolution(
  overrides: Partial<SolutionPattern> = {},
): SolutionPattern {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: "Test Solution",
    description: "A test solution for e2e testing",
    category: "auth" as SolutionCategory,
    tags: [{ name: "next", category: "framework" as const }],
    problem: {
      description: "How to implement authentication",
      keywords: ["auth", "login", "jwt"],
      errorPatterns: [],
    },
    implementation: {
      files: [
        {
          path: "src/auth/login.ts",
          purpose: "Login handler",
          role: "service" as const,
          content: 'export function login() { return "logged in"; }',
          exports: ["login"],
          imports: [],
          lineCount: 1,
        },
      ],
      dependencies: [
        { name: "jsonwebtoken", version: "^9.0.0", compatibleRange: ">=9.0.0" },
      ],
      devDependencies: [],
      envVars: [
        {
          name: "JWT_SECRET",
          required: true,
          description: "Secret key for JWT signing",
        },
      ],
    },
    architecture: {
      entryPoints: ["src/auth/login.ts"],
      dataFlow: "Request -> Login -> JWT -> Response",
      keyDecisions: ["Using JWT for stateless auth"],
    },
    compatibility: {
      framework: "next",
      frameworkVersion: ">=14.0.0",
      runtime: "node",
      runtimeVersion: ">=18.0.0",
      dependencies: [],
    },
    metrics: {
      successRate: 0,
      applications: 0,
      successes: 0,
      failures: 0,
    },
    source: "manual" as const,
    isPrivate: false,
    createdAt: now,
    updatedAt: now,
    relatedPatterns: [],
    ...overrides,
  } as SolutionPattern;
}

// Helper to create a test project structure
async function createTestProject(dir: string): Promise<void> {
  // Create package.json
  await writeFile(
    join(dir, "package.json"),
    JSON.stringify({
      name: "test-project",
      dependencies: {
        next: "^14.0.0",
        react: "^18.0.0",
      },
      devDependencies: {
        typescript: "^5.0.0",
      },
    }),
  );

  // Create source files
  await mkdir(join(dir, "src", "auth"), { recursive: true });
  await writeFile(
    join(dir, "src", "auth", "login.ts"),
    `
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function login(email: string, password: string) {
  // Auth logic here
  const token = process.env.JWT_SECRET;
  return { token };
}
`,
  );

  await writeFile(
    join(dir, "src", "index.ts"),
    `
export { login } from "./auth/login";
`,
  );
}

describe("Solution Pattern E2E Tests", () => {
  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "solution-e2e-"));
    // Create required directories
    await mkdir(join(testDir, ".workflow", "patterns", "solutions"), { recursive: true });
    store = new PatternStore(testDir);
    await store.initialize();
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Cleanup may fail
    }
  });

  // ============================================
  // PatternStore Solution CRUD Tests
  // ============================================

  describe("PatternStore Solution Operations", () => {
    it("should save and retrieve a solution", async () => {
      const solution = createTestSolution();

      const saveResult = await store.saveSolution(solution);
      expect(saveResult.success).toBe(true);

      const getResult = await store.getSolution(solution.id);
      expect(getResult.success).toBe(true);
      expect(getResult.data?.name).toBe(solution.name);
    });

    it("should list all solutions", async () => {
      // Save multiple solutions
      await store.saveSolution(createTestSolution({ name: "Auth Solution" }));
      await store.saveSolution(
        createTestSolution({
          name: "Database Solution",
          category: "database" as SolutionCategory,
        }),
      );

      const listResult = await store.listSolutions({});
      expect(listResult.success).toBe(true);
      expect(listResult.data?.length).toBe(2);
    });

    it("should filter solutions by category", async () => {
      await store.saveSolution(
        createTestSolution({
          name: "Auth Solution",
          category: "auth" as SolutionCategory,
        }),
      );
      await store.saveSolution(
        createTestSolution({
          name: "DB Solution",
          category: "database" as SolutionCategory,
        }),
      );

      const listResult = await store.listSolutions({
        solutionCategory: "auth",
      });
      expect(listResult.success).toBe(true);
      expect(listResult.data?.length).toBe(1);
      expect(listResult.data?.[0].name).toBe("Auth Solution");
    });

    it("should search solutions by keywords", async () => {
      await store.saveSolution(
        createTestSolution({
          name: "JWT Auth",
          problem: {
            description: "JWT authentication",
            keywords: ["jwt", "authentication", "token"],
            errorPatterns: [],
          },
        }),
      );
      await store.saveSolution(
        createTestSolution({
          name: "Database Migrations",
          category: "database" as SolutionCategory,
          problem: {
            description: "Database migrations",
            keywords: ["migrations", "database", "schema"],
            errorPatterns: [],
          },
        }),
      );

      const searchResult = await store.searchSolutions(["jwt", "token"]);
      expect(searchResult.success).toBe(true);
      expect(searchResult.data?.length).toBeGreaterThan(0);
      expect(searchResult.data?.[0].name).toBe("JWT Auth");
    });

    it("should update solution metrics", async () => {
      const solution = createTestSolution();
      await store.saveSolution(solution);

      // Simulate successful application
      await store.updateSolutionMetrics(solution.id, true);

      const getResult = await store.getSolution(solution.id);
      expect(getResult.success).toBe(true);
      expect(getResult.data?.metrics.applications).toBe(1);
      expect(getResult.data?.metrics.successes).toBe(1);
    });

    it("should deprecate a solution", async () => {
      const solution = createTestSolution();
      await store.saveSolution(solution);

      await store.deprecateSolution(solution.id, "Outdated approach");

      const getResult = await store.getSolution(solution.id);
      expect(getResult.success).toBe(true);
      expect(getResult.data?.deprecatedAt).toBeDefined();
      expect(getResult.data?.deprecationReason).toBe("Outdated approach");
    });

    it("should delete a solution", async () => {
      const solution = createTestSolution();
      await store.saveSolution(solution);

      const deleteResult = await store.deleteSolution(solution.id);
      expect(deleteResult.success).toBe(true);

      const getResult = await store.getSolution(solution.id);
      expect(getResult.success).toBe(false);
    });
  });

  // ============================================
  // Statistics Tests
  // ============================================

  describe("Solution Statistics", () => {
    it("should track solution statistics", async () => {
      // Save solutions
      await store.saveSolution(createTestSolution({ name: "Solution 1" }));
      await store.saveSolution(
        createTestSolution({
          name: "Solution 2",
          isPrivate: true,
        }),
      );

      const stats = await store.getStats();
      expect(stats.totalSolutions).toBe(2);
      expect(stats.privateSolutions).toBe(1);
    });

    it("should track deprecated solutions", async () => {
      const solution = createTestSolution();
      await store.saveSolution(solution);
      await store.deprecateSolution(solution.id, "Outdated");

      const stats = await store.getStats();
      expect(stats.deprecatedSolutions).toBe(1);
    });
  });

  // ============================================
  // Filtering and Search Tests
  // ============================================

  describe("Solution Filtering", () => {
    beforeEach(async () => {
      // Create test solutions
      await store.saveSolution(
        createTestSolution({
          name: "Next.js Auth",
          category: "auth" as SolutionCategory,
          compatibility: {
            framework: "next",
            frameworkVersion: ">=14.0.0",
            runtime: "node",
            runtimeVersion: ">=18.0.0",
            dependencies: [],
          },
        }),
      );

      await store.saveSolution(
        createTestSolution({
          name: "React State",
          category: "state" as SolutionCategory,
          compatibility: {
            framework: "react",
            frameworkVersion: ">=18.0.0",
            runtime: "node",
            runtimeVersion: ">=18.0.0",
            dependencies: [],
          },
        }),
      );

      await store.saveSolution(
        createTestSolution({
          name: "Express API",
          category: "api" as SolutionCategory,
          compatibility: {
            framework: "express",
            frameworkVersion: ">=4.0.0",
            runtime: "node",
            runtimeVersion: ">=18.0.0",
            dependencies: [],
          },
        }),
      );
    });

    it("should filter by framework", async () => {
      const result = await store.listSolutions({ framework: "next" });
      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(1);
      expect(result.data?.[0].name).toBe("Next.js Auth");
    });

    it("should exclude deprecated by default", async () => {
      // Deprecate one solution
      const listBefore = await store.listSolutions({});
      expect(listBefore.data?.length).toBe(3);

      const solution = listBefore.data?.[0];
      if (solution) {
        await store.deprecateSolution(solution.id, "Outdated");
      }

      // Should not include deprecated by default
      const listAfter = await store.listSolutions({});
      expect(listAfter.data?.length).toBe(2);

      // Should include deprecated when requested
      const listWithDeprecated = await store.listSolutions({
        includeDeprecated: true,
      });
      expect(listWithDeprecated.data?.length).toBe(3);
    });

    it("should limit results", async () => {
      const result = await store.listSolutions({ limit: 2 });
      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(2);
    });
  });

  // ============================================
  // Multi-step Solution Tests
  // ============================================

  describe("Complex Solution Patterns", () => {
    it("should handle solutions with multiple files", async () => {
      const solution = createTestSolution({
        name: "Full Auth System",
        implementation: {
          files: [
            {
              path: "src/auth/login.ts",
              purpose: "Login handler",
              role: "service" as const,
              content: "export function login() {}",
              exports: ["login"],
              imports: [],
              lineCount: 1,
            },
            {
              path: "src/auth/logout.ts",
              purpose: "Logout handler",
              role: "service" as const,
              content: "export function logout() {}",
              exports: ["logout"],
              imports: [],
              lineCount: 1,
            },
            {
              path: "src/auth/middleware.ts",
              purpose: "Auth middleware",
              role: "middleware" as const,
              content: "export function authMiddleware() {}",
              exports: ["authMiddleware"],
              imports: [],
              lineCount: 1,
            },
            {
              path: "src/auth/types.ts",
              purpose: "Type definitions",
              role: "type" as const,
              content: "export interface User {}",
              exports: ["User"],
              imports: [],
              lineCount: 1,
            },
          ],
          dependencies: [
            {
              name: "jsonwebtoken",
              version: "^9.0.0",
              compatibleRange: ">=9.0.0",
            },
            { name: "bcrypt", version: "^5.0.0", compatibleRange: ">=5.0.0" },
          ],
          devDependencies: [
            {
              name: "@types/jsonwebtoken",
              version: "^9.0.0",
              compatibleRange: ">=9.0.0",
            },
          ],
          envVars: [
            {
              name: "JWT_SECRET",
              required: true,
              description: "Secret for JWT signing",
            },
            {
              name: "JWT_EXPIRY",
              required: false,
              defaultValue: "1d",
              description: "JWT expiration time",
            },
          ],
        },
      });

      const saveResult = await store.saveSolution(solution);
      expect(saveResult.success).toBe(true);

      const getResult = await store.getSolution(solution.id);
      expect(getResult.success).toBe(true);
      expect(getResult.data?.implementation.files.length).toBe(4);
      expect(getResult.data?.implementation.dependencies.length).toBe(2);
      expect(getResult.data?.implementation.envVars.length).toBe(2);
    });

    it("should handle solutions with related patterns", async () => {
      // Save a base solution
      const baseSolution = createTestSolution({
        name: "Base Auth",
      });
      await store.saveSolution(baseSolution);

      // Save a related solution
      const relatedSolution = createTestSolution({
        name: "OAuth Extension",
        relatedPatterns: [baseSolution.id],
      });
      await store.saveSolution(relatedSolution);

      const getResult = await store.getSolution(relatedSolution.id);
      expect(getResult.success).toBe(true);
      expect(getResult.data?.relatedPatterns).toContain(baseSolution.id);
    });
  });
});

// ============================================
// CLI-based E2E Tests for New Solution Commands
// ============================================

import { execa } from "execa";

describe("solution CLI commands - E2E", () => {
  let tempDir: string;
  let cliPath: string;
  let cliStore: PatternStore;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "workflow-solution-cli-e2e-"));
    cliPath = join(process.cwd(), "dist", "cli", "index.js");

    // Create workflow.config.json
    await writeFile(
      join(tempDir, "workflow.config.json"),
      JSON.stringify({
        projectName: "test-project",
        scopes: [{ name: "feat", description: "Features" }],
        enforcement: "strict",
        language: "en",
      }),
    );

    // Create .workflow/patterns directories
    await mkdir(join(tempDir, ".workflow", "patterns", "solutions"), {
      recursive: true,
    });

    cliStore = new PatternStore(tempDir);
    await cliStore.initialize();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  // ============================================
  // solution show - CLI Tests
  // ============================================

  describe("solution show", () => {
    it("displays solution details via CLI", async () => {
      // Create a solution first - use a proper UUID
      const solutionId = crypto.randomUUID();
      const solution = createTestSolution({
        id: solutionId,
        name: "Show CLI Test Solution",
      });
      const saveResult = await cliStore.saveSolution(solution);
      expect(saveResult.success).toBe(true);

      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "solution", "show", solutionId],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Solution Details");
      expect(stdout).toContain("Show CLI Test Solution");
    });

    it("exits with error for non-existent solution", async () => {
      const { exitCode, stderr } = await execa(
        "node",
        [cliPath, "solution", "show", "nonexistent-id"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(1);
      expect(stderr).toContain("not found");
    });

    it("shows compatibility information", async () => {
      const solutionId = crypto.randomUUID();
      const solution = createTestSolution({
        id: solutionId,
        name: "Compatibility CLI Test",
        compatibility: {
          framework: "next",
          frameworkVersion: ">=14.0.0",
          runtime: "node",
          runtimeVersion: ">=18.0.0",
          dependencies: [],
        },
      });
      const saveResult = await cliStore.saveSolution(solution);
      expect(saveResult.success).toBe(true);

      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "solution", "show", solutionId],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Compatibility");
      expect(stdout).toContain("next");
    });
  });

  // ============================================
  // solution export - CLI Tests
  // ============================================

  describe("solution export", () => {
    it("exports solutions to JSON file", async () => {
      await cliStore.saveSolution(
        createTestSolution({ name: "Export CLI Test" }),
      );

      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "solution", "export", "--output", "solutions-export.json"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Exported");

      // Verify file was created
      const { readFile: fsReadFile } = await import("fs/promises");
      const content = await fsReadFile(
        join(tempDir, "solutions-export.json"),
        "utf-8",
      );
      const data = JSON.parse(content);
      expect(data.solutions.length).toBeGreaterThanOrEqual(1);
    });

    it("exports to YAML format", async () => {
      await cliStore.saveSolution(
        createTestSolution({ name: "YAML CLI Export" }),
      );

      const { stdout, exitCode } = await execa(
        "node",
        [
          cliPath,
          "solution",
          "export",
          "--format",
          "yaml",
          "--output",
          "solutions.yaml",
        ],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Exported");
      expect(stdout).toContain("YAML");
    });

    it("filters by category", async () => {
      const authResult = await cliStore.saveSolution(
        createTestSolution({ name: "Auth Solution", category: "auth" }),
      );
      expect(authResult.success).toBe(true);

      const apiResult = await cliStore.saveSolution(
        createTestSolution({ name: "API Solution", category: "api" }),
      );
      expect(apiResult.success).toBe(true);

      const { stdout, exitCode } = await execa(
        "node",
        [
          cliPath,
          "solution",
          "export",
          "--category",
          "auth",
          "--output",
          "auth-only.json",
        ],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);

      const { readFile: fsReadFile } = await import("fs/promises");
      const content = await fsReadFile(join(tempDir, "auth-only.json"), "utf-8");
      const data = JSON.parse(content);
      expect(data.solutions.length).toBeGreaterThan(0);
      expect(data.solutions.every((s: { category: string }) => s.category === "auth")).toBe(true);
    });

    it("reports no solutions when store is empty", async () => {
      // Create empty temp dir
      const emptyDir = await mkdtemp(join(tmpdir(), "workflow-solution-empty-"));
      await writeFile(
        join(emptyDir, "workflow.config.json"),
        JSON.stringify({
          projectName: "empty",
          scopes: [],
          enforcement: "strict",
          language: "en",
        }),
      );

      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "solution", "export"],
        {
          cwd: emptyDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("No solutions to export");

      await rm(emptyDir, { recursive: true, force: true });
    });
  });

  // ============================================
  // solution import - CLI Tests
  // ============================================

  describe("solution import", () => {
    it("imports solutions from JSON file", async () => {
      // Create export file
      const importId = crypto.randomUUID();
      const exportData = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        solutions: [
          createTestSolution({
            id: importId,
            name: "Imported CLI Solution",
          }),
        ],
      };
      await writeFile(
        join(tempDir, "import.json"),
        JSON.stringify(exportData, null, 2),
      );

      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "solution", "import", "import.json"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Import complete");

      // Verify solution was imported
      const result = await cliStore.getSolution(importId);
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("Imported CLI Solution");
    });

    it("supports dry-run mode", async () => {
      const dryRunId = crypto.randomUUID();
      const exportData = {
        solutions: [
          createTestSolution({
            id: dryRunId,
            name: "Dry Run CLI Solution",
          }),
        ],
      };
      await writeFile(
        join(tempDir, "dryrun.json"),
        JSON.stringify(exportData, null, 2),
      );

      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "solution", "import", "dryrun.json", "--dry-run"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Dry run");
      expect(stdout).toContain("Would import");

      // Verify solution was NOT imported
      const result = await cliStore.getSolution(dryRunId);
      expect(result.success).toBe(false);
    });

    it("handles non-existent file gracefully", async () => {
      const { exitCode, stdout } = await execa(
        "node",
        [cliPath, "solution", "import", "nonexistent.json"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(1);
      expect(stdout).toContain("File not found");
    });

    it("skips existing solutions with --no-merge", async () => {
      // Create existing solution with a valid UUID
      const skipId = crypto.randomUUID();
      const existing = createTestSolution({
        id: skipId,
        name: "Existing CLI Solution",
      });
      const saveResult = await cliStore.saveSolution(existing);
      expect(saveResult.success).toBe(true);

      // Create import file with same ID
      const exportData = {
        solutions: [{ ...existing, name: "Updated Name" }],
      };
      await writeFile(
        join(tempDir, "skip.json"),
        JSON.stringify(exportData, null, 2),
      );

      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "solution", "import", "skip.json", "--no-merge"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Skipped");

      // Verify original name is preserved
      const result = await cliStore.getSolution(skipId);
      expect(result.data?.name).toBe("Existing CLI Solution");
    });
  });

  // ============================================
  // solution analyze - CLI Tests
  // ============================================

  describe("solution analyze", () => {
    it("runs analyze command successfully", async () => {
      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "solution", "analyze"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Analyzing Codebase for Solution Patterns");
    });

    it("detects auth directory as opportunity", async () => {
      await mkdir(join(tempDir, "src", "auth"), { recursive: true });
      await writeFile(
        join(tempDir, "src", "auth", "login.ts"),
        "export const login = () => {};",
      );

      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "solution", "analyze"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Authentication");
    });

    it("detects API layer as opportunity", async () => {
      await mkdir(join(tempDir, "app", "api"), { recursive: true });
      await writeFile(
        join(tempDir, "app", "api", "route.ts"),
        "export const GET = () => {};",
      );

      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "solution", "analyze"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("API");
    });

    it("reports no opportunities when none found", async () => {
      // Empty directory should find no opportunities
      const emptyDir = await mkdtemp(join(tmpdir(), "workflow-solution-analyze-"));
      await writeFile(
        join(emptyDir, "workflow.config.json"),
        JSON.stringify({
          projectName: "empty",
          scopes: [],
          enforcement: "strict",
          language: "en",
        }),
      );

      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "solution", "analyze"],
        {
          cwd: emptyDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("No new solution opportunities");

      await rm(emptyDir, { recursive: true, force: true });
    });
  });
});
