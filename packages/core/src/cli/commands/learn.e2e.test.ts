import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { execa } from "execa";
import {
  PatternStore,
  ContributorManager,
  TelemetryCollector,
  type FixPattern,
  type Blueprint,
} from "@hawkinside_out/workflow-improvement-tracker";

/**
 * E2E Tests for the learn commands
 * Tests the learning system functionality including:
 * - Recording patterns
 * - Listing patterns
 * - Applying patterns
 * - Configuration management
 * - Statistics display
 */

// Helper to create valid fix patterns matching the schema exactly
function createTestFixPattern(overrides: Partial<FixPattern> = {}): FixPattern {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: "Test Fix Pattern",
    description: "A test pattern for e2e testing",
    category: "config", // Valid enum: lint, type-error, dependency, config, runtime, build, test, security
    tags: [{ name: "next", category: "framework" }],
    trigger: {
      errorPattern: "Error: .*",
      errorMessage: "Test error message",
      filePattern: "**/*.ts",
      context: "test context",
    },
    solution: {
      type: "command", // Valid enum: command, file-change, config-update, dependency-add, dependency-remove, multi-step
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
    source: "manual", // Valid enum: manual, auto-heal, verify-fix, imported, community
    isPrivate: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as FixPattern;
}

// Helper to create valid blueprints matching the schema exactly
function createTestBlueprint(overrides: Partial<Blueprint> = {}): Blueprint {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: "Test Blueprint",
    description: "A test blueprint for e2e testing",
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
describe("workflow learn - E2E", () => {
  let tempDir: string;
  let cliPath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "workflow-learn-e2e-"));
    cliPath = join(process.cwd(), "dist", "cli", "index.js");

    // Create a minimal workflow config
    await writeFile(
      join(tempDir, "workflow.config.json"),
      JSON.stringify({
        projectName: "test-project",
        scopes: [{ name: "feat", description: "Features" }],
      }),
    );
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  // ============================================
  // learn config Tests
  // ============================================

  describe("learn config", () => {
    it("shows configuration when no config exists", async () => {
      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "config"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Learning Configuration");
      expect(stdout).toContain("No configuration found");
    });

    it("enables telemetry with --enable-telemetry", async () => {
      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "config", "--enable-telemetry"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Telemetry enabled");

      // Verify config was created
      const contributorManager = new ContributorManager(tempDir);
      const enabled = await contributorManager.isTelemetryEnabled();
      expect(enabled).toBe(true);
    });

    it("disables telemetry with --disable-telemetry", async () => {
      // First enable using CLI
      await execa("node", [cliPath, "learn", "config", "--enable-telemetry"], {
        cwd: tempDir,
        reject: false,
      });

      // Verify it's enabled
      const manager1 = new ContributorManager(tempDir);
      const enabledBefore = await manager1.isTelemetryEnabled();
      expect(enabledBefore).toBe(true);

      // Then disable via CLI
      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "config", "--disable-telemetry"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Telemetry disabled");

      // Create fresh instance to read updated config
      const manager2 = new ContributorManager(tempDir);
      const enabledAfter = await manager2.isTelemetryEnabled();
      expect(enabledAfter).toBe(false);
    });

    it("enables sync with --enable-sync", async () => {
      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "config", "--enable-sync"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Sync enabled");

      const contributorManager = new ContributorManager(tempDir);
      const config = await contributorManager.getConfig();
      expect(config.success).toBe(true);
      expect(config.data?.syncOptIn).toBe(true);
    });

    it("shows current configuration when config exists", async () => {
      // Create a config first
      const contributorManager = new ContributorManager(tempDir);
      await contributorManager.enableTelemetry();

      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "config", "--show"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Current Settings");
      expect(stdout).toContain("Contributor ID");
      expect(stdout).toContain("Telemetry Enabled: Yes");
    });
  });

  // ============================================
  // learn list Tests
  // ============================================

  describe("learn list", () => {
    it("shows empty list when no patterns exist", async () => {
      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "list"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Recorded Learning Patterns");
      expect(stdout).toContain("Total: 0 patterns");
    });

    it("lists fix patterns when they exist", async () => {
      // Create a pattern directly
      const store = new PatternStore(tempDir);
      await store.initialize();
      const result = await store.saveFixPattern(
        createTestFixPattern({
          name: "Test Fix Pattern",
          description: "A test pattern for e2e testing",
        }),
      );

      // Verify pattern was saved
      expect(result.success).toBe(true);

      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "list"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Fix Patterns");
      expect(stdout).toContain("Test Fix Pattern");
      expect(stdout).toContain("config");
      expect(stdout).toContain("Total: 1 patterns");
    });

    it("filters by type with --type fix", async () => {
      // Create both fix and blueprint
      const store = new PatternStore(tempDir);
      await store.initialize();

      const fixResult = await store.saveFixPattern(
        createTestFixPattern({ name: "A Fix Pattern" }),
      );
      expect(fixResult.success).toBe(true);

      const bpResult = await store.saveBlueprint(
        createTestBlueprint({ name: "A Blueprint" }),
      );
      expect(bpResult.success).toBe(true);

      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "list", "--type", "fix"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("A Fix Pattern");
      expect(stdout).not.toContain("A Blueprint");
    });
  });

  // ============================================
  // learn stats Tests
  // ============================================

  describe("learn stats", () => {
    it("shows statistics", async () => {
      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "stats"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Learning Statistics");
      expect(stdout).toContain("Patterns");
      expect(stdout).toContain("Telemetry");
    });

    it("shows pattern counts accurately", async () => {
      // Create some patterns
      const store = new PatternStore(tempDir);
      await store.initialize();

      const result1 = await store.saveFixPattern(
        createTestFixPattern({ name: "Fix 1" }),
      );
      expect(result1.success).toBe(true);

      const result2 = await store.saveFixPattern(
        createTestFixPattern({ name: "Fix 2", category: "security" }),
      );
      expect(result2.success).toBe(true);

      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "stats"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Total: 2");
      expect(stdout).toContain("Fix Patterns: 2");
    });
  });

  // ============================================
  // learn sync Tests
  // ============================================

  describe("learn sync", () => {
    it("warns when sync is not enabled", async () => {
      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "sync"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Sync is not enabled");
    });

    it("shows sync options when enabled", async () => {
      // Enable sync first
      const contributorManager = new ContributorManager(tempDir);
      await contributorManager.enableSync();

      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "sync", "--push", "--dry-run"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      // Unified sync shows what's being synced and direction
      expect(stdout).toContain("Syncing:");
      expect(stdout).toContain("Learning patterns");
    });

    it("shows patterns ready to sync with --push --dry-run", async () => {
      // Enable sync and create a pattern
      const contributorManager = new ContributorManager(tempDir);
      await contributorManager.enableSync();

      const store = new PatternStore(tempDir);
      await store.initialize();
      const saveResult = await store.saveFixPattern(
        createTestFixPattern({ name: "Sync Test Pattern" }),
      );
      expect(saveResult.success).toBe(true);

      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "sync", "--push", "--dry-run"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("DRY-RUN MODE");
      // The unified sync shows "Ready to push" with pattern counts
      expect(stdout).toContain("Ready to push");
    });
  });

  // ============================================
  // PatternStore Integration Tests
  // ============================================

  describe("PatternStore integration", () => {
    it("persists patterns across store instances", async () => {
      const patternId = crypto.randomUUID();

      // Create and save with first instance
      const store1 = new PatternStore(tempDir);
      await store1.initialize();
      const saveResult = await store1.saveFixPattern(
        createTestFixPattern({ id: patternId, name: "Persistent Pattern" }),
      );
      expect(saveResult.success).toBe(true);

      // Read with second instance
      const store2 = new PatternStore(tempDir);
      await store2.initialize();
      const result = await store2.getFixPattern(patternId);

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("Persistent Pattern");
    });

    it("handles concurrent pattern operations", async () => {
      const store = new PatternStore(tempDir);
      await store.initialize();
      const ids: string[] = [];

      // Create 5 patterns concurrently
      const promises = Array.from({ length: 5 }, async (_, i) => {
        const id = crypto.randomUUID();
        ids.push(id);
        return store.saveFixPattern(
          createTestFixPattern({
            id,
            name: `Concurrent Pattern ${i}`,
            description: "Test concurrent saves",
          }),
        );
      });

      const results = await Promise.all(promises);

      // All should succeed
      expect(results.every((r) => r.success)).toBe(true);

      // All should be readable
      const stats = await store.getStats();
      expect(stats.totalFixes).toBe(5);
    });
  });

  // ============================================
  // TelemetryCollector Integration Tests
  // ============================================

  describe("TelemetryCollector integration", () => {
    it("records and retrieves telemetry events", async () => {
      const contributorManager = new ContributorManager(tempDir);
      await contributorManager.enableTelemetry();

      const telemetry = new TelemetryCollector(tempDir);
      const patternId = crypto.randomUUID();

      // Record some events
      await telemetry.recordApplication(patternId, "fix", "next", "14.0.0");
      await telemetry.recordSuccess(patternId, "fix", "next", "14.0.0");

      // Check stats
      const stats = await telemetry.getPatternStats(patternId);
      expect(stats.applications).toBe(1);
      expect(stats.successes).toBe(1);
    });

    it("persists telemetry queue across instances", async () => {
      const contributorManager = new ContributorManager(tempDir);
      await contributorManager.enableTelemetry();

      const patternId = crypto.randomUUID();

      // Record with first instance
      const telemetry1 = new TelemetryCollector(tempDir);
      await telemetry1.recordApplication(patternId, "fix", "react", "18.0.0");

      // Read with second instance
      const telemetry2 = new TelemetryCollector(tempDir);
      const count = await telemetry2.getPendingCount();

      expect(count).toBe(1);
    });
  });

  // ============================================
  // ContributorManager Integration Tests
  // ============================================

  describe("ContributorManager integration", () => {
    it("creates consistent contributor IDs", async () => {
      const manager1 = new ContributorManager(tempDir);
      const result1 = await manager1.getOrCreateId();

      const manager2 = new ContributorManager(tempDir);
      const result2 = await manager2.getOrCreateId();

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.data).toBe(result2.data);
    });

    it("generates IDs with proper format", async () => {
      const manager = new ContributorManager(tempDir);
      const result = await manager.getOrCreateId();

      expect(result.success).toBe(true);
      expect(result.data).toMatch(/^wf-[a-f0-9-]{36}$/);
    });
  });

  // ============================================
  // learn publish Tests
  // ============================================

  describe("learn publish", () => {
    it("marks a private fix pattern as public", async () => {
      // Create a private pattern
      const store = new PatternStore(tempDir);
      await store.initialize();
      const pattern = createTestFixPattern({
        name: "Private Pattern",
        isPrivate: true,
      });
      const saveResult = await store.saveFixPattern(pattern);
      expect(saveResult.success).toBe(true);

      // Run the publish command (non-interactive)
      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "publish", pattern.id, "--yes"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("public");

      // Verify the pattern is now public
      const updatedPattern = await store.getFixPattern(pattern.id);
      expect(updatedPattern.success).toBe(true);
      expect(updatedPattern.data?.isPrivate).toBe(false);
    });

    it("marks a public fix pattern as private with --private flag", async () => {
      // Create a public pattern
      const store = new PatternStore(tempDir);
      await store.initialize();
      const pattern = createTestFixPattern({
        name: "Public Pattern",
        isPrivate: false,
      });
      const saveResult = await store.saveFixPattern(pattern);
      expect(saveResult.success).toBe(true);

      // Run the publish command with --private
      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "publish", pattern.id, "--private", "--yes"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("private");

      // Verify the pattern is now private
      const updatedPattern = await store.getFixPattern(pattern.id);
      expect(updatedPattern.success).toBe(true);
      expect(updatedPattern.data?.isPrivate).toBe(true);
    });

    it("marks all patterns as public with --all flag", async () => {
      // Create multiple private patterns
      const store = new PatternStore(tempDir);
      await store.initialize();
      const pattern1 = createTestFixPattern({
        name: "Pattern 1",
        isPrivate: true,
      });
      const pattern2 = createTestFixPattern({
        name: "Pattern 2",
        isPrivate: true,
      });
      await store.saveFixPattern(pattern1);
      await store.saveFixPattern(pattern2);

      // Run the publish command with --all
      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "publish", "--all", "--yes"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Updated 2 pattern(s)");

      // Verify all patterns are now public
      const updated1 = await store.getFixPattern(pattern1.id);
      const updated2 = await store.getFixPattern(pattern2.id);
      expect(updated1.data?.isPrivate).toBe(false);
      expect(updated2.data?.isPrivate).toBe(false);
    });

    it("reports nothing to do when pattern is already in target state", async () => {
      // Create an already public pattern
      const store = new PatternStore(tempDir);
      await store.initialize();
      const pattern = createTestFixPattern({
        name: "Already Public Pattern",
        isPrivate: false,
      });
      await store.saveFixPattern(pattern);

      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "publish", pattern.id],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("already public");
    });

    it("fails with error when pattern ID not found", async () => {
      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "publish", "nonexistent-id"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(1);
      expect(stdout).toContain("Pattern not found");
    });

    it("requires pattern ID when not using --all", async () => {
      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "publish"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(1);
      expect(stdout).toContain("Pattern ID is required");
    });

    it("marks blueprint as public", async () => {
      // Create a private blueprint
      const store = new PatternStore(tempDir);
      await store.initialize();
      const blueprint = createTestBlueprint({
        name: "Private Blueprint",
        isPrivate: true,
      });
      const saveResult = await store.saveBlueprint(blueprint);
      expect(saveResult.success).toBe(true);

      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "publish", blueprint.id, "--yes"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("public");

      // Verify the blueprint is now public
      const updatedBlueprint = await store.getBlueprint(blueprint.id);
      expect(updatedBlueprint.success).toBe(true);
      expect(updatedBlueprint.data?.isPrivate).toBe(false);
    });
  });

  describe("learn validate command", () => {
    it("validates pattern files in directory", async () => {
      // Create a valid blueprint file
      const store = new PatternStore(tempDir);
      await store.initialize();
      const blueprint = createTestBlueprint({ name: "Valid Blueprint" });
      await store.saveBlueprint(blueprint);

      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "validate"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Validation Summary");
      expect(stdout).toContain("Valid:");
    });

    it("filters by pattern type", async () => {
      // Create both fix and blueprint patterns
      const store = new PatternStore(tempDir);
      await store.initialize();
      await store.saveBlueprint(createTestBlueprint({ name: "Blueprint 1" }));
      await store.saveFixPattern(
        createTestFixPattern({ name: "Fix Pattern 1" }),
      );

      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "validate", "--type", "blueprint"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Validation Summary");
    });

    it("reports invalid patterns", async () => {
      // Create an invalid pattern file directly
      const patternsDir = join(tempDir, ".workflow", "patterns", "blueprints");
      await mkdir(patternsDir, { recursive: true });
      const invalidPattern = {
        id: "invalid-id",
        // Missing required fields
      };
      await writeFile(
        join(patternsDir, "invalid.json"),
        JSON.stringify(invalidPattern),
      );

      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "validate"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(1); // Should fail with invalid patterns
      expect(stdout).toContain("Invalid:");
    });

    it("shows verbose output with --verbose flag", async () => {
      const store = new PatternStore(tempDir);
      await store.initialize();
      const blueprint = createTestBlueprint({ name: "Test Blueprint" });
      await store.saveBlueprint(blueprint);

      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "validate", "--verbose"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Validation Summary");
      // Verbose mode shows individual file validations
    });

    it("handles empty pattern directories gracefully", async () => {
      // New temp dir with no patterns
      const emptyDir = await mkdtemp(join(tmpdir(), "workflow-validate-"));

      try {
        const { stdout, exitCode } = await execa(
          "node",
          [cliPath, "learn", "validate"],
          {
            cwd: emptyDir,
            reject: false,
          },
        );

        expect(exitCode).toBe(0);
        expect(stdout).toContain("Valid: 0");
      } finally {
        await rm(emptyDir, { recursive: true, force: true });
      }
    });

    it("validates specific file with --file option", async () => {
      const store = new PatternStore(tempDir);
      await store.initialize();
      const blueprint = createTestBlueprint({ name: "Specific Blueprint" });
      await store.saveBlueprint(blueprint);

      const blueprintPath = join(
        tempDir,
        ".workflow",
        "patterns",
        "blueprints",
        `${blueprint.id}.json`,
      );

      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "validate", "--file", blueprintPath],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Valid:");
    });
  });

  describe("learn capture command", () => {
    it("captures a single file as blueprint with dry-run", async () => {
      // Create a test file to capture
      const testFile = join(tempDir, "component.tsx");
      await writeFile(
        testFile,
        `import React from 'react';
export function MyComponent() {
  return <div>Hello</div>;
}`,
      );

      const { stdout, exitCode } = await execa(
        "node",
        [
          cliPath,
          "learn", "capture",
          "component.tsx",
          "--dry-run",
          "--name",
          "Test Component",
          "--description",
          "A test component pattern",
        ],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Capture Files as Blueprint");
      expect(stdout).toContain("Found 1 file(s) to capture");
      expect(stdout).toContain("Dry Run");
      expect(stdout).toContain("Name: Test Component");
      expect(stdout).toContain("No changes made");
    });

    it("captures multiple files as blueprint with dry-run", async () => {
      // Create test files
      const file1 = join(tempDir, "util.ts");
      const file2 = join(tempDir, "helper.ts");
      await writeFile(file1, "export const util = () => {};");
      await writeFile(file2, "export const helper = () => {};");

      const { stdout, exitCode } = await execa(
        "node",
        [
          cliPath,
          "learn", "capture",
          "util.ts",
          "helper.ts",
          "--dry-run",
          "--name",
          "Utils Pattern",
          "--description",
          "Utility functions pattern",
        ],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Found 2 file(s) to capture");
      expect(stdout).toContain("Name: Utils Pattern");
    });

    it("infers tags from package.json dependencies", async () => {
      // Create package.json with dependencies
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({
          dependencies: {
            react: "^18.0.0",
            next: "^14.0.0",
          },
          devDependencies: {
            typescript: "^5.0.0",
            vitest: "^1.0.0",
          },
        }),
      );

      const testFile = join(tempDir, "app.tsx");
      await writeFile(testFile, "export default function App() { return <div/>; }");

      const { stdout, exitCode } = await execa(
        "node",
        [
          cliPath,
          "learn", "capture",
          "app.tsx",
          "--dry-run",
          "--name",
          "App Component",
          "--description",
          "Main app component",
        ],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Inferred tags:");
      expect(stdout).toContain("framework:react");
      expect(stdout).toContain("framework:next");
      expect(stdout).toContain("language:typescript");
    });

    it("infers tags from file content", async () => {
      // Create a test file in hooks directory
      await mkdir(join(tempDir, "hooks"), { recursive: true });
      const hookFile = join(tempDir, "hooks", "useCounter.ts");
      await writeFile(
        hookFile,
        `export function useCounter() { return { count: 0 }; }`,
      );

      const { stdout, exitCode } = await execa(
        "node",
        [
          cliPath,
          "learn", "capture",
          "hooks/useCounter.ts",
          "--dry-run",
          "--name",
          "Counter Hook",
          "--description",
          "A counter hook pattern",
        ],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("pattern:hooks");
      expect(stdout).toContain("language:typescript");
    });

    it("fails when file does not exist", async () => {
      const { stdout, exitCode } = await execa(
        "node",
        [
          cliPath,
          "learn", "capture",
          "nonexistent.ts",
          "--dry-run",
          "--name",
          "Test",
          "--description",
          "Test description",
        ],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(1);
      expect(stdout).toContain("File not found");
    });

    it("captures directory recursively", async () => {
      // Create directory structure
      await mkdir(join(tempDir, "components"), { recursive: true });
      await writeFile(join(tempDir, "components", "Button.tsx"), "export const Button = () => {};");
      await writeFile(join(tempDir, "components", "Card.tsx"), "export const Card = () => {};");

      const { stdout, exitCode } = await execa(
        "node",
        [
          cliPath,
          "learn", "capture",
          "components",
          "--dry-run",
          "--name",
          "Components",
          "--description",
          "UI components pattern",
        ],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Found 2 file(s) to capture");
      expect(stdout).toContain("Button.tsx");
      expect(stdout).toContain("Card.tsx");
    });

    it("saves blueprint when not in dry-run mode", async () => {
      const testFile = join(tempDir, "save-test.ts");
      await writeFile(testFile, "export const test = 'value';");

      const { stdout, exitCode } = await execa(
        "node",
        [
          cliPath,
          "learn", "capture",
          "save-test.ts",
          "--name",
          "Save Test Pattern",
          "--description",
          "Testing save functionality",
        ],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Blueprint captured successfully");
      expect(stdout).toContain("ID:");
      expect(stdout).toContain("To apply this pattern:");

      // Verify the blueprint was saved
      const store = new PatternStore(tempDir);
      await store.initialize();
      const result = await store.listBlueprints();
      expect(result.success).toBe(true);
      const saved = result.data?.find((b) => b.name === "Save Test Pattern");
      expect(saved).toBeDefined();
      // Files are stored in structure.keyFiles for blueprints
      expect(saved?.structure.keyFiles.length).toBe(1);
      expect(saved?.structure.keyFiles[0].path).toBe("save-test.ts");
    });

    it("accepts additional tags via --tags option", async () => {
      const testFile = join(tempDir, "tagged.ts");
      await writeFile(testFile, "export const tagged = true;");

      const { stdout, exitCode } = await execa(
        "node",
        [
          cliPath,
          "learn", "capture",
          "tagged.ts",
          "--dry-run",
          "--name",
          "Tagged Pattern",
          "--description",
          "Pattern with custom tags",
          "--tags",
          "category:utility,custom:mytag",
        ],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("category:utility");
      expect(stdout).toContain("custom:mytag");
    });
  });

  // ============================================
  // learn analyze - E2E Tests
  // ============================================

  describe("learn analyze", () => {
    it("runs analyze command successfully", async () => {
      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "analyze"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Analyzing Codebase for Learning Opportunities");
    });

    it("detects auth directory as learning opportunity", async () => {
      await mkdir(join(tempDir, "src", "auth"), { recursive: true });
      await writeFile(
        join(tempDir, "src", "auth", "login.ts"),
        "export const login = () => {};",
      );

      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "analyze"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Authentication Module");
    });

    it("shows verbose output with --verbose flag", async () => {
      await mkdir(join(tempDir, "src", "api"), { recursive: true });
      await writeFile(
        join(tempDir, "src", "api", "routes.ts"),
        "export const routes = [];",
      );

      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "analyze", "--verbose"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Path:");
    });
  });

  // ============================================
  // learn export - E2E Tests
  // ============================================

  describe("learn export", () => {
    it("exports patterns to JSON file", async () => {
      // Create a pattern first
      const store = new PatternStore(tempDir);
      await store.initialize();
      const pattern = createTestFixPattern({ name: "Export E2E Test Fix" });
      await store.saveFixPattern(pattern);

      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "export", "--output", "export-e2e.json"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Exported");

      // Verify file was created
      const { readFile: fsReadFile } = await import("fs/promises");
      const content = await fsReadFile(join(tempDir, "export-e2e.json"), "utf-8");
      const data = JSON.parse(content);
      expect(data.fixes.some((f: { name: string }) => f.name === "Export E2E Test Fix")).toBe(true);
    });

    it("exports with YAML format", async () => {
      const store = new PatternStore(tempDir);
      await store.initialize();
      await store.saveFixPattern(createTestFixPattern({ name: "YAML Export E2E" }));

      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "export", "--format", "yaml", "--output", "export.yaml"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Exported");
      expect(stdout).toContain("YAML");
    });

    it("filters by type when --type is specified", async () => {
      const store = new PatternStore(tempDir);
      await store.initialize();
      await store.saveFixPattern(createTestFixPattern({ name: "Fix Only E2E" }));
      await store.saveBlueprint(createTestBlueprint({ name: "Blueprint Only E2E" }));

      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "export", "--type", "fix", "--output", "fixes-only-e2e.json"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);

      const { readFile: fsReadFile } = await import("fs/promises");
      const content = await fsReadFile(join(tempDir, "fixes-only-e2e.json"), "utf-8");
      const data = JSON.parse(content);
      expect(data.fixes.length).toBeGreaterThanOrEqual(1);
      expect(data.blueprints).toHaveLength(0);
    });

    it("reports no patterns when store is empty", async () => {
      // Create a fresh temp directory for this test
      const emptyDir = await mkdtemp(join(tmpdir(), "workflow-learn-empty-"));
      await writeFile(
        join(emptyDir, "workflow.config.json"),
        JSON.stringify({
          projectName: "empty-test",
          scopes: [{ name: "feat", description: "Features" }],
          enforcement: "strict",
          language: "en",
        }),
      );

      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "export"],
        {
          cwd: emptyDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("No patterns to export");

      await rm(emptyDir, { recursive: true, force: true });
    });
  });

  // ============================================
  // learn import - E2E Tests
  // ============================================

  describe("learn import", () => {
    it("imports patterns from JSON file", async () => {
      // Create export file
      const importId = crypto.randomUUID();
      const exportData = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        fixes: [createTestFixPattern({ id: importId, name: "Imported E2E Fix" })],
        blueprints: [],
      };
      await writeFile(
        join(tempDir, "import-e2e.json"),
        JSON.stringify(exportData, null, 2),
      );

      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "import", "import-e2e.json"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Import complete");
      expect(stdout).toContain("Imported:");

      // Verify pattern was saved
      const store = new PatternStore(tempDir);
      await store.initialize();
      const result = await store.getFixPattern(importId);
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("Imported E2E Fix");
    });

    it("supports dry-run mode", async () => {
      const dryRunId = crypto.randomUUID();
      const exportData = {
        fixes: [createTestFixPattern({ id: dryRunId, name: "Dry Run E2E Import" })],
        blueprints: [],
      };
      await writeFile(
        join(tempDir, "dryrun-e2e.json"),
        JSON.stringify(exportData, null, 2),
      );

      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "import", "dryrun-e2e.json", "--dry-run"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Dry run");
      expect(stdout).toContain("Would import");

      // Verify pattern was NOT saved
      const store = new PatternStore(tempDir);
      await store.initialize();
      const result = await store.getFixPattern(dryRunId);
      expect(result.success).toBe(false);
    });

    it("handles non-existent file gracefully", async () => {
      const { exitCode, stdout } = await execa(
        "node",
        [cliPath, "learn", "import", "nonexistent-e2e.json"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(1);
      expect(stdout).toContain("File not found");
    });

    it("skips existing patterns when --no-merge is used", async () => {
      // Create existing pattern with valid UUID
      const skipMergeId = crypto.randomUUID();
      const store = new PatternStore(tempDir);
      await store.initialize();
      const existingPattern = createTestFixPattern({
        id: skipMergeId,
        name: "Existing Pattern E2E",
      });
      const saveResult = await store.saveFixPattern(existingPattern);
      expect(saveResult.success).toBe(true);

      // Create import file with same pattern
      const exportData = {
        fixes: [{ ...existingPattern, description: "Updated description" }],
        blueprints: [],
      };
      await writeFile(
        join(tempDir, "skip-e2e.json"),
        JSON.stringify(exportData, null, 2),
      );

      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "import", "skip-e2e.json", "--no-merge"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Skipped");
    });
  });

  // ============================================
  // learn clean - E2E Tests
  // ============================================

  describe("learn clean", () => {
    it("shows help when no options provided", async () => {
      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "clean"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Specify what to clean");
      expect(stdout).toContain("--deprecated");
      expect(stdout).toContain("--stale");
    });

    it("finds deprecated patterns with --deprecated --dry-run", async () => {
      // Create deprecated pattern with valid UUID
      const deprecatedId = crypto.randomUUID();
      const store = new PatternStore(tempDir);
      await store.initialize();
      const pattern = createTestFixPattern({
        id: deprecatedId,
        name: "Deprecated Pattern E2E",
        deprecatedAt: new Date().toISOString(),
        deprecationReason: "No longer needed",
      });
      const saveResult = await store.saveFixPattern(pattern);
      expect(saveResult.success).toBe(true);

      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "clean", "--deprecated", "--dry-run"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Deprecated Pattern E2E");
      expect(stdout).toContain("Dry run");
    });

    it("finds stale patterns with --stale --dry-run", async () => {
      // Create a stale pattern (updated > 90 days ago) with valid UUID
      const staleId = crypto.randomUUID();
      const store = new PatternStore(tempDir);
      await store.initialize();
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 100);

      const pattern = createTestFixPattern({
        id: staleId,
        name: "Stale Pattern E2E",
        updatedAt: staleDate.toISOString(),
      });
      const saveResult = await store.saveFixPattern(pattern);
      expect(saveResult.success).toBe(true);

      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "clean", "--stale", "--dry-run"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Stale Pattern E2E");
    });

    it("shows all patterns with --all --dry-run", async () => {
      const store = new PatternStore(tempDir);
      await store.initialize();
      await store.saveFixPattern(createTestFixPattern({ name: "All Clean E2E 1" }));
      await store.saveFixPattern(createTestFixPattern({ name: "All Clean E2E 2" }));

      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn", "clean", "--all", "--dry-run"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("patterns to remove");
      expect(stdout).toContain("Dry run");
    });
  });
});
