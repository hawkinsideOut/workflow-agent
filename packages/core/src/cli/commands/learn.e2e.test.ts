import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "fs/promises";
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
  // learn:config Tests
  // ============================================

  describe("learn:config", () => {
    it("shows configuration when no config exists", async () => {
      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn:config"],
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
        [cliPath, "learn:config", "--enable-telemetry"],
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
      await execa("node", [cliPath, "learn:config", "--enable-telemetry"], {
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
        [cliPath, "learn:config", "--disable-telemetry"],
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
        [cliPath, "learn:config", "--enable-sync"],
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
        [cliPath, "learn:config", "--show"],
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
  // learn:list Tests
  // ============================================

  describe("learn:list", () => {
    it("shows empty list when no patterns exist", async () => {
      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn:list"],
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
        [cliPath, "learn:list"],
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
        [cliPath, "learn:list", "--type", "fix"],
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
  // learn:stats Tests
  // ============================================

  describe("learn:stats", () => {
    it("shows statistics", async () => {
      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn:stats"],
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
        [cliPath, "learn:stats"],
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
  // learn:sync Tests
  // ============================================

  describe("learn:sync", () => {
    it("warns when sync is not enabled", async () => {
      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn:sync"],
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
        [cliPath, "learn:sync"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("Sync Learning Patterns");
      expect(stdout).toContain("Specify --push to upload or --pull to download");
    });

    it("shows patterns ready to sync with --push --dry-run", async () => {
      // Enable sync and create a pattern
      const contributorManager = new ContributorManager(tempDir);
      await contributorManager.enableSync();

      const store = new PatternStore(tempDir);
      const saveResult = await store.saveFixPattern(
        createTestFixPattern({ name: "Sync Test Pattern" }),
      );
      expect(saveResult.success).toBe(true);

      const { stdout, exitCode } = await execa(
        "node",
        [cliPath, "learn:sync", "--push", "--dry-run"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toContain("DRY-RUN MODE");
      // The pattern is saved with isPrivate: false, so it should be ready to sync
      expect(stdout).toContain("Patterns ready to sync");
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
      const saveResult = await store1.saveFixPattern(
        createTestFixPattern({ id: patternId, name: "Persistent Pattern" }),
      );
      expect(saveResult.success).toBe(true);

      // Read with second instance
      const store2 = new PatternStore(tempDir);
      const result = await store2.getFixPattern(patternId);

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("Persistent Pattern");
    });

    it("handles concurrent pattern operations", async () => {
      const store = new PatternStore(tempDir);
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
});
