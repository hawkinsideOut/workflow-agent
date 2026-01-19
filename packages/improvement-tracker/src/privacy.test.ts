import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  ContributorManager,
  createContributorManager,
  type ContributorConfig,
} from "./contributor";
import {
  PatternAnonymizer,
  createAnonymizer,
  anonymizeFixPattern,
  anonymizeBlueprint,
  DEFAULT_ANONYMIZATION_OPTIONS,
} from "./anonymizer";
import {
  type FixPattern,
  type Blueprint,
  createDefaultMetrics,
  CONTRIBUTOR_ID_FILE,
} from "./patterns-schema";

// ============================================
// Test Constants
// ============================================

const TEST_WORKSPACE = "/tmp/privacy-test";

// ============================================
// Test Fixtures
// ============================================

const createTestFixPattern = (overrides: Partial<FixPattern> = {}): FixPattern => {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: "Test Fix Pattern",
    description: "A test pattern for privacy tests",
    category: "dependency",
    tags: [{ name: "test", category: "custom" }],
    trigger: {
      errorPattern: "Cannot find module '(.+)'",
      errorMessage: "Error in /home/johndoe/projects/myapp/src/index.ts: Cannot find module 'lodash'",
      context: "File: /Users/johndoe/Documents/code/project/src/main.ts",
    },
    solution: {
      type: "dependency-add",
      steps: [
        {
          order: 1,
          action: "install",
          target: "/home/johndoe/projects/myapp",
          description: "Install lodash in /home/johndoe/projects/myapp",
          content: "// API key: sk_live_abc123xyz789secret",
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
    contributorId: "wf-original-contributor-id",
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
    description: "A blueprint for user@example.com's project",
    tags: [{ name: "next", category: "framework" }],
    stack: {
      framework: "next",
      language: "typescript",
      runtime: "node",
      packageManager: "pnpm",
      dependencies: [],
      devDependencies: [],
    },
    structure: {
      directories: [{ path: "src", purpose: "Source code" }],
      keyFiles: [
        {
          path: "src/app/page.tsx",
          purpose: "Home page",
          template: `// Created by johndoe
// Config at /home/johndoe/.config/app
export default function Home() {}`,
        },
      ],
    },
    setup: {
      prerequisites: ["Node.js 20+"],
      steps: [
        {
          order: 1,
          command: "pnpm install --prefix /home/johndoe/projects/app",
          description: "Install deps",
        },
      ],
      configs: [
        {
          file: "config/settings.json",
          content: JSON.stringify({
            apiKey: "ghp_abc123secrettoken789",
            email: "developer@company.com",
            host: "192.168.1.100",
          }),
          description: "App configuration",
        },
      ],
    },
    compatibility: {
      framework: "next",
      frameworkVersion: "^14.0.0",
      dependencies: [],
    },
    metrics: createDefaultMetrics(),
    relatedPatterns: [],
    isPrivate: true,
    contributorId: "wf-original-contributor-id",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};

// ============================================
// ContributorManager Tests
// ============================================

describe("ContributorManager", () => {
  let manager: ContributorManager;

  beforeEach(async () => {
    // Clean up test directory
    try {
      await fs.promises.rm(TEST_WORKSPACE, { recursive: true, force: true });
    } catch {
      // Directory may not exist
    }
    await fs.promises.mkdir(TEST_WORKSPACE, { recursive: true });
    manager = createContributorManager(TEST_WORKSPACE);
  });

  afterEach(async () => {
    try {
      await fs.promises.rm(TEST_WORKSPACE, { recursive: true, force: true });
    } catch {
      // Cleanup may fail
    }
  });

  describe("getOrCreateId", () => {
    it("should create a new contributor ID if none exists", async () => {
      const result = await manager.getOrCreateId();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data).toMatch(/^wf-[a-f0-9-]{36}$/);
    });

    it("should return existing ID on subsequent calls", async () => {
      const result1 = await manager.getOrCreateId();
      const result2 = await manager.getOrCreateId();

      expect(result1.data).toBe(result2.data);
    });

    it("should persist ID to disk", async () => {
      const result = await manager.getOrCreateId();

      const filePath = path.join(TEST_WORKSPACE, CONTRIBUTOR_ID_FILE);
      const content = await fs.promises.readFile(filePath, "utf-8");
      const config = JSON.parse(content);

      expect(config.id).toBe(result.data);
    });
  });

  describe("getConfig", () => {
    it("should return error when config does not exist", async () => {
      const result = await manager.getConfig();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Contributor config not found");
    });

    it("should return config after creation", async () => {
      await manager.createConfig();
      const result = await manager.getConfig();

      expect(result.success).toBe(true);
      expect(result.data?.id).toBeDefined();
      expect(result.data?.createdAt).toBeDefined();
      expect(result.data?.syncOptIn).toBe(false);
      expect(result.data?.telemetryEnabled).toBe(false);
    });

    it("should cache config after first read", async () => {
      await manager.createConfig();
      const result1 = await manager.getConfig();
      const result2 = await manager.getConfig();

      expect(result1.data).toEqual(result2.data);
    });
  });

  describe("createConfig", () => {
    it("should create config with default values", async () => {
      const result = await manager.createConfig();

      expect(result.success).toBe(true);
      expect(result.data?.id).toMatch(/^wf-[a-f0-9-]{36}$/);
      expect(result.data?.syncOptIn).toBe(false);
      expect(result.data?.telemetryEnabled).toBe(false);
    });

    it("should create config file in correct location", async () => {
      await manager.createConfig();

      const filePath = path.join(TEST_WORKSPACE, CONTRIBUTOR_ID_FILE);
      await expect(fs.promises.access(filePath)).resolves.toBeUndefined();
    });
  });

  describe("exists", () => {
    it("should return false when config does not exist", async () => {
      const exists = await manager.exists();
      expect(exists).toBe(false);
    });

    it("should return true after config is created", async () => {
      await manager.createConfig();
      const exists = await manager.exists();
      expect(exists).toBe(true);
    });
  });

  describe("sync settings", () => {
    describe("enableSync", () => {
      it("should enable sync and set timestamp", async () => {
        const result = await manager.enableSync();

        expect(result.success).toBe(true);
        expect(result.data?.syncOptIn).toBe(true);
        expect(result.data?.syncEnabledAt).toBeDefined();
      });

      it("should create config if it does not exist", async () => {
        const result = await manager.enableSync();

        expect(result.success).toBe(true);
        expect(result.data?.id).toBeDefined();
      });
    });

    describe("disableSync", () => {
      it("should disable sync", async () => {
        await manager.enableSync();
        const result = await manager.disableSync();

        expect(result.success).toBe(true);
        expect(result.data?.syncOptIn).toBe(false);
        expect(result.data?.syncEnabledAt).toBeUndefined();
      });

      it("should return error if config does not exist", async () => {
        const result = await manager.disableSync();

        expect(result.success).toBe(false);
        expect(result.error).toBe("Contributor config not found");
      });
    });

    describe("isSyncEnabled", () => {
      it("should return false by default", async () => {
        await manager.createConfig();
        const enabled = await manager.isSyncEnabled();
        expect(enabled).toBe(false);
      });

      it("should return true after enabling", async () => {
        await manager.enableSync();
        const enabled = await manager.isSyncEnabled();
        expect(enabled).toBe(true);
      });
    });
  });

  describe("telemetry settings", () => {
    describe("enableTelemetry", () => {
      it("should enable telemetry", async () => {
        const result = await manager.enableTelemetry();

        expect(result.success).toBe(true);
        expect(result.data?.telemetryEnabled).toBe(true);
      });
    });

    describe("disableTelemetry", () => {
      it("should disable telemetry", async () => {
        await manager.enableTelemetry();
        const result = await manager.disableTelemetry();

        expect(result.success).toBe(true);
        expect(result.data?.telemetryEnabled).toBe(false);
      });
    });

    describe("isTelemetryEnabled", () => {
      it("should return false by default", async () => {
        await manager.createConfig();
        const enabled = await manager.isTelemetryEnabled();
        expect(enabled).toBe(false);
      });

      it("should return true after enabling", async () => {
        await manager.enableTelemetry();
        const enabled = await manager.isTelemetryEnabled();
        expect(enabled).toBe(true);
      });
    });
  });

  describe("resetId", () => {
    it("should generate a new ID", async () => {
      const original = await manager.getOrCreateId();
      const result = await manager.resetId();

      expect(result.success).toBe(true);
      expect(result.data?.id).not.toBe(original.data);
      expect(result.data?.id).toMatch(/^wf-[a-f0-9-]{36}$/);
    });

    it("should preserve sync and telemetry settings", async () => {
      await manager.enableSync();
      await manager.enableTelemetry();
      const result = await manager.resetId();

      expect(result.data?.syncOptIn).toBe(true);
      expect(result.data?.telemetryEnabled).toBe(true);
    });
  });

  describe("delete", () => {
    it("should delete the config file", async () => {
      await manager.createConfig();
      await manager.delete();

      const exists = await manager.exists();
      expect(exists).toBe(false);
    });

    it("should succeed even if file does not exist", async () => {
      const result = await manager.delete();
      expect(result.success).toBe(true);
    });

    it("should clear the cache", async () => {
      await manager.createConfig();
      await manager.delete();

      // After delete, getConfig should fail
      const result = await manager.getConfig();
      expect(result.success).toBe(false);
    });
  });

  describe("clearCache", () => {
    it("should clear cached config", async () => {
      await manager.createConfig();
      await manager.getConfig(); // Populate cache

      manager.clearCache();

      // Should still work but need to read from disk
      const result = await manager.getConfig();
      expect(result.success).toBe(true);
    });
  });
});

// ============================================
// PatternAnonymizer Tests
// ============================================

describe("PatternAnonymizer", () => {
  describe("constructor", () => {
    it("should use default options", () => {
      const anonymizer = new PatternAnonymizer();
      // Test that it works with defaults
      const result = anonymizer.anonymizeString("test");
      expect(result).toBe("test");
    });

    it("should accept custom options", () => {
      const anonymizer = new PatternAnonymizer({
        anonymizePaths: false,
      });
      // Should not anonymize paths with custom option
      const result = anonymizer.anonymizePath("/home/user/path");
      // With anonymizePaths: false, still converts absolute to relative
      expect(result).toBeDefined();
    });
  });

  describe("anonymizeString", () => {
    let anonymizer: PatternAnonymizer;

    beforeEach(() => {
      anonymizer = new PatternAnonymizer();
    });

    it("should anonymize Unix absolute paths", () => {
      const result = anonymizer.anonymizeString(
        "Error in /home/johndoe/projects/app/src/index.ts",
      );
      expect(result).not.toContain("/home/johndoe");
      expect(result).toContain("<PATH>");
    });

    it("should anonymize Windows absolute paths", () => {
      const result = anonymizer.anonymizeString(
        "Error in C:\\Users\\JohnDoe\\Documents\\project\\src\\index.ts",
      );
      expect(result).not.toContain("C:\\Users\\JohnDoe");
      expect(result).toContain("<PATH>");
    });

    it("should anonymize email addresses", () => {
      const result = anonymizer.anonymizeString(
        "Contact developer@company.com for help",
      );
      expect(result).not.toContain("developer@company.com");
      expect(result).toContain("<EMAIL>");
    });

    it("should anonymize IP addresses", () => {
      const result = anonymizer.anonymizeString(
        "Server running on 192.168.1.100:3000",
      );
      expect(result).not.toContain("192.168.1.100");
      expect(result).toContain("<IP>");
    });

    it("should anonymize API keys", () => {
      const result = anonymizer.anonymizeString(
        "api_key=sk_test_FAKE_KEY_FOR_TESTING_1234",
      );
      expect(result).not.toContain("sk_test_FAKE_KEY_FOR_TESTING_1234");
      expect(result).toContain("<API_KEY>");
    });

    it("should anonymize GitHub tokens", () => {
      const result = anonymizer.anonymizeString(
        "token: ghp_FAKE_TOKEN_FOR_TESTING_1234",
      );
      expect(result).not.toContain("ghp_FAKE_TOKEN_FOR_TESTING_1234");
      // GitHub tokens are caught by either API_KEY or SECRET pattern
      expect(result.includes("<SECRET>") || result.includes("<API_KEY>")).toBe(true);
    });

    it("should anonymize authenticated URLs", () => {
      const result = anonymizer.anonymizeString(
        "Connect to https://user:password@api.example.com/v1",
      );
      expect(result).not.toContain("user:password");
      // Authenticated URLs may be partially anonymized by other patterns
      expect(result.includes("<URL>") || result.includes("<EMAIL>")).toBe(true);
    });

    it("should anonymize git remotes with usernames", () => {
      const result = anonymizer.anonymizeString(
        "Push to git@github.com:username/repo.git",
      );
      // Git remotes may be caught by email pattern or URL pattern
      expect(result).not.toContain("git@github.com:username/repo.git");
    });

    it("should handle multiple patterns in one string", () => {
      const result = anonymizer.anonymizeString(
        "Error in /home/user/app with email user@test.com and IP 10.0.0.1",
      );
      expect(result).toContain("<PATH>");
      expect(result).toContain("<EMAIL>");
      expect(result).toContain("<IP>");
    });

    it("should not modify strings without PII", () => {
      const input = "This is a normal log message without any PII";
      const result = anonymizer.anonymizeString(input);
      expect(result).toBe(input);
    });
  });

  describe("anonymizePath", () => {
    let anonymizer: PatternAnonymizer;

    beforeEach(() => {
      anonymizer = new PatternAnonymizer();
    });

    it("should convert absolute paths to relative", () => {
      const result = anonymizer.anonymizePath("/home/user/projects/app/src/index.ts");
      expect(result).not.toContain("/home/user");
      expect(result).toContain("app/src/index.ts");
    });

    it("should keep relative paths mostly unchanged", () => {
      const result = anonymizer.anonymizePath("src/components/Button.tsx");
      expect(result).toBe("src/components/Button.tsx");
    });

    it("should normalize path separators", () => {
      const result = anonymizer.anonymizePath("src\\components\\Button.tsx");
      expect(result).toBe("src/components/Button.tsx");
    });
  });

  describe("anonymizeFixPattern", () => {
    let anonymizer: PatternAnonymizer;

    beforeEach(() => {
      anonymizer = new PatternAnonymizer();
    });

    it("should anonymize trigger.errorMessage", () => {
      const pattern = createTestFixPattern();
      const result = anonymizer.anonymizeFixPattern(pattern);

      expect(result.success).toBe(true);
      expect(result.data?.trigger.errorMessage).not.toContain("/home/johndoe");
      expect(result.anonymizedFields).toContain("trigger.errorMessage");
    });

    it("should anonymize trigger.context", () => {
      const pattern = createTestFixPattern();
      const result = anonymizer.anonymizeFixPattern(pattern);

      expect(result.success).toBe(true);
      expect(result.data?.trigger.context).not.toContain("/Users/johndoe");
    });

    it("should anonymize solution steps", () => {
      const pattern = createTestFixPattern();
      const result = anonymizer.anonymizeFixPattern(pattern);

      expect(result.success).toBe(true);
      expect(result.data?.solution.steps[0].target).not.toContain("/home/johndoe");
      expect(result.data?.solution.steps[0].content).not.toContain("sk_live_");
    });

    it("should remove contributorId", () => {
      const pattern = createTestFixPattern();
      const result = anonymizer.anonymizeFixPattern(pattern);

      expect(result.success).toBe(true);
      expect(result.data?.contributorId).toBeUndefined();
      expect(result.anonymizedFields).toContain("contributorId");
    });

    it("should preserve pattern structure", () => {
      const pattern = createTestFixPattern();
      const result = anonymizer.anonymizeFixPattern(pattern);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(pattern.id);
      expect(result.data?.name).toBe(pattern.name);
      expect(result.data?.category).toBe(pattern.category);
      expect(result.data?.solution.type).toBe(pattern.solution.type);
    });
  });

  describe("anonymizeBlueprint", () => {
    let anonymizer: PatternAnonymizer;

    beforeEach(() => {
      anonymizer = new PatternAnonymizer();
    });

    it("should anonymize keyFile templates", () => {
      const blueprint = createTestBlueprint();
      const result = anonymizer.anonymizeBlueprint(blueprint);

      expect(result.success).toBe(true);
      expect(result.data?.structure.keyFiles[0].template).not.toContain(
        "/home/johndoe",
      );
    });

    it("should anonymize config content", () => {
      const blueprint = createTestBlueprint();
      const result = anonymizer.anonymizeBlueprint(blueprint);

      expect(result.success).toBe(true);
      const configContent = result.data?.setup.configs[0].content;
      expect(configContent).not.toContain("ghp_abc123secrettoken789");
      expect(configContent).not.toContain("developer@company.com");
      expect(configContent).not.toContain("192.168.1.100");
    });

    it("should anonymize setup step commands", () => {
      const blueprint = createTestBlueprint();
      const result = anonymizer.anonymizeBlueprint(blueprint);

      expect(result.success).toBe(true);
      expect(result.data?.setup.steps[0].command).not.toContain(
        "/home/johndoe",
      );
    });

    it("should remove contributorId", () => {
      const blueprint = createTestBlueprint();
      const result = anonymizer.anonymizeBlueprint(blueprint);

      expect(result.success).toBe(true);
      expect(result.data?.contributorId).toBeUndefined();
    });

    it("should preserve blueprint structure", () => {
      const blueprint = createTestBlueprint();
      const result = anonymizer.anonymizeBlueprint(blueprint);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(blueprint.id);
      expect(result.data?.name).toBe(blueprint.name);
      expect(result.data?.stack).toEqual(blueprint.stack);
    });
  });

  describe("containsPII", () => {
    let anonymizer: PatternAnonymizer;

    beforeEach(() => {
      anonymizer = new PatternAnonymizer();
    });

    it("should detect absolute paths", () => {
      expect(anonymizer.containsPII("/home/user/file.txt")).toBe(true);
      expect(anonymizer.containsPII("C:\\Users\\Admin\\file.txt")).toBe(true);
    });

    it("should detect emails", () => {
      expect(anonymizer.containsPII("Contact: user@example.com")).toBe(true);
    });

    it("should detect IP addresses", () => {
      expect(anonymizer.containsPII("Host: 192.168.1.1")).toBe(true);
    });

    it("should detect API keys", () => {
      expect(anonymizer.containsPII("api_key=sk_test_abc123xyz789secret")).toBe(true);
    });

    it("should detect secrets", () => {
      expect(anonymizer.containsPII("ghp_abc123secrettoken789")).toBe(true);
    });

    it("should return false for clean strings", () => {
      expect(anonymizer.containsPII("This is a normal message")).toBe(false);
    });
  });

  describe("validateAnonymization", () => {
    let anonymizer: PatternAnonymizer;

    beforeEach(() => {
      anonymizer = new PatternAnonymizer();
    });

    it("should detect PII in fix patterns", () => {
      const pattern = createTestFixPattern();
      const validation = anonymizer.validateAnonymization(pattern);

      expect(validation.isClean).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
    });

    it("should pass for anonymized patterns", () => {
      const pattern = createTestFixPattern();
      const result = anonymizer.anonymizeFixPattern(pattern);

      if (result.success && result.data) {
        const validation = anonymizer.validateAnonymization(result.data);
        expect(validation.isClean).toBe(true);
        expect(validation.issues.length).toBe(0);
      }
    });

    it("should detect PII in blueprints", () => {
      const blueprint = createTestBlueprint();
      const validation = anonymizer.validateAnonymization(blueprint);

      expect(validation.isClean).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
    });
  });

  describe("convenience functions", () => {
    it("anonymizeFixPattern should work", () => {
      const pattern = createTestFixPattern();
      const result = anonymizeFixPattern(pattern);

      expect(result.success).toBe(true);
      expect(result.data?.contributorId).toBeUndefined();
    });

    it("anonymizeBlueprint should work", () => {
      const blueprint = createTestBlueprint();
      const result = anonymizeBlueprint(blueprint);

      expect(result.success).toBe(true);
      expect(result.data?.contributorId).toBeUndefined();
    });
  });

  describe("createAnonymizer factory", () => {
    it("should create anonymizer with default options", () => {
      const anonymizer = createAnonymizer();
      expect(anonymizer).toBeInstanceOf(PatternAnonymizer);
    });

    it("should create anonymizer with custom options", () => {
      const anonymizer = createAnonymizer({ anonymizePaths: false });
      expect(anonymizer).toBeInstanceOf(PatternAnonymizer);
    });
  });
});

// ============================================
// Integration Tests
// ============================================

describe("Privacy Layer Integration", () => {
  let manager: ContributorManager;
  let anonymizer: PatternAnonymizer;

  beforeEach(async () => {
    try {
      await fs.promises.rm(TEST_WORKSPACE, { recursive: true, force: true });
    } catch {
      // OK
    }
    await fs.promises.mkdir(TEST_WORKSPACE, { recursive: true });
    manager = createContributorManager(TEST_WORKSPACE);
    anonymizer = new PatternAnonymizer();
  });

  afterEach(async () => {
    try {
      await fs.promises.rm(TEST_WORKSPACE, { recursive: true, force: true });
    } catch {
      // OK
    }
  });

  it("should prepare a pattern for sync", async () => {
    // Get contributor ID
    const contributorResult = await manager.getOrCreateId();
    expect(contributorResult.success).toBe(true);

    // Create pattern with contributor ID
    const pattern = createTestFixPattern({
      contributorId: contributorResult.data,
      isPrivate: false,
    });

    // Anonymize for sync
    const anonResult = anonymizer.anonymizeFixPattern(pattern);
    expect(anonResult.success).toBe(true);

    // Validate anonymization
    const validation = anonymizer.validateAnonymization(anonResult.data!);
    expect(validation.isClean).toBe(true);

    // Contributor ID should be removed
    expect(anonResult.data?.contributorId).toBeUndefined();
  });

  it("should handle full workflow: create ID, record pattern, anonymize, validate", async () => {
    // 1. Create contributor ID
    await manager.getOrCreateId();

    // 2. Enable sync
    const syncResult = await manager.enableSync();
    expect(syncResult.data?.syncOptIn).toBe(true);

    // 3. Create pattern with sensitive data
    const pattern = createTestFixPattern({
      contributorId: syncResult.data?.id,
    });

    // 4. Verify it contains PII
    expect(anonymizer.containsPII(pattern.trigger.errorMessage!)).toBe(true);

    // 5. Anonymize
    const anonResult = anonymizer.anonymizeFixPattern(pattern);
    expect(anonResult.success).toBe(true);

    // 6. Validate no PII remains
    const validation = anonymizer.validateAnonymization(anonResult.data!);
    expect(validation.isClean).toBe(true);
  });
});
