/**
 * Unit Tests for setup CLI commands
 * Tests setup and setup auto command logic with mocked dependencies
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies before imports
vi.mock("chalk", () => {
  const identity = (s: string) => s;
  const handler = {
    get(_target: unknown, prop: string): unknown {
      if (prop === "call" || prop === "apply" || prop === "bind") {
        return undefined;
      }
      return new Proxy(identity, handler);
    },
    apply(_target: unknown, _thisArg: unknown, args: unknown[]): string {
      return args[0] as string;
    },
  };
  return {
    default: new Proxy(identity, handler),
  };
});

vi.mock("@clack/prompts", () => ({
  spinner: () => ({
    start: vi.fn(),
    stop: vi.fn(),
  }),
  confirm: vi.fn().mockResolvedValue(true),
  isCancel: vi.fn().mockReturnValue(false),
  outro: vi.fn(),
  cancel: vi.fn(),
}));

// Create a mock report factory
const createMockReport = (overrides = {}) => ({
  analysis: {
    framework: "react",
    packageManager: "pnpm",
    isTypeScript: true,
    isMonorepo: false,
  },
  plans: [],
  totalChanges: 0,
  allDevDependencies: [],
  ...overrides,
});

vi.mock("../../../utils/auto-setup.js", () => ({
  generateAuditReport: vi.fn().mockImplementation(() => Promise.resolve(createMockReport())),
  runAllSetups: vi.fn().mockImplementation(() => Promise.resolve([])),
}));

import { autoSetupCommand } from "../auto-setup-command.js";
import * as p from "@clack/prompts";
import { generateAuditReport, runAllSetups } from "../../../utils/auto-setup.js";

describe("autoSetupCommand - Unit Tests", () => {
  let consoleLogs: string[] = [];
  let consoleErrors: string[] = [];
  let exitCode: number | string | undefined;

  beforeEach(() => {
    consoleLogs = [];
    consoleErrors = [];
    exitCode = undefined;

    // Reset mocks to default implementation
    vi.mocked(generateAuditReport).mockResolvedValue(createMockReport());
    vi.mocked(runAllSetups).mockResolvedValue([]);
    vi.mocked(p.confirm).mockResolvedValue(true);
    vi.mocked(p.isCancel).mockReturnValue(false);

    vi.spyOn(console, "log").mockImplementation((msg) => {
      consoleLogs.push(String(msg));
    });
    vi.spyOn(console, "error").mockImplementation((msg) => {
      consoleErrors.push(String(msg));
    });
    vi.spyOn(process, "exit").mockImplementation((code?: number | string) => {
      exitCode = code;
      throw new Error(`process.exit(${code})`);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================
  // Default behavior
  // ============================================

  describe("default behavior", () => {
    it("calls generateAuditReport", async () => {
      await autoSetupCommand({});

      expect(generateAuditReport).toHaveBeenCalled();
    });

    it("displays audit report", async () => {
      await autoSetupCommand({});

      expect(console.log).toHaveBeenCalled();
      expect(consoleLogs.some((log) => log.includes("Audit Report"))).toBe(true);
    });

    it("shows completion message when no changes needed", async () => {
      await autoSetupCommand({});

      expect(p.outro).toHaveBeenCalledWith(
        expect.stringContaining("already fully configured"),
      );
    });
  });

  // ============================================
  // Audit mode
  // ============================================

  describe("audit mode", () => {
    it("does not run setups in audit mode", async () => {
      await autoSetupCommand({ audit: true });

      expect(runAllSetups).not.toHaveBeenCalled();
    });

    it("shows audit mode message", async () => {
      await autoSetupCommand({ audit: true });

      expect(consoleLogs.some((log) => log.includes("audit"))).toBe(true);
    });
  });

  // ============================================
  // Yes mode
  // ============================================

  describe("yes mode", () => {
    it("skips confirmation prompt with --yes", async () => {
      vi.mocked(generateAuditReport).mockResolvedValueOnce(
        createMockReport({
          totalChanges: 5,
          allDevDependencies: ["eslint"],
        }),
      );
      vi.mocked(runAllSetups).mockResolvedValueOnce([
        { name: "eslint", success: true },
      ]);

      await autoSetupCommand({ yes: true });

      expect(p.confirm).not.toHaveBeenCalled();
      expect(runAllSetups).toHaveBeenCalled();
    });

    it("shows yes mode message", async () => {
      vi.mocked(generateAuditReport).mockResolvedValueOnce(
        createMockReport({
          totalChanges: 1,
          allDevDependencies: [],
        }),
      );
      vi.mocked(runAllSetups).mockResolvedValueOnce([]);

      await autoSetupCommand({ yes: true });

      expect(consoleLogs.some((log) => log.includes("Auto-approving"))).toBe(true);
    });
  });

  // ============================================
  // Confirmation prompt
  // ============================================

  describe("confirmation prompt", () => {
    it("prompts for confirmation when changes are needed", async () => {
      vi.mocked(generateAuditReport).mockResolvedValueOnce(
        createMockReport({
          totalChanges: 3,
          allDevDependencies: ["eslint", "prettier"],
        }),
      );
      vi.mocked(runAllSetups).mockResolvedValueOnce([]);

      await autoSetupCommand({});

      expect(p.confirm).toHaveBeenCalled();
    });

    it("cancels when user declines", async () => {
      vi.mocked(generateAuditReport).mockResolvedValueOnce(
        createMockReport({
          totalChanges: 3,
          allDevDependencies: ["eslint"],
        }),
      );
      vi.mocked(p.confirm).mockResolvedValueOnce(false);

      await expect(autoSetupCommand({})).rejects.toThrow("process.exit(0)");
      expect(p.cancel).toHaveBeenCalledWith("Setup cancelled");
    });

    it("cancels when user presses Ctrl+C", async () => {
      vi.mocked(generateAuditReport).mockResolvedValueOnce(
        createMockReport({
          totalChanges: 3,
          allDevDependencies: ["eslint"],
        }),
      );
      vi.mocked(p.isCancel).mockReturnValueOnce(true);

      await expect(autoSetupCommand({})).rejects.toThrow("process.exit(0)");
    });
  });

  // ============================================
  // runAllSetups execution
  // ============================================

  describe("runAllSetups execution", () => {
    it("runs all setups when confirmed", async () => {
      vi.mocked(generateAuditReport).mockResolvedValueOnce(
        createMockReport({
          totalChanges: 2,
          allDevDependencies: ["eslint"],
        }),
      );
      vi.mocked(p.confirm).mockResolvedValueOnce(true);
      vi.mocked(runAllSetups).mockResolvedValueOnce([
        { name: "eslint", success: true },
        { name: "prettier", success: true },
      ]);

      await autoSetupCommand({});

      expect(runAllSetups).toHaveBeenCalled();
    });

    it("shows success count in summary", async () => {
      vi.mocked(generateAuditReport).mockResolvedValueOnce(
        createMockReport({
          totalChanges: 2,
          allDevDependencies: [],
        }),
      );
      vi.mocked(runAllSetups).mockResolvedValueOnce([
        { name: "eslint", success: true },
        { name: "prettier", success: true },
      ]);

      await autoSetupCommand({ yes: true });

      expect(p.outro).toHaveBeenCalledWith(
        expect.stringContaining("2 configurations applied"),
      );
    });

    it("shows failure count when setups fail", async () => {
      vi.mocked(generateAuditReport).mockResolvedValueOnce(
        createMockReport({
          totalChanges: 2,
          allDevDependencies: [],
        }),
      );
      vi.mocked(runAllSetups).mockResolvedValueOnce([
        { name: "eslint", success: true },
        { name: "prettier", success: false },
      ]);

      await autoSetupCommand({ yes: true });

      expect(p.outro).toHaveBeenCalledWith(
        expect.stringContaining("1 succeeded"),
      );
      expect(p.outro).toHaveBeenCalledWith(expect.stringContaining("1 failed"));
    });
  });

  // ============================================
  // Error handling
  // ============================================

  describe("error handling", () => {
    it("handles generateAuditReport errors", async () => {
      vi.mocked(generateAuditReport).mockRejectedValueOnce(
        new Error("Analysis failed"),
      );

      await expect(autoSetupCommand({})).rejects.toThrow("process.exit(1)");
      expect(consoleErrors.some((err) => err.includes("Analysis failed"))).toBe(true);
    });

    it("shows generic error for non-Error objects", async () => {
      vi.mocked(generateAuditReport).mockRejectedValueOnce("string error");

      await expect(autoSetupCommand({})).rejects.toThrow("process.exit(1)");
      expect(consoleErrors.some((err) => err.includes("string error"))).toBe(true);
    });
  });
});
