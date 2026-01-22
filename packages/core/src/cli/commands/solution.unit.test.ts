/**
 * Unit Tests for solution commands
 * Tests isolated logic with mocked dependencies using vi.mock()
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTestSolutionPattern } from "./test-utils.js";

// Mock dependencies
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
}));

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
}));

vi.mock("@hawkinside_out/workflow-improvement-tracker", () => ({
  PatternStore: vi.fn().mockImplementation(() => ({
    listSolutions: vi.fn(),
    getSolution: vi.fn(),
    saveSolution: vi.fn(),
    deleteSolution: vi.fn(),
    searchSolutions: vi.fn(),
  })),
}));

vi.mock("chalk", () => ({
  default: {
    cyan: (s: string) => s,
    green: (s: string) => s,
    red: (s: string) => s,
    yellow: (s: string) => s,
    bold: (s: string) => s,
    dim: (s: string) => s,
  },
}));

vi.mock("@clack/prompts", () => ({
  text: vi.fn().mockResolvedValue("Test Input"),
  select: vi.fn().mockResolvedValue("auth"),
  confirm: vi.fn().mockResolvedValue(true),
  isCancel: vi.fn().mockReturnValue(false),
  cancel: vi.fn(),
}));

// Import modules after mocks are set up
import * as fs from "fs";
import * as nodeFs from "node:fs";
import { PatternStore } from "@hawkinside_out/workflow-improvement-tracker";
import {
  solutionShowCommand,
  solutionExportCommand,
  solutionImportCommand,
  solutionAnalyzeCommand,
} from "./solution.js";

describe("solution commands - Unit Tests", () => {
  let mockStore: ReturnType<typeof vi.mocked<InstanceType<typeof PatternStore>>>;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();

    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockStore = vi.mocked(new PatternStore(""));
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  // ============================================
  // solutionShowCommand Tests
  // ============================================

  describe("solutionShowCommand", () => {
    it("displays solution details when found", async () => {
      const solution = createTestSolutionPattern({ name: "Show Test Solution" });
      mockStore.getSolution.mockResolvedValue({ success: true, data: solution });

      await solutionShowCommand(solution.id);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Solution Details"),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Show Test Solution"),
      );
    });

    it("shows compatibility information", async () => {
      const solution = createTestSolutionPattern({
        name: "Compat Test",
        compatibility: {
          framework: "next",
          frameworkVersion: ">=14.0.0",
          runtime: "node",
          runtimeVersion: ">=18.0.0",
          dependencies: [],
        },
      });
      mockStore.getSolution.mockResolvedValue({ success: true, data: solution });

      await solutionShowCommand(solution.id);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Compatibility"),
      );
    });

    it("exits with error when solution not found", async () => {
      mockStore.getSolution.mockResolvedValue({ success: false });

      const mockExit = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      await solutionShowCommand("nonexistent-id");

      expect(mockExit).toHaveBeenCalledWith(1);
      mockExit.mockRestore();
    });

    it("shows implementation details", async () => {
      const solution = createTestSolutionPattern({
        name: "Impl Test",
        implementation: {
          files: [
            {
              path: "src/auth/login.ts",
              purpose: "Login handler",
              role: "service" as const,
              content: "export const login = () => {};",
              exports: ["login"],
              imports: [],
              lineCount: 1,
            },
          ],
          dependencies: [{ name: "jsonwebtoken", version: "^9.0.0", compatibleRange: ">=9.0.0" }],
          devDependencies: [],
          envVars: [{ name: "JWT_SECRET", required: true, description: "JWT secret" }],
        },
      });
      mockStore.getSolution.mockResolvedValue({ success: true, data: solution });

      await solutionShowCommand(solution.id);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Implementation"),
      );
    });

    it("shows deprecation info when deprecated", async () => {
      const solution = createTestSolutionPattern({
        name: "Deprecated Solution",
        deprecatedAt: new Date().toISOString(),
        deprecationReason: "Superseded by v2",
      });
      mockStore.getSolution.mockResolvedValue({ success: true, data: solution });

      await solutionShowCommand(solution.id);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Deprecated"),
      );
    });
  });

  // ============================================
  // solutionExportCommand Tests
  // ============================================

  describe("solutionExportCommand", () => {
    it("exports solutions to JSON format", async () => {
      const solution = createTestSolutionPattern({ name: "Export Test" });
      mockStore.listSolutions.mockResolvedValue({
        success: true,
        data: [solution],
      });

      await solutionExportCommand({ output: "solutions.json" });

      expect(nodeFs.promises.writeFile).toHaveBeenCalled();
      const writeCall = vi.mocked(nodeFs.promises.writeFile).mock.calls[0];
      expect(String(writeCall[0])).toContain("solutions.json");

      const content = JSON.parse(String(writeCall[1]));
      expect(content.solutions).toHaveLength(1);
    });

    it("exports to YAML format when specified", async () => {
      const solution = createTestSolutionPattern({ name: "YAML Test" });
      mockStore.listSolutions.mockResolvedValue({
        success: true,
        data: [solution],
      });

      await solutionExportCommand({ format: "yaml", output: "solutions.yaml" });

      const writeCall = vi.mocked(nodeFs.promises.writeFile).mock.calls[0];
      const content = String(writeCall[1]);
      expect(content).toContain("solutions:");
      expect(content).toContain("YAML Test");
    });

    it("filters by category when specified", async () => {
      mockStore.listSolutions.mockResolvedValue({
        success: true,
        data: [],
      });

      await solutionExportCommand({ category: "auth" });

      expect(mockStore.listSolutions).toHaveBeenCalledWith(
        expect.objectContaining({ category: "auth" }),
      );
    });

    it("reports no solutions when store is empty", async () => {
      mockStore.listSolutions.mockResolvedValue({ success: true, data: [] });

      await solutionExportCommand({});

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("No solutions to export"),
      );
      expect(nodeFs.promises.writeFile).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // solutionImportCommand Tests
  // ============================================

  describe("solutionImportCommand", () => {
    it("imports solutions from JSON file", async () => {
      const solution = createTestSolutionPattern({ name: "Imported Solution" });
      const importData = { solutions: [solution] };

      vi.mocked(nodeFs.existsSync).mockReturnValue(true);
      vi.mocked(nodeFs.promises.readFile).mockResolvedValue(
        JSON.stringify(importData),
      );
      mockStore.getSolution.mockResolvedValue({ success: false });
      mockStore.saveSolution.mockResolvedValue({ success: true, data: solution });

      await solutionImportCommand("import.json", { merge: true });

      expect(mockStore.saveSolution).toHaveBeenCalledWith(solution);
    });

    it("skips existing solutions when merge is false", async () => {
      const solution = createTestSolutionPattern({ name: "Existing Solution" });
      const importData = { solutions: [solution] };

      vi.mocked(nodeFs.existsSync).mockReturnValue(true);
      vi.mocked(nodeFs.promises.readFile).mockResolvedValue(
        JSON.stringify(importData),
      );
      mockStore.getSolution.mockResolvedValue({ success: true, data: solution });

      await solutionImportCommand("import.json", { merge: false });

      expect(mockStore.saveSolution).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Skipped"),
      );
    });

    it("shows dry-run output without saving", async () => {
      const solution = createTestSolutionPattern({ name: "Dry Run Solution" });
      const importData = { solutions: [solution] };

      vi.mocked(nodeFs.existsSync).mockReturnValue(true);
      vi.mocked(nodeFs.promises.readFile).mockResolvedValue(
        JSON.stringify(importData),
      );

      await solutionImportCommand("import.json", { dryRun: true });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Dry run"),
      );
      expect(mockStore.saveSolution).not.toHaveBeenCalled();
    });

    it("exits with error when file not found", async () => {
      vi.mocked(nodeFs.existsSync).mockReturnValue(false);

      const mockExit = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      await solutionImportCommand("nonexistent.json", {});

      expect(mockExit).toHaveBeenCalledWith(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("File not found"),
      );

      mockExit.mockRestore();
    });

    it("handles invalid JSON gracefully", async () => {
      vi.mocked(nodeFs.existsSync).mockReturnValue(true);
      vi.mocked(nodeFs.promises.readFile).mockResolvedValue("invalid json{");

      const mockExit = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      await solutionImportCommand("bad.json", {});

      expect(mockExit).toHaveBeenCalledWith(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to parse"),
      );

      mockExit.mockRestore();
    });
  });

  // ============================================
  // solutionAnalyzeCommand Tests
  // ============================================

  describe("solutionAnalyzeCommand", () => {
    it("identifies auth directory as opportunity", async () => {
      vi.mocked(nodeFs.existsSync).mockImplementation((p) => {
        return String(p).includes("src/auth");
      });

      mockStore.listSolutions.mockResolvedValue({ success: true, data: [] });

      await solutionAnalyzeCommand();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Analyzing"),
      );
    });

    it("does not suggest already captured solutions", async () => {
      vi.mocked(nodeFs.existsSync).mockReturnValue(true);

      mockStore.listSolutions.mockResolvedValue({
        success: true,
        data: [createTestSolutionPattern({ name: "Authentication Module" })],
      });

      await solutionAnalyzeCommand();

      expect(consoleSpy).toHaveBeenCalled();
    });

    it("reports nothing when no opportunities found", async () => {
      vi.mocked(nodeFs.existsSync).mockReturnValue(false);
      mockStore.listSolutions.mockResolvedValue({ success: true, data: [] });

      await solutionAnalyzeCommand();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("No new solution opportunities"),
      );
    });

    it("detects multiple directory patterns", async () => {
      vi.mocked(nodeFs.existsSync).mockImplementation((p) => {
        const path = String(p);
        return path.includes("src/auth") || path.includes("src/api");
      });

      mockStore.listSolutions.mockResolvedValue({ success: true, data: [] });

      await solutionAnalyzeCommand();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("potential solutions"),
      );
    });
  });
});
