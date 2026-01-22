/**
 * Shared test utilities for CLI command tests
 * Provides factories, helpers, and mock creators for unit, integration, and E2E tests
 */

import { mkdtemp, rm, writeFile, mkdir } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { execa } from "execa";
import type {
  FixPattern,
  Blueprint,
  SolutionPattern,
  SolutionCategory,
} from "@hawkinside_out/workflow-improvement-tracker";

// ============================================
// Factory Functions
// ============================================

/**
 * Create a valid FixPattern for testing
 */
export function createTestFixPattern(
  overrides: Partial<FixPattern> = {},
): FixPattern {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: "Test Fix Pattern",
    description: "A test pattern for testing",
    category: "config",
    tags: [{ name: "next", category: "framework" }],
    trigger: {
      errorPattern: "Error: .*",
      errorMessage: "Test error message",
      filePattern: "**/*.ts",
      context: "test context",
    },
    solution: {
      type: "command",
      steps: [
        {
          order: 1,
          action: "install",
          target: "test-package",
          description: "Do something",
        },
      ],
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
    source: "manual",
    isPrivate: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as FixPattern;
}

/**
 * Create a valid Blueprint for testing
 */
export function createTestBlueprint(
  overrides: Partial<Blueprint> = {},
): Blueprint {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: "Test Blueprint",
    description: "A test blueprint for testing",
    tags: [],
    stack: {
      framework: "next",
      language: "typescript",
      runtime: "node",
      packageManager: "pnpm",
      dependencies: [],
      devDependencies: [],
    },
    structure: { directories: [], keyFiles: [] },
    setup: {
      prerequisites: [],
      steps: [],
      configs: [],
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
    relatedPatterns: [],
    source: "manual",
    isPrivate: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as Blueprint;
}

/**
 * Create a valid SolutionPattern for testing
 */
export function createTestSolutionPattern(
  overrides: Partial<SolutionPattern> = {},
): SolutionPattern {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: "Test Solution",
    description: "A test solution for testing",
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

// ============================================
// Setup and Cleanup Helpers
// ============================================

/**
 * Create a temporary directory for testing
 */
export async function setupTempDir(prefix: string = "workflow-test-"): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix));
}

/**
 * Clean up a temporary directory
 */
export async function cleanupTempDir(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}

/**
 * Clean up specific files within a directory (for per-test cleanup in shared temp dirs)
 */
export async function cleanupTestFiles(files: string[]): Promise<void> {
  for (const file of files) {
    try {
      await rm(file, { recursive: true, force: true });
    } catch {
      // Ignore errors for files that don't exist
    }
  }
}

/**
 * Initialize a git repository in the given directory
 */
export async function initGitRepo(dir: string): Promise<void> {
  await execa("git", ["init"], { cwd: dir });
  await execa("git", ["config", "user.email", "test@test.com"], { cwd: dir });
  await execa("git", ["config", "user.name", "Test User"], { cwd: dir });
}

/**
 * Create a workflow.config.json file
 */
export async function createWorkflowConfig(
  dir: string,
  config: Record<string, unknown> = {},
): Promise<void> {
  const defaultConfig = {
    projectName: "test-project",
    scopes: [
      { name: "feat", description: "Features" },
      { name: "fix", description: "Bug fixes" },
      { name: "docs", description: "Documentation" },
    ],
    enforcement: "strict",
    language: "en",
  };
  await writeFile(
    join(dir, "workflow.config.json"),
    JSON.stringify({ ...defaultConfig, ...config }, null, 2),
  );
}

/**
 * Create a package.json file
 */
export async function createPackageJson(
  dir: string,
  pkg: Record<string, unknown> = {},
): Promise<void> {
  const defaultPkg = {
    name: "test-project",
    version: "1.0.0",
    dependencies: {
      next: "^14.0.0",
      react: "^18.0.0",
    },
    devDependencies: {
      typescript: "^5.0.0",
    },
  };
  await writeFile(
    join(dir, "package.json"),
    JSON.stringify({ ...defaultPkg, ...pkg }, null, 2),
  );
}

/**
 * Create a test project structure with common files
 */
export async function createTestProject(dir: string): Promise<void> {
  await createPackageJson(dir);
  await createWorkflowConfig(dir);
  await mkdir(join(dir, "src"), { recursive: true });
  await writeFile(join(dir, "src", "index.ts"), 'export const main = () => "hello";');
}

/**
 * Get the path to the CLI executable
 */
export function getCLIPath(): string {
  return join(process.cwd(), "dist", "cli", "index.js");
}

/**
 * Run a CLI command and return the result
 */
export async function runCLI(
  args: string[],
  options: { cwd: string; env?: Record<string, string> },
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const result = await execa("node", [getCLIPath(), ...args], {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    reject: false,
  });
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
  };
}

// ============================================
// Mock Creators for Unit Tests
// ============================================

/**
 * Create a mock PatternStore for unit testing
 */
