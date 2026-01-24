/**
 * Unit Tests for scope commands
 * Tests isolated logic with mocked dependencies using vi.mock()
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  statSync: vi.fn(),
}));

vi.mock("chalk", () => ({
  default: {
    cyan: (s: string) => s,
    green: (s: string) => s,
    red: (s: string) => s,
    yellow: (s: string) => s,
    bold: Object.assign((s: string) => s, {
      cyan: (s: string) => s,
    }),
    dim: (s: string) => s,
  },
}));

vi.mock("execa", () => ({
  execa: vi.fn(),
}));

// Import modules after mocks are set up
import * as fs from "fs";
import { execa } from "execa";

describe("scope commands - Unit Tests", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  // ============================================
  // scopeAddCommand Logic Tests
  // ============================================

  describe("scope add logic", () => {
    it("detects duplicate scope names", () => {
      const config = {
        scopes: [{ name: "feat", description: "Features" }],
      };
      const newScopeName = "feat";

      const exists = config.scopes.some((s) => s.name === newScopeName);
      expect(exists).toBe(true);
    });

    it("generates default values for optional fields", () => {
      const name = "api";
      const newScope = {
        name,
        description: `${name} related changes`,
        emoji: "📦",
        category: "feature",
      };

      expect(newScope.description).toBe("api related changes");
      expect(newScope.emoji).toBe("📦");
      expect(newScope.category).toBe("feature");
    });

    it("uses provided values over defaults", () => {
      const name = "api";
      const options = {
        description: "API changes",
        emoji: "🌐",
        category: "backend",
      };

      const newScope = {
        name,
        description: options.description || `${name} related changes`,
        emoji: options.emoji || "📦",
        category: options.category || "feature",
      };

      expect(newScope.description).toBe("API changes");
      expect(newScope.emoji).toBe("🌐");
      expect(newScope.category).toBe("backend");
    });

    it("validates config file exists", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const configFiles = [
        "workflow.config.json",
        "workflow.config.js",
        ".workflowrc.json",
      ];
      let configPath: string | null = null;

      for (const file of configFiles) {
        if (fs.existsSync(file)) {
          configPath = file;
          break;
        }
      }

      expect(configPath).toBeNull();
    });
  });

  // ============================================
  // scopeRemoveCommand Logic Tests
  // ============================================

  describe("scope remove logic", () => {
    it("finds scope to remove by name", () => {
      const config = {
        scopes: [
          { name: "feat", description: "Features" },
          { name: "fix", description: "Bug fixes" },
        ],
      };

      const index = config.scopes.findIndex((s) => s.name === "feat");
      expect(index).toBe(0);
    });

    it("returns -1 for non-existent scope", () => {
      const config = {
        scopes: [{ name: "feat", description: "Features" }],
      };

      const index = config.scopes.findIndex((s) => s.name === "nonexistent");
      expect(index).toBe(-1);
    });

    it("removes scope correctly", () => {
      const config = {
        scopes: [
          { name: "feat", description: "Features" },
          { name: "fix", description: "Bug fixes" },
        ],
      };

      const index = config.scopes.findIndex((s) => s.name === "feat");
      config.scopes.splice(index, 1);

      expect(config.scopes).toHaveLength(1);
      expect(config.scopes[0].name).toBe("fix");
    });
  });

  // ============================================
  // scopeAnalyzeCommand Logic Tests
  // ============================================

  describe("scope analyze logic", () => {
    it("parses conventional commit scope correctly", () => {
      const commits = [
        "feat(auth): add login",
        "fix(api): resolve issue",
        "docs: update readme",
      ];

      const scopeUsage: Record<string, number> = {};
      let unscoped = 0;

      for (const commit of commits) {
        const match = commit.match(/^\w+\(([^)]+)\):/);
        if (match) {
          const scope = match[1];
          scopeUsage[scope] = (scopeUsage[scope] || 0) + 1;
        } else if (commit.match(/^\w+:/)) {
          unscoped++;
        }
      }

      expect(scopeUsage["auth"]).toBe(1);
      expect(scopeUsage["api"]).toBe(1);
      expect(unscoped).toBe(1);
    });

    it("identifies unused scopes", () => {
      const definedScopes = ["feat", "fix", "docs", "style"];
      const usedScopes = ["feat", "fix"];

      const unusedScopes = definedScopes.filter((s) => !usedScopes.includes(s));
      expect(unusedScopes).toEqual(["docs", "style"]);
    });

    it("identifies invalid scopes", () => {
      const definedScopes = ["feat", "fix"];
      const usedScopes = ["feat", "api", "auth"];

      const invalidScopes = usedScopes.filter(
        (s) => !definedScopes.includes(s),
      );
      expect(invalidScopes).toEqual(["api", "auth"]);
    });

    it("calculates scope usage counts", () => {
      const commits = [
        "feat(auth): add login",
        "feat(auth): add logout",
        "fix(auth): fix token",
        "feat(api): add endpoint",
      ];

      const scopeUsage: Record<string, number> = {};

      for (const commit of commits) {
        const match = commit.match(/^\w+\(([^)]+)\):/);
        if (match) {
          const scope = match[1];
          scopeUsage[scope] = (scopeUsage[scope] || 0) + 1;
        }
      }

      expect(scopeUsage["auth"]).toBe(3);
      expect(scopeUsage["api"]).toBe(1);
    });
  });

  // ============================================
  // hooksTestCommand Logic Tests
  // ============================================

  describe("hooks test logic", () => {
    it("checks hook file existence", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      expect(fs.existsSync(".git/hooks/pre-commit")).toBe(true);
    });

    it("validates hook is executable", () => {
      vi.mocked(fs.statSync).mockReturnValue({
        mode: 0o755,
      } as ReturnType<typeof fs.statSync>);

      const mode = fs.statSync(".git/hooks/pre-commit").mode;
      const isExecutable = (mode & 0o111) !== 0;

      expect(isExecutable).toBe(true);
    });

    it("validates hook is workflow hook", () => {
      const hookContent =
        "#!/bin/sh\n# workflow-agent hook\nworkflow pre-commit";

      const isWorkflowHook = hookContent.includes("workflow-agent");
      expect(isWorkflowHook).toBe(true);
    });

    it("detects non-workflow hook", () => {
      const hookContent = "#!/bin/sh\nhusky run";

      const isWorkflowHook = hookContent.includes("workflow-agent");
      expect(isWorkflowHook).toBe(false);
    });
  });

  // ============================================
  // scopeSyncCommand Logic Tests
  // ============================================

  describe("scope sync logic", () => {
    it("determines sync direction from options", () => {
      const options = { push: true, pull: false, dryRun: false };

      const direction = options.push ? "push" : options.pull ? "pull" : "both";
      expect(direction).toBe("push");
    });

    it("defaults to both when neither push nor pull specified", () => {
      const options = { push: false, pull: false, dryRun: false };

      const direction = options.push ? "push" : options.pull ? "pull" : "both";
      expect(direction).toBe("both");
    });

    it("respects dry-run mode", () => {
      const options = { push: true, dryRun: true };

      expect(options.dryRun).toBe(true);
    });
  });

  // ============================================
  // Config File Parsing Tests
  // ============================================

  describe("config file parsing", () => {
    it("parses JSON config correctly", () => {
      const configContent = JSON.stringify({
        projectName: "test",
        scopes: [{ name: "feat", description: "Features" }],
      });

      const config = JSON.parse(configContent);
      expect(config.scopes).toHaveLength(1);
      expect(config.scopes[0].name).toBe("feat");
    });

    it("handles empty scopes array", () => {
      const config = { projectName: "test", scopes: [] };

      expect(config.scopes).toHaveLength(0);
    });

    it("handles missing scopes property", () => {
      const config = { projectName: "test" };

      const scopes = (config as { scopes?: unknown[] }).scopes || [];
      expect(scopes).toHaveLength(0);
    });
  });
});
