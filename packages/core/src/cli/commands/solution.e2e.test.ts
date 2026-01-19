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
      dependencies: [{ name: "jsonwebtoken", version: "^9.0.0", compatibleRange: ">=9.0.0" }],
      devDependencies: [],
      envVars: [{ name: "JWT_SECRET", required: true, description: "Secret key for JWT signing" }],
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
    store = new PatternStore(testDir);
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
            { name: "jsonwebtoken", version: "^9.0.0", compatibleRange: ">=9.0.0" },
            { name: "bcrypt", version: "^5.0.0", compatibleRange: ">=5.0.0" },
          ],
          devDependencies: [{ name: "@types/jsonwebtoken", version: "^9.0.0", compatibleRange: ">=9.0.0" }],
          envVars: [
            { name: "JWT_SECRET", required: true, description: "Secret for JWT signing" },
            { name: "JWT_EXPIRY", required: false, defaultValue: "1d", description: "JWT expiration time" },
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
