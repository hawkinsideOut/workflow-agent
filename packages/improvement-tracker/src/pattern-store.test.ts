import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { PatternStore, createPatternStore } from "./pattern-store";
import {
  type FixPattern,
  type Blueprint,
  createDefaultMetrics,
  PATTERNS_DIR,
} from "./patterns-schema";

// ============================================
// Test Fixtures
// ============================================

const TEST_WORKSPACE = "/tmp/pattern-store-test";

const createTestFixPattern = (overrides: Partial<FixPattern> = {}): FixPattern => {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: "Test Fix Pattern",
    description: "A test pattern for unit tests",
    category: "dependency",
    tags: [{ name: "test", category: "custom" }],
    trigger: {
      errorPattern: "Cannot find module '(.+)'",
      errorMessage: "Cannot find module 'lodash'",
    },
    solution: {
      type: "dependency-add",
      steps: [
        {
          order: 1,
          action: "install",
          target: "lodash",
          description: "Install missing package",
        },
      ],
    },
    compatibility: {
      framework: "next",
      frameworkVersion: "^14.0.0",
      dependencies: [],
    },
    metrics: createDefaultMetrics(),
    source: "manual",
    isPrivate: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};

const createTestBlueprint = (overrides: Partial<Blueprint> = {}): Blueprint => {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: "Test Blueprint",
    description: "A test blueprint for unit tests",
    tags: [{ name: "next", category: "framework" }],
    stack: {
      framework: "next",
      language: "typescript",
      runtime: "node",
      packageManager: "pnpm",
      dependencies: [{ name: "next", version: "14.0.0", compatibleRange: "^14.0.0" }],
      devDependencies: [],
    },
    structure: {
      directories: [{ path: "src", purpose: "Source code" }],
      keyFiles: [{ path: "src/app/page.tsx", purpose: "Home page" }],
    },
    setup: {
      prerequisites: ["Node.js 20+"],
      steps: [{ order: 1, command: "pnpm install", description: "Install deps" }],
      configs: [],
    },
    compatibility: {
      framework: "next",
      frameworkVersion: "^14.0.0",
      dependencies: [],
    },
    metrics: createDefaultMetrics(),
    relatedPatterns: [],
    isPrivate: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};

// ============================================
// Test Setup/Teardown
// ============================================

