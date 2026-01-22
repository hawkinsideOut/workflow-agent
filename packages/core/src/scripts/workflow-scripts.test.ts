import { describe, it, expect } from "vitest";
import {
  WORKFLOW_SCRIPTS,
  WORKFLOW_SCRIPTS_VERSION,
  DEPRECATED_SCRIPTS,
  VALID_COMMANDS,
  SCRIPT_CATEGORIES,
  TOTAL_SCRIPTS,
  validateScriptName,
  validateAllScripts,
} from "./workflow-scripts.js";

describe("workflow-scripts", () => {
  // ============================================
  // WORKFLOW_SCRIPTS
  // ============================================

  describe("WORKFLOW_SCRIPTS", () => {
    it("should only contain the 'workflow' script", () => {
      expect(Object.keys(WORKFLOW_SCRIPTS)).toEqual(["workflow"]);
    });

    it("should map 'workflow' to 'workflow-agent'", () => {
      expect(WORKFLOW_SCRIPTS.workflow).toBe("workflow-agent");
    });

    it("should have TOTAL_SCRIPTS equal to 1", () => {
      expect(TOTAL_SCRIPTS).toBe(1);
    });
  });

  // ============================================
  // WORKFLOW_SCRIPTS_VERSION
  // ============================================

  describe("WORKFLOW_SCRIPTS_VERSION", () => {
    it("should be 2.22.0", () => {
      expect(WORKFLOW_SCRIPTS_VERSION).toBe("2.22.0");
    });
  });

  // ============================================
  // VALID_COMMANDS
  // ============================================

  describe("VALID_COMMANDS", () => {
    it("should contain all expected commands", () => {
      expect(VALID_COMMANDS).toContain("version");
      expect(VALID_COMMANDS).toContain("init");
      expect(VALID_COMMANDS).toContain("validate");
      expect(VALID_COMMANDS).toContain("config");
      expect(VALID_COMMANDS).toContain("suggest");
      expect(VALID_COMMANDS).toContain("setup");
      expect(VALID_COMMANDS).toContain("doctor");
      expect(VALID_COMMANDS).toContain("scope");
      expect(VALID_COMMANDS).toContain("verify");
      expect(VALID_COMMANDS).toContain("pre-commit");
      expect(VALID_COMMANDS).toContain("learn");
      expect(VALID_COMMANDS).toContain("solution");
      expect(VALID_COMMANDS).toContain("sync");
      expect(VALID_COMMANDS).toContain("docs");
    });

    it("should have 14 commands", () => {
      expect(VALID_COMMANDS.length).toBe(14);
    });
  });

  // ============================================
  // DEPRECATED_SCRIPTS
  // ============================================

  describe("DEPRECATED_SCRIPTS", () => {
    it("should contain old colon-style learn commands", () => {
      expect(DEPRECATED_SCRIPTS).toContain("workflow:learn");
      expect(DEPRECATED_SCRIPTS).toContain("workflow:learn:list");
      expect(DEPRECATED_SCRIPTS).toContain("workflow:learn:apply");
    });

    it("should contain old colon-style solution commands", () => {
      expect(DEPRECATED_SCRIPTS).toContain("workflow:solution");
      expect(DEPRECATED_SCRIPTS).toContain("workflow:solution:list");
      expect(DEPRECATED_SCRIPTS).toContain("workflow:solution:apply");
    });

    it("should contain old advisory commands", () => {
      expect(DEPRECATED_SCRIPTS).toContain("workflow:advisory");
      expect(DEPRECATED_SCRIPTS).toContain("workflow:advisory:quick");
    });

    it("should contain v2.21.x dash-style scripts", () => {
      expect(DEPRECATED_SCRIPTS).toContain("workflow:version");
      expect(DEPRECATED_SCRIPTS).toContain("workflow:init");
      expect(DEPRECATED_SCRIPTS).toContain("workflow:validate");
      expect(DEPRECATED_SCRIPTS).toContain("workflow:learn-list");
      expect(DEPRECATED_SCRIPTS).toContain("workflow:solution-list");
      expect(DEPRECATED_SCRIPTS).toContain("workflow:docs-advisory");
    });

    it("should contain old scope commands", () => {
      expect(DEPRECATED_SCRIPTS).toContain("workflow:scope");
      expect(DEPRECATED_SCRIPTS).toContain("workflow:scope-list");
      expect(DEPRECATED_SCRIPTS).toContain("workflow:scope-create");
    });

    it("should contain old verify shortcuts", () => {
      expect(DEPRECATED_SCRIPTS).toContain("verify");
      expect(DEPRECATED_SCRIPTS).toContain("verify:fix");
      expect(DEPRECATED_SCRIPTS).toContain("pre-commit");
    });

    it("should have more than 50 deprecated scripts", () => {
      expect(DEPRECATED_SCRIPTS.length).toBeGreaterThan(50);
    });
  });

  // ============================================
  // validateScriptName
  // ============================================

  describe("validateScriptName", () => {
    it("should return true for 'workflow'", () => {
      expect(validateScriptName("workflow")).toBe(true);
    });

    it("should return false for old colon-style scripts", () => {
      expect(validateScriptName("workflow:init")).toBe(false);
      expect(validateScriptName("workflow:learn")).toBe(false);
      expect(validateScriptName("workflow:solution-list")).toBe(false);
    });

    it("should return false for other script names", () => {
      expect(validateScriptName("test")).toBe(false);
      expect(validateScriptName("build")).toBe(false);
      expect(validateScriptName("workflow-agent")).toBe(false);
    });
  });

  // ============================================
  // validateAllScripts
  // ============================================

  describe("validateAllScripts", () => {
    it("should return empty array for scripts with only 'workflow'", () => {
      const scripts = {
        workflow: "workflow-agent",
        test: "vitest",
        build: "tsc",
      };
      expect(validateAllScripts(scripts)).toEqual([]);
    });

    it("should identify old workflow:* scripts", () => {
      const scripts = {
        workflow: "workflow-agent",
        "workflow:init": "workflow-agent init",
        "workflow:learn": "workflow-agent learn",
        test: "vitest",
      };
      const invalid = validateAllScripts(scripts);
      expect(invalid).toContain("workflow:init");
      expect(invalid).toContain("workflow:learn");
      expect(invalid).not.toContain("workflow");
      expect(invalid).not.toContain("test");
    });

    it("should identify old workflow-* scripts", () => {
      const scripts = {
        workflow: "workflow-agent",
        "workflow-init": "workflow-agent init",
      };
      const invalid = validateAllScripts(scripts);
      expect(invalid).toContain("workflow-init");
    });

    it("should not flag regular 'workflow' script", () => {
      const scripts = {
        workflow: "workflow-agent",
      };
      expect(validateAllScripts(scripts)).toEqual([]);
    });
  });

  // ============================================
  // SCRIPT_CATEGORIES
  // ============================================

  describe("SCRIPT_CATEGORIES", () => {
    it("should have only 'Main' category", () => {
      expect(Object.keys(SCRIPT_CATEGORIES)).toEqual(["Main"]);
    });

    it("should contain only 'workflow' in Main category", () => {
      expect(SCRIPT_CATEGORIES.Main).toEqual(["workflow"]);
    });
  });
});
