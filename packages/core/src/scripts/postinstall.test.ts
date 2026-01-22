import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import {
  isGlobalInstall,
  findProjectRoot,
  removeDeprecatedScripts,
  addWorkflowScript,
} from "./postinstall.js";

describe("postinstall", () => {
  // ============================================
  // isGlobalInstall
  // ============================================

  describe("isGlobalInstall", () => {
    const originalEnv = process.env.npm_config_global;

    afterEach(() => {
      if (originalEnv === undefined) {
        delete process.env.npm_config_global;
      } else {
        process.env.npm_config_global = originalEnv;
      }
    });

    it("should return true when npm_config_global is 'true'", () => {
      process.env.npm_config_global = "true";
      expect(isGlobalInstall()).toBe(true);
    });

    it("should return false when npm_config_global is 'false'", () => {
      process.env.npm_config_global = "false";
      expect(isGlobalInstall()).toBe(false);
    });

    it("should return false when npm_config_global is undefined", () => {
      delete process.env.npm_config_global;
      expect(isGlobalInstall()).toBe(false);
    });
  });

  // ============================================
  // findProjectRoot
  // ============================================

  describe("findProjectRoot", () => {
    const originalCwd = process.cwd;

    afterEach(() => {
      process.cwd = originalCwd;
    });

    it("should return null when not in node_modules", () => {
      process.cwd = () => "/home/user/project";
      expect(findProjectRoot()).toBeNull();
    });

    it("should find project root from node_modules path", () => {
      process.cwd = () => "/home/user/project/node_modules/workflow-agent-cli";
      expect(findProjectRoot()).toBe("/home/user/project");
    });

    it("should handle scoped packages in node_modules", () => {
      process.cwd = () =>
        "/home/user/project/node_modules/@scope/workflow-agent";
      expect(findProjectRoot()).toBe("/home/user/project");
    });

    it("should handle nested node_modules", () => {
      process.cwd = () =>
        "/home/user/project/node_modules/pkg/node_modules/workflow-agent";
      expect(findProjectRoot()).toBe("/home/user/project");
    });
  });

  // ============================================
  // removeDeprecatedScripts
  // ============================================

  describe("removeDeprecatedScripts", () => {
    it("should remove deprecated colon-style scripts", () => {
      const scripts: Record<string, string> = {
        "workflow:init": "workflow-agent init",
        "workflow:learn": "workflow-agent learn",
        test: "vitest",
      };

      const removed = removeDeprecatedScripts(scripts);

      expect(removed).toContain("workflow:init");
      expect(removed).toContain("workflow:learn");
      expect(scripts["workflow:init"]).toBeUndefined();
      expect(scripts["workflow:learn"]).toBeUndefined();
      expect(scripts.test).toBe("vitest");
    });

    it("should remove v2.21.x dash-style scripts", () => {
      const scripts: Record<string, string> = {
        "workflow:version": "workflow-agent --version",
        "workflow:learn-list": "workflow-agent learn list",
        "workflow:solution-apply": "workflow-agent solution apply",
        build: "tsc",
      };

      const removed = removeDeprecatedScripts(scripts);

      expect(removed).toContain("workflow:version");
      expect(removed).toContain("workflow:learn-list");
      expect(removed).toContain("workflow:solution-apply");
      expect(scripts["workflow:version"]).toBeUndefined();
      expect(scripts.build).toBe("tsc");
    });

    it("should remove old verify shortcuts", () => {
      const scripts: Record<string, string> = {
        verify: "workflow-agent verify",
        "verify:fix": "workflow-agent verify --fix",
        "pre-commit": "workflow-agent pre-commit",
      };

      const removed = removeDeprecatedScripts(scripts);

      expect(removed).toContain("verify");
      expect(removed).toContain("verify:fix");
      expect(removed).toContain("pre-commit");
    });

    it("should return empty array when no deprecated scripts", () => {
      const scripts: Record<string, string> = {
        workflow: "workflow-agent",
        test: "vitest",
        build: "tsc",
      };

      const removed = removeDeprecatedScripts(scripts);

      expect(removed).toEqual([]);
      expect(scripts.workflow).toBe("workflow-agent");
    });

    it("should catch any remaining workflow:* scripts not in DEPRECATED_SCRIPTS", () => {
      const scripts: Record<string, string> = {
        "workflow:custom-script": "custom command",
        "workflow:another": "another command",
      };

      const removed = removeDeprecatedScripts(scripts);

      expect(removed).toContain("workflow:custom-script");
      expect(removed).toContain("workflow:another");
      expect(scripts["workflow:custom-script"]).toBeUndefined();
    });
  });

  // ============================================
  // addWorkflowScript
  // ============================================

  describe("addWorkflowScript", () => {
    it("should add workflow script when not present", () => {
      const scripts: Record<string, string> = {
        test: "vitest",
      };

      const result = addWorkflowScript(scripts);

      expect(result.added).toBe(true);
      expect(result.updated).toBe(false);
      expect(scripts.workflow).toBe("workflow-agent");
    });

    it("should update workflow script when different value", () => {
      const scripts: Record<string, string> = {
        workflow: "old-command",
      };

      const result = addWorkflowScript(scripts);

      expect(result.added).toBe(false);
      expect(result.updated).toBe(true);
      expect(scripts.workflow).toBe("workflow-agent");
    });

    it("should return no changes when script already correct", () => {
      const scripts: Record<string, string> = {
        workflow: "workflow-agent",
      };

      const result = addWorkflowScript(scripts);

      expect(result.added).toBe(false);
      expect(result.updated).toBe(false);
      expect(scripts.workflow).toBe("workflow-agent");
    });
  });

  // ============================================
  // Integration: Full postinstall flow
  // ============================================

  describe("integration: postinstall flow", () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await mkdtemp(join(tmpdir(), "postinstall-test-"));
    });

    afterEach(async () => {
      await rm(tempDir, { recursive: true, force: true });
    });

    it("should clean up old scripts and add workflow script", async () => {
      const packageJson = {
        name: "test-project",
        version: "1.0.0",
        scripts: {
          "workflow:init": "workflow-agent init",
          "workflow:learn-list": "workflow-agent learn list",
          "workflow:solution-apply": "workflow-agent solution apply",
          test: "vitest",
          build: "tsc",
        },
      };

      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify(packageJson, null, 2)
      );

      // Simulate the postinstall logic
      const scripts = { ...packageJson.scripts };
      const removed = removeDeprecatedScripts(scripts);
      const { added } = addWorkflowScript(scripts);

      expect(removed.length).toBe(3);
      expect(added).toBe(true);
      expect(scripts.workflow).toBe("workflow-agent");
      expect(scripts["workflow:init"]).toBeUndefined();
      expect(scripts["workflow:learn-list"]).toBeUndefined();
      expect(scripts.test).toBe("vitest");
    });

    it("should handle package.json with no scripts", async () => {
      const packageJson = {
        name: "test-project",
        version: "1.0.0",
      };

      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify(packageJson, null, 2)
      );

      const scripts: Record<string, string> = {};
      const removed = removeDeprecatedScripts(scripts);
      const { added } = addWorkflowScript(scripts);

      expect(removed).toEqual([]);
      expect(added).toBe(true);
      expect(scripts.workflow).toBe("workflow-agent");
    });

    it("should preserve non-workflow scripts", async () => {
      const scripts: Record<string, string> = {
        test: "vitest run",
        build: "tsc",
        lint: "eslint .",
        "workflow:init": "old command",
      };

      removeDeprecatedScripts(scripts);
      addWorkflowScript(scripts);

      expect(scripts.test).toBe("vitest run");
      expect(scripts.build).toBe("tsc");
      expect(scripts.lint).toBe("eslint .");
      expect(scripts.workflow).toBe("workflow-agent");
      expect(scripts["workflow:init"]).toBeUndefined();
    });
  });
});