export function createMockPatternStore() {
  const fixes: FixPattern[] = [];
  const blueprints: Blueprint[] = [];
  const solutions: SolutionPattern[] = [];

  return {
    fixes,
    blueprints,
    solutions,

    async saveFixPattern(pattern: FixPattern) {
      const index = fixes.findIndex((p) => p.id === pattern.id);
      if (index >= 0) {
        fixes[index] = pattern;
      } else {
        fixes.push(pattern);
      }
      return { success: true, data: pattern };
    },

    async getFixPattern(id: string) {
      const pattern = fixes.find((p) => p.id === id);
      return { success: !!pattern, data: pattern };
    },

    async listFixPatterns(options: { category?: string } = {}) {
      let result = [...fixes];
      if (options.category) {
        result = result.filter((p) => p.category === options.category);
      }
      return { success: true, data: result };
    },

    async deleteFixPattern(id: string) {
      const index = fixes.findIndex((p) => p.id === id);
      if (index >= 0) {
        fixes.splice(index, 1);
        return { success: true };
      }
      return { success: false, error: "Not found" };
    },

    async saveBlueprint(pattern: Blueprint) {
      const index = blueprints.findIndex((p) => p.id === pattern.id);
      if (index >= 0) {
        blueprints[index] = pattern;
      } else {
        blueprints.push(pattern);
      }
      return { success: true, data: pattern };
    },

    async getBlueprint(id: string) {
      const pattern = blueprints.find((p) => p.id === id);
      return { success: !!pattern, data: pattern };
    },

    async listBlueprints() {
      return { success: true, data: [...blueprints] };
    },

    async deleteBlueprint(id: string) {
      const index = blueprints.findIndex((p) => p.id === id);
      if (index >= 0) {
        blueprints.splice(index, 1);
        return { success: true };
      }
      return { success: false, error: "Not found" };
    },

    async saveSolutionPattern(pattern: SolutionPattern) {
      const index = solutions.findIndex((p) => p.id === pattern.id);
      if (index >= 0) {
        solutions[index] = pattern;
      } else {
        solutions.push(pattern);
      }
      return { success: true, data: pattern };
    },

    async getSolutionPattern(id: string) {
      const pattern = solutions.find((p) => p.id === id);
      return { success: !!pattern, data: pattern };
    },

    async listSolutionPatterns(options: { category?: string } = {}) {
      let result = [...solutions];
      if (options.category) {
        result = result.filter((p) => p.category === options.category);
      }
      return { success: true, data: result };
    },

    async deleteSolutionPattern(id: string) {
      const index = solutions.findIndex((p) => p.id === id);
      if (index >= 0) {
        solutions.splice(index, 1);
        return { success: true };
      }
      return { success: false, error: "Not found" };
    },

    async searchSolutionPatterns(query: string) {
      const result = solutions.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.description.toLowerCase().includes(query.toLowerCase()),
      );
      return { success: true, data: result };
    },

    clear() {
      fixes.length = 0;
      blueprints.length = 0;
      solutions.length = 0;
    },
  };
}

/**
 * Create mock file system operations for unit testing
 */
export function createMockFs() {
  const files = new Map<string, string>();
  const directories = new Set<string>();

  return {
    files,
    directories,

    async readFile(path: string) {
      const content = files.get(path);
      if (!content) {
        throw new Error(`ENOENT: no such file or directory, open '${path}'`);
      }
      return content;
    },

    async writeFile(path: string, content: string) {
      files.set(path, content);
    },

    async mkdir(path: string) {
      directories.add(path);
    },

    async rm(path: string) {
      files.delete(path);
      directories.delete(path);
    },

    async readdir(path: string) {
      const entries: string[] = [];
      for (const filePath of files.keys()) {
        if (filePath.startsWith(path)) {
          const relativePath = filePath.slice(path.length + 1);
          const firstPart = relativePath.split("/")[0];
          if (firstPart && !entries.includes(firstPart)) {
            entries.push(firstPart);
          }
        }
      }
      return entries;
    },

    async stat(path: string) {
      if (directories.has(path)) {
        return { isDirectory: () => true, isFile: () => false };
      }
      if (files.has(path)) {
        return { isDirectory: () => false, isFile: () => true };
      }
      throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
    },

    async access(path: string) {
      if (!files.has(path) && !directories.has(path)) {
        throw new Error(`ENOENT: no such file or directory, access '${path}'`);
      }
    },

    clear() {
      files.clear();
      directories.clear();
    },
  };
}

// ============================================
// Assertion Helpers
// ============================================

/**
 * Assert that a CLI command succeeded
 */
export function assertSuccess(result: { exitCode: number; stderr: string }) {
  if (result.exitCode !== 0) {
    throw new Error(`Expected exit code 0, got ${result.exitCode}. stderr: ${result.stderr}`);
  }
}

/**
 * Assert that a CLI command failed
 */
export function assertFailure(result: { exitCode: number }, expectedCode: number = 1) {
  if (result.exitCode !== expectedCode) {
    throw new Error(`Expected exit code ${expectedCode}, got ${result.exitCode}`);
  }
}

/**
 * Assert that output contains all expected strings
 */
export function assertContainsAll(output: string, expected: string[]) {
  for (const str of expected) {
    if (!output.includes(str)) {
      throw new Error(`Expected output to contain "${str}"`);
    }
  }
}