describe("PatternStore", () => {
  let store: PatternStore;

  beforeEach(async () => {
    // Clean up test directory
    try {
      await fs.promises.rm(TEST_WORKSPACE, { recursive: true, force: true });
    } catch {
      // Directory may not exist
    }
    await fs.promises.mkdir(TEST_WORKSPACE, { recursive: true });
    store = createPatternStore(TEST_WORKSPACE);
  });

  afterEach(async () => {
    try {
      await fs.promises.rm(TEST_WORKSPACE, { recursive: true, force: true });
    } catch {
      // Cleanup may fail, that's OK
    }
  });

  // ============================================
  // Initialization Tests
  // ============================================

  describe("initialization", () => {
    it("should create pattern directories on initialize", async () => {
      await store.initialize();

      const fixesPath = path.join(TEST_WORKSPACE, PATTERNS_DIR, "fixes");
      const blueprintsPath = path.join(TEST_WORKSPACE, PATTERNS_DIR, "blueprints");

      await expect(fs.promises.access(fixesPath)).resolves.toBeUndefined();
      await expect(fs.promises.access(blueprintsPath)).resolves.toBeUndefined();
    });

    it("should return false for isInitialized before initialize", async () => {
      const result = await store.isInitialized();
      expect(result).toBe(false);
    });

    it("should return true for isInitialized after initialize", async () => {
      await store.initialize();
      const result = await store.isInitialized();
      expect(result).toBe(true);
    });

    it("should be idempotent - multiple initializations should work", async () => {
      await store.initialize();
      await store.initialize();
      const result = await store.isInitialized();
      expect(result).toBe(true);
    });
  });

  // ============================================
  // Fix Pattern CRUD Tests
  // ============================================

  describe("fix pattern CRUD", () => {
    beforeEach(async () => {
      await store.initialize();
    });

    describe("saveFixPattern", () => {
      it("should save a valid fix pattern", async () => {
        const pattern = createTestFixPattern();
        const result = await store.saveFixPattern(pattern);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data?.id).toBe(pattern.id);
      });

      it("should reject invalid fix pattern", async () => {
        const invalid = { id: "not-a-uuid", name: "x" } as FixPattern;
        const result = await store.saveFixPattern(invalid);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Validation failed");
      });

      it("should persist pattern to disk", async () => {
        const pattern = createTestFixPattern();
        await store.saveFixPattern(pattern);

        const filePath = path.join(
          TEST_WORKSPACE,
          PATTERNS_DIR,
          "fixes",
          `${pattern.id}.json`,
        );
        const content = await fs.promises.readFile(filePath, "utf-8");
        const saved = JSON.parse(content);

        expect(saved.id).toBe(pattern.id);
        expect(saved.name).toBe(pattern.name);
      });
    });

    describe("getFixPattern", () => {
      it("should retrieve a saved pattern", async () => {
        const pattern = createTestFixPattern();
        await store.saveFixPattern(pattern);

        const result = await store.getFixPattern(pattern.id);

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe(pattern.id);
        expect(result.data?.name).toBe(pattern.name);
      });

      it("should return error for non-existent pattern", async () => {
        const result = await store.getFixPattern("non-existent-id");

        expect(result.success).toBe(false);
        expect(result.error).toBe("Pattern not found");
      });
    });

    describe("deleteFixPattern", () => {
      it("should delete an existing pattern", async () => {
        const pattern = createTestFixPattern();
        await store.saveFixPattern(pattern);

        const deleteResult = await store.deleteFixPattern(pattern.id);
        expect(deleteResult.success).toBe(true);

        const getResult = await store.getFixPattern(pattern.id);
        expect(getResult.success).toBe(false);
        expect(getResult.error).toBe("Pattern not found");
      });

      it("should return error for non-existent pattern", async () => {
        const result = await store.deleteFixPattern("non-existent-id");

        expect(result.success).toBe(false);
        expect(result.error).toBe("Pattern not found");
      });
    });

    describe("listFixPatterns", () => {
      it("should return empty array when no patterns exist", async () => {
        const result = await store.listFixPatterns();

        expect(result.success).toBe(true);
        expect(result.data).toEqual([]);
      });

      it("should return all saved patterns", async () => {
        const pattern1 = createTestFixPattern({ name: "Pattern 1" });
        const pattern2 = createTestFixPattern({ name: "Pattern 2" });

        await store.saveFixPattern(pattern1);
        await store.saveFixPattern(pattern2);

        const result = await store.listFixPatterns();

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(2);
      });

      it("should filter by framework", async () => {
        const nextPattern = createTestFixPattern({
          compatibility: {
            framework: "next",
            frameworkVersion: "^14.0.0",
            dependencies: [],
          },
        });
        const reactPattern = createTestFixPattern({
          compatibility: {
            framework: "react",
            frameworkVersion: "^18.0.0",
            dependencies: [],
          },
        });

        await store.saveFixPattern(nextPattern);
        await store.saveFixPattern(reactPattern);

        const result = await store.listFixPatterns({ framework: "next" });

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(1);
        expect(result.data?.[0].compatibility.framework).toBe("next");
      });

      it("should filter by category", async () => {
        const lintPattern = createTestFixPattern({ category: "lint" });
        const depPattern = createTestFixPattern({ category: "dependency" });

        await store.saveFixPattern(lintPattern);
        await store.saveFixPattern(depPattern);

        const result = await store.listFixPatterns({ category: "lint" });

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(1);
        expect(result.data?.[0].category).toBe("lint");
      });

      it("should filter by tags", async () => {
        const reactTag = { name: "react", category: "framework" as const };
        const vueTag = { name: "vue", category: "framework" as const };

        const reactPattern = createTestFixPattern({ tags: [reactTag] });
        const vuePattern = createTestFixPattern({ tags: [vueTag] });

        await store.saveFixPattern(reactPattern);
        await store.saveFixPattern(vuePattern);

        const result = await store.listFixPatterns({ tags: [reactTag] });

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(1);
        expect(result.data?.[0].tags[0].name).toBe("react");
      });

      it("should search in name and description", async () => {
        const pattern1 = createTestFixPattern({
          name: "ESLint Fix",
          description: "Fixes ESLint errors",
        });
        const pattern2 = createTestFixPattern({
          name: "TypeScript Fix",
          description: "Fixes TS errors",
        });

        await store.saveFixPattern(pattern1);
        await store.saveFixPattern(pattern2);

        const result = await store.listFixPatterns({ search: "eslint" });

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(1);
        expect(result.data?.[0].name).toBe("ESLint Fix");
      });

      it("should apply pagination", async () => {
        for (let i = 0; i < 5; i++) {
          await store.saveFixPattern(createTestFixPattern({ name: `Pattern ${i}` }));
        }

        const result = await store.listFixPatterns({ limit: 2, offset: 1 });

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(2);
      });
    });

    describe("updateFixMetrics", () => {
      it("should update metrics on success", async () => {
        const pattern = createTestFixPattern();
        await store.saveFixPattern(pattern);

        const result = await store.updateFixMetrics(pattern.id, true);

        expect(result.success).toBe(true);
        expect(result.data?.metrics.applications).toBe(1);
        expect(result.data?.metrics.successes).toBe(1);
        expect(result.data?.metrics.failures).toBe(0);
        expect(result.data?.metrics.successRate).toBe(100);
      });

      it("should update metrics on failure", async () => {
        const pattern = createTestFixPattern();
        await store.saveFixPattern(pattern);

        const result = await store.updateFixMetrics(pattern.id, false);

        expect(result.success).toBe(true);
        expect(result.data?.metrics.applications).toBe(1);
        expect(result.data?.metrics.successes).toBe(0);
        expect(result.data?.metrics.failures).toBe(1);
        expect(result.data?.metrics.successRate).toBe(0);
      });

      it("should return error for non-existent pattern", async () => {
        const result = await store.updateFixMetrics("non-existent", true);

        expect(result.success).toBe(false);
      });
    });

    describe("deprecateFixPattern", () => {
      it("should deprecate a pattern", async () => {
        const pattern = createTestFixPattern();
        await store.saveFixPattern(pattern);

        const result = await store.deprecateFixPattern(
          pattern.id,
          "No longer needed",
        );

        expect(result.success).toBe(true);
        expect(result.data?.deprecatedAt).toBeDefined();
        expect(result.data?.deprecationReason).toBe("No longer needed");
      });

      it("should exclude deprecated patterns from default list", async () => {
        const pattern = createTestFixPattern();
        await store.saveFixPattern(pattern);
        await store.deprecateFixPattern(pattern.id, "Deprecated");

        const result = await store.listFixPatterns();

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(0);
      });

      it("should include deprecated patterns when requested", async () => {
        const pattern = createTestFixPattern();
        await store.saveFixPattern(pattern);
        await store.deprecateFixPattern(pattern.id, "Deprecated");

        const result = await store.listFixPatterns({ includeDeprecated: true });

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(1);
      });
    });
  });

  // ============================================
  // Blueprint CRUD Tests
  // ============================================

  describe("blueprint CRUD", () => {
    beforeEach(async () => {
      await store.initialize();
    });

    describe("saveBlueprint", () => {
      it("should save a valid blueprint", async () => {
        const blueprint = createTestBlueprint();
        const result = await store.saveBlueprint(blueprint);

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe(blueprint.id);
      });

      it("should reject invalid blueprint", async () => {
        const invalid = { id: "not-a-uuid" } as Blueprint;
        const result = await store.saveBlueprint(invalid);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Validation failed");
      });
    });

    describe("getBlueprint", () => {
      it("should retrieve a saved blueprint", async () => {
        const blueprint = createTestBlueprint();
        await store.saveBlueprint(blueprint);

        const result = await store.getBlueprint(blueprint.id);

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe(blueprint.id);
      });

      it("should return error for non-existent blueprint", async () => {
        const result = await store.getBlueprint("non-existent");

        expect(result.success).toBe(false);
        expect(result.error).toBe("Blueprint not found");
      });
    });

    describe("deleteBlueprint", () => {
      it("should delete an existing blueprint", async () => {
        const blueprint = createTestBlueprint();
        await store.saveBlueprint(blueprint);

        const deleteResult = await store.deleteBlueprint(blueprint.id);
        expect(deleteResult.success).toBe(true);

        const getResult = await store.getBlueprint(blueprint.id);
        expect(getResult.success).toBe(false);
      });
    });

    describe("listBlueprints", () => {
      it("should return all saved blueprints", async () => {
        const bp1 = createTestBlueprint({ name: "Blueprint 1" });
        const bp2 = createTestBlueprint({ name: "Blueprint 2" });

        await store.saveBlueprint(bp1);
        await store.saveBlueprint(bp2);

        const result = await store.listBlueprints();

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(2);
      });

      it("should filter by framework", async () => {
        const nextBp = createTestBlueprint({
          compatibility: {
            framework: "next",
            frameworkVersion: "^14.0.0",
            dependencies: [],
          },
        });
        const vueBp = createTestBlueprint({
          compatibility: {
            framework: "vue",
            frameworkVersion: "^3.0.0",
            dependencies: [],
          },
        });

        await store.saveBlueprint(nextBp);
        await store.saveBlueprint(vueBp);

        const result = await store.listBlueprints({ framework: "vue" });

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(1);
        expect(result.data?.[0].compatibility.framework).toBe("vue");
      });
    });

    describe("updateBlueprintMetrics", () => {
      it("should update metrics", async () => {
        const blueprint = createTestBlueprint();
        await store.saveBlueprint(blueprint);

        const result = await store.updateBlueprintMetrics(blueprint.id, true);

        expect(result.success).toBe(true);
        expect(result.data?.metrics.applications).toBe(1);
        expect(result.data?.metrics.successes).toBe(1);
      });
    });

    describe("deprecateBlueprint", () => {
      it("should deprecate a blueprint", async () => {
        const blueprint = createTestBlueprint();
        await store.saveBlueprint(blueprint);

        const result = await store.deprecateBlueprint(blueprint.id, "Outdated");

        expect(result.success).toBe(true);
        expect(result.data?.deprecatedAt).toBeDefined();
        expect(result.data?.deprecationReason).toBe("Outdated");
      });
    });
  });

  // ============================================
  // Search and Match Tests
  // ============================================

  describe("search and match", () => {
    beforeEach(async () => {
      await store.initialize();
    });

    describe("findMatchingFixes", () => {
      it("should find patterns matching error message", async () => {
        const pattern = createTestFixPattern({
          trigger: {
            errorPattern: "Cannot find module '(.+)'",
          },
        });
        await store.saveFixPattern(pattern);

        const result = await store.findMatchingFixes(
          "Cannot find module 'lodash'",
        );

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(1);
      });

      it("should not match non-matching errors", async () => {
        const pattern = createTestFixPattern({
          trigger: {
            errorPattern: "TypeError: (.+) is not a function",
          },
        });
        await store.saveFixPattern(pattern);

        const result = await store.findMatchingFixes(
          "Cannot find module 'lodash'",
        );

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(0);
      });

      it("should sort by success rate", async () => {
        const lowSuccess = createTestFixPattern({
          name: "Low Success",
          trigger: { errorPattern: "test error" },
          metrics: { ...createDefaultMetrics(), successRate: 50 },
        });
        const highSuccess = createTestFixPattern({
          name: "High Success",
          trigger: { errorPattern: "test error" },
          metrics: { ...createDefaultMetrics(), successRate: 95 },
        });

        await store.saveFixPattern(lowSuccess);
        await store.saveFixPattern(highSuccess);

        const result = await store.findMatchingFixes("test error");

        expect(result.success).toBe(true);
        expect(result.data?.[0].name).toBe("High Success");
        expect(result.data?.[1].name).toBe("Low Success");
      });

      it("should filter by framework", async () => {
        const nextPattern = createTestFixPattern({
          trigger: { errorPattern: "error" },
          compatibility: {
            framework: "next",
            frameworkVersion: "^14.0.0",
            dependencies: [],
          },
        });
        const reactPattern = createTestFixPattern({
          trigger: { errorPattern: "error" },
          compatibility: {
            framework: "react",
            frameworkVersion: "^18.0.0",
            dependencies: [],
          },
        });

        await store.saveFixPattern(nextPattern);
        await store.saveFixPattern(reactPattern);

        const result = await store.findMatchingFixes("error", "next");

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(1);
        expect(result.data?.[0].compatibility.framework).toBe("next");
      });

      it("should exclude deprecated patterns", async () => {
        const pattern = createTestFixPattern({
          trigger: { errorPattern: "test" },
          deprecatedAt: new Date().toISOString(),
        });
        await store.saveFixPattern(pattern);

        const result = await store.findMatchingFixes("test");

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(0);
      });
    });

    describe("findMatchingBlueprints", () => {
      it("should find blueprints by framework", async () => {
        const nextBp = createTestBlueprint({
          stack: {
            framework: "next",
            language: "typescript",
            runtime: "node",
            packageManager: "pnpm",
            dependencies: [],
            devDependencies: [],
          },
        });
        await store.saveBlueprint(nextBp);

        const result = await store.findMatchingBlueprints("next");

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(1);
      });

      it("should filter by language", async () => {
        const tsBp = createTestBlueprint({
          name: "TypeScript Blueprint",
          stack: {
            framework: "next",
            language: "typescript",
            runtime: "node",
            packageManager: "pnpm",
            dependencies: [],
            devDependencies: [],
          },
        });
        const jsBp = createTestBlueprint({
          name: "JavaScript Blueprint",
          stack: {
            framework: "next",
            language: "javascript",
            runtime: "node",
            packageManager: "npm",
            dependencies: [],
            devDependencies: [],
          },
        });

        await store.saveBlueprint(tsBp);
        await store.saveBlueprint(jsBp);

        const result = await store.findMatchingBlueprints("next", "typescript");

        expect(result.success).toBe(true);
        expect(result.data?.length).toBe(1);
        expect(result.data?.[0].name).toBe("TypeScript Blueprint");
      });
    });
  });

  // ============================================
  // Conflict Detection Tests
  // ============================================

  describe("conflict detection", () => {
    beforeEach(async () => {
      await store.initialize();
    });

    describe("detectFixConflict", () => {
      it("should detect no conflict for new pattern", async () => {
        const pattern = createTestFixPattern();
        const result = await store.detectFixConflict(pattern);

        expect(result.hasConflict).toBe(false);
      });

      it("should detect conflict with same name", async () => {
        const existing = createTestFixPattern({ name: "Duplicate Name" });
        await store.saveFixPattern(existing);

        const newPattern = createTestFixPattern({ name: "Duplicate Name" });
        const result = await store.detectFixConflict(newPattern);

        expect(result.hasConflict).toBe(true);
        expect(result.suggestedVersion).toBe(2);
        expect(result.existingPattern?.id).toBe(existing.id);
      });

      it("should suggest incrementing version number", async () => {
        const v1 = createTestFixPattern({ name: "Pattern", conflictVersion: 1 });
        const v2 = createTestFixPattern({ name: "Pattern", conflictVersion: 2 });
        await store.saveFixPattern(v1);
        await store.saveFixPattern(v2);

        const newPattern = createTestFixPattern({ name: "Pattern" });
        const result = await store.detectFixConflict(newPattern);

        expect(result.hasConflict).toBe(true);
        expect(result.suggestedVersion).toBe(3);
      });

      it("should auto-assign version on save", async () => {
        const existing = createTestFixPattern({ name: "Same Name" });
        await store.saveFixPattern(existing);

        const duplicate = createTestFixPattern({ name: "Same Name" });
        const result = await store.saveFixPattern(duplicate);

        expect(result.success).toBe(true);
        expect(result.data?.conflictVersion).toBe(2);
        expect(result.data?.originalId).toBe(existing.id);
      });
    });

    describe("detectBlueprintConflict", () => {
      it("should detect no conflict for new blueprint", async () => {
        const blueprint = createTestBlueprint();
        const result = await store.detectBlueprintConflict(blueprint);

        expect(result.hasConflict).toBe(false);
      });

      it("should detect conflict with same name", async () => {
        const existing = createTestBlueprint({ name: "Duplicate Blueprint" });
        await store.saveBlueprint(existing);

        const newBlueprint = createTestBlueprint({ name: "Duplicate Blueprint" });
        const result = await store.detectBlueprintConflict(newBlueprint);

        expect(result.hasConflict).toBe(true);
        expect(result.suggestedVersion).toBe(2);
      });
    });
  });

  // ============================================
  // Deprecation Management Tests
  // ============================================

  describe("deprecation management", () => {
    beforeEach(async () => {
      await store.initialize();
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    describe("autoDeprecateOldPatterns", () => {
      it("should deprecate patterns older than threshold", async () => {
        // Create pattern with old date
        const oldDate = new Date("2022-01-01T00:00:00.000Z");
        const pattern = createTestFixPattern({
          createdAt: oldDate.toISOString(),
          updatedAt: oldDate.toISOString(),
        });
        await store.saveFixPattern(pattern);

        // Set current time to more than a year later
        vi.setSystemTime(new Date("2024-01-15T00:00:00.000Z"));

        const result = await store.autoDeprecateOldPatterns();

        expect(result.fixes).toBe(1);
        expect(result.blueprints).toBe(0);

        const updated = await store.getFixPattern(pattern.id);
        expect(updated.data?.deprecatedAt).toBeDefined();
        expect(updated.data?.deprecationReason).toContain("Auto-deprecated");
      });

      it("should not deprecate recent patterns", async () => {
        vi.setSystemTime(new Date("2024-01-15T00:00:00.000Z"));

        const recentPattern = createTestFixPattern({
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-10T00:00:00.000Z",
        });
        await store.saveFixPattern(recentPattern);

        const result = await store.autoDeprecateOldPatterns();

        expect(result.fixes).toBe(0);

        const updated = await store.getFixPattern(recentPattern.id);
        expect(updated.data?.deprecatedAt).toBeUndefined();
      });

      it("should use custom threshold", async () => {
        vi.setSystemTime(new Date("2024-03-01T00:00:00.000Z"));

        const pattern = createTestFixPattern({
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z", // 60 days old
        });
        await store.saveFixPattern(pattern);

        // Should not deprecate with default 365-day threshold
        const result1 = await store.autoDeprecateOldPatterns();
        expect(result1.fixes).toBe(0);

        // Should deprecate with 30-day threshold
        const result2 = await store.autoDeprecateOldPatterns(30);
        expect(result2.fixes).toBe(1);
      });

      it("should not re-deprecate already deprecated patterns", async () => {
        vi.setSystemTime(new Date("2024-01-15T00:00:00.000Z"));

        const pattern = createTestFixPattern({
          createdAt: "2022-01-01T00:00:00.000Z",
          updatedAt: "2022-01-01T00:00:00.000Z",
          deprecatedAt: "2023-06-01T00:00:00.000Z",
          deprecationReason: "Already deprecated",
        });
        await store.saveFixPattern(pattern);

        const result = await store.autoDeprecateOldPatterns();

        expect(result.fixes).toBe(0);
      });
    });

    describe("getDeprecatedPatterns", () => {
      it("should return all deprecated patterns", async () => {
        vi.setSystemTime(new Date("2024-01-15T00:00:00.000Z"));

        const activePattern = createTestFixPattern({
          name: "Active",
          updatedAt: "2024-01-10T00:00:00.000Z",
        });
        const deprecatedPattern = createTestFixPattern({
          name: "Deprecated",
          deprecatedAt: "2024-01-01T00:00:00.000Z",
        });
        const activeBlueprint = createTestBlueprint({
          name: "Active BP",
          updatedAt: "2024-01-10T00:00:00.000Z",
        });
        const deprecatedBlueprint = createTestBlueprint({
          name: "Deprecated BP",
          deprecatedAt: "2024-01-01T00:00:00.000Z",
        });

        await store.saveFixPattern(activePattern);
        await store.saveFixPattern(deprecatedPattern);
        await store.saveBlueprint(activeBlueprint);
        await store.saveBlueprint(deprecatedBlueprint);

        const result = await store.getDeprecatedPatterns();

        expect(result.fixes.length).toBe(1);
        expect(result.fixes[0].name).toBe("Deprecated");
        expect(result.blueprints.length).toBe(1);
        expect(result.blueprints[0].name).toBe("Deprecated BP");
      });
    });
  });

  // ============================================
  // Statistics Tests
  // ============================================

  describe("statistics", () => {
    beforeEach(async () => {
      await store.initialize();
    });

    describe("getStats", () => {
      it("should return correct statistics", async () => {
        // Create patterns with different states
        const publicFix = createTestFixPattern({
          isPrivate: false,
          syncedAt: new Date().toISOString(),
        });
        const privateFix = createTestFixPattern({ isPrivate: true });
        const deprecatedFix = createTestFixPattern({
          deprecatedAt: new Date().toISOString(),
        });

        const publicBp = createTestBlueprint({
          isPrivate: false,
          syncedAt: new Date().toISOString(),
        });
        const privateBp = createTestBlueprint({ isPrivate: true });

        await store.saveFixPattern(publicFix);
        await store.saveFixPattern(privateFix);
        await store.saveFixPattern(deprecatedFix);
        await store.saveBlueprint(publicBp);
        await store.saveBlueprint(privateBp);

        const stats = await store.getStats();

        expect(stats.totalFixes).toBe(3);
        expect(stats.totalBlueprints).toBe(2);
        expect(stats.deprecatedFixes).toBe(1);
        expect(stats.deprecatedBlueprints).toBe(0);
        expect(stats.privateFixes).toBe(2); // privateFix + deprecatedFix (default is private)
        expect(stats.privateBlueprints).toBe(1);
        expect(stats.syncedFixes).toBe(1);
        expect(stats.syncedBlueprints).toBe(1);
      });

      it("should return zeros for empty store", async () => {
        const stats = await store.getStats();

        expect(stats.totalFixes).toBe(0);
        expect(stats.totalBlueprints).toBe(0);
        expect(stats.deprecatedFixes).toBe(0);
        expect(stats.deprecatedBlueprints).toBe(0);
      });
    });
  });

  // ============================================
  // Sync Helper Tests
  // ============================================

  describe("sync helpers", () => {
    beforeEach(async () => {
      await store.initialize();
    });

    describe("getPatternsForSync", () => {
      it("should return only non-private, non-deprecated patterns", async () => {
        const syncable = createTestFixPattern({
          name: "Syncable",
          isPrivate: false,
        });
        const privatePattern = createTestFixPattern({
          name: "Private",
          isPrivate: true,
        });
        const deprecatedPattern = createTestFixPattern({
          name: "Deprecated",
          isPrivate: false,
          deprecatedAt: new Date().toISOString(),
        });

        await store.saveFixPattern(syncable);
        await store.saveFixPattern(privatePattern);
        await store.saveFixPattern(deprecatedPattern);

        const result = await store.getPatternsForSync();

        expect(result.fixes.length).toBe(1);
        expect(result.fixes[0].name).toBe("Syncable");
      });
    });

    describe("markAsSynced", () => {
      it("should mark patterns as synced", async () => {
        const pattern = createTestFixPattern();
        await store.saveFixPattern(pattern);

        await store.markAsSynced([pattern.id], "fix");

        const updated = await store.getFixPattern(pattern.id);
        expect(updated.data?.syncedAt).toBeDefined();
      });

      it("should mark blueprints as synced", async () => {
        const blueprint = createTestBlueprint();
        await store.saveBlueprint(blueprint);

        await store.markAsSynced([blueprint.id], "blueprint");

        const updated = await store.getBlueprint(blueprint.id);
        expect(updated.data?.syncedAt).toBeDefined();
      });
    });
  });

  // ============================================
  // Factory Function Tests
  // ============================================

  describe("createPatternStore", () => {
    it("should create a new PatternStore instance", () => {
      const store = createPatternStore("/some/path");
      expect(store).toBeInstanceOf(PatternStore);
    });
  });
});
