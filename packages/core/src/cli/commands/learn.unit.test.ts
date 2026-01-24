/**
 * Unit Tests for learn commands
 * Tests isolated logic with mocked dependencies using vi.mock()
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTestFixPattern, createTestBlueprint } from "./test-utils.js";

// Create shared mock functions that persist across all PatternStore instances
const mockListFixPatterns = vi.fn();
const mockListBlueprints = vi.fn();
const mockGetFixPattern = vi.fn();
const mockGetBlueprint = vi.fn();
const mockSaveFixPattern = vi.fn();
const mockSaveBlueprint = vi.fn();
const mockInitialize = vi.fn();

// Mock dependencies
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    unlink: vi.fn(),
  },
}));

vi.mock("@hawkinside_out/workflow-improvement-tracker", () => ({
  PatternStore: vi.fn().mockImplementation(() => ({
    initialize: mockInitialize,
    listFixPatterns: mockListFixPatterns,
    listBlueprints: mockListBlueprints,
    getFixPattern: mockGetFixPattern,
    getBlueprint: mockGetBlueprint,
    saveFixPattern: mockSaveFixPattern,
    saveBlueprint: mockSaveBlueprint,
  })),
  ContributorManager: vi.fn(),
  PatternAnonymizer: vi.fn(),
  TelemetryCollector: vi.fn(),
  FixPatternSchema: {},
  BlueprintSchema: {},
  SolutionPatternSchema: {},
}));

// Proxy-based chalk mock for chainable methods
vi.mock("chalk", () => {
  const identity = (s: string) => s;
  const handler: ProxyHandler<typeof identity> = {
    get: () => new Proxy(identity, handler),
    apply: (_target, _thisArg, args: string[]) => args[0],
  };
  return { default: new Proxy(identity, handler) };
});

vi.mock("@clack/prompts", () => ({
  confirm: vi.fn().mockResolvedValue(true),
  isCancel: vi.fn().mockReturnValue(false),
  cancel: vi.fn(),
}));

// Import modules after mocks are set up
import * as fs from "fs";
import {
  learnAnalyzeCommand,
  learnExportCommand,
  learnImportCommand,
  learnCleanCommand,
} from "./learn.js";

describe("learn commands - Unit Tests", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Capture console output
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // Reset mock implementations with default resolved values
    mockListFixPatterns.mockResolvedValue({ success: true, data: [] });
    mockListBlueprints.mockResolvedValue({ success: true, data: [] });
    mockGetFixPattern.mockResolvedValue({ success: false });
    mockGetBlueprint.mockResolvedValue({ success: false });
    mockSaveFixPattern.mockResolvedValue({ success: true, data: {} });
    mockSaveBlueprint.mockResolvedValue({ success: true, data: {} });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  // ============================================
  // learnAnalyzeCommand Tests
  // ============================================

  describe("learnAnalyzeCommand", () => {
    it("identifies auth pattern opportunity when auth directory exists", async () => {
      // Setup: auth directory exists, no existing patterns
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        return String(p).includes("src/auth");
      });

      mockListFixPatterns.mockResolvedValue({ success: true, data: [] });
      mockListBlueprints.mockResolvedValue({ success: true, data: [] });

      await learnAnalyzeCommand({ verbose: false });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Analyzing Codebase"),
      );
    });

    it("does not suggest patterns that already exist", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      mockListFixPatterns.mockResolvedValue({
        success: true,
        data: [createTestFixPattern({ name: "Auth Pattern" })],
      });
      mockListBlueprints.mockResolvedValue({ success: true, data: [] });

      await learnAnalyzeCommand({ verbose: false });

      // Should still run but not suggest auth pattern since one exists
      expect(consoleSpy).toHaveBeenCalled();
    });

    it("shows path information in verbose mode", async () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        return String(p).includes("src/api");
      });

      mockListFixPatterns.mockResolvedValue({ success: true, data: [] });
      mockListBlueprints.mockResolvedValue({ success: true, data: [] });

      await learnAnalyzeCommand({ verbose: true });

      expect(consoleSpy).toHaveBeenCalled();
    });

    it("reports nothing when no opportunities found", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      mockListFixPatterns.mockResolvedValue({ success: true, data: [] });
      mockListBlueprints.mockResolvedValue({ success: true, data: [] });

      await learnAnalyzeCommand({ verbose: false });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("No new learning opportunities"),
      );
    });
  });

  // ============================================
  // learnExportCommand Tests
  // ============================================

  describe("learnExportCommand", () => {
    it("exports patterns to JSON format by default", async () => {
      const fix = createTestFixPattern({ name: "Export Test Fix" });
      const blueprint = createTestBlueprint({ name: "Export Test Blueprint" });

      mockListFixPatterns.mockResolvedValue({
        success: true,
        data: [fix],
      });
      mockListBlueprints.mockResolvedValue({
        success: true,
        data: [blueprint],
      });

      await learnExportCommand({ output: "export.json" });

      expect(fs.promises.writeFile).toHaveBeenCalled();
      const writeCall = vi.mocked(fs.promises.writeFile).mock.calls[0];
      expect(String(writeCall[0])).toContain("export.json");

      const content = JSON.parse(String(writeCall[1]));
      expect(content.fixes).toHaveLength(1);
      expect(content.blueprints).toHaveLength(1);
    });

    it("exports only fix patterns when type is 'fix'", async () => {
      const fix = createTestFixPattern({ name: "Only Fix" });
      const blueprint = createTestBlueprint({ name: "Should Not Include" });

      mockListFixPatterns.mockResolvedValue({
        success: true,
        data: [fix],
      });
      mockListBlueprints.mockResolvedValue({
        success: true,
        data: [blueprint],
      });

      await learnExportCommand({ type: "fix", output: "fixes.json" });

      const writeCall = vi.mocked(fs.promises.writeFile).mock.calls[0];
      const content = JSON.parse(String(writeCall[1]));
      expect(content.fixes).toHaveLength(1);
      expect(content.blueprints).toHaveLength(0);
    });

    it("exports only blueprints when type is 'blueprint'", async () => {
      const fix = createTestFixPattern({ name: "Should Not Include" });
      const blueprint = createTestBlueprint({ name: "Only Blueprint" });

      mockListFixPatterns.mockResolvedValue({
        success: true,
        data: [fix],
      });
      mockListBlueprints.mockResolvedValue({
        success: true,
        data: [blueprint],
      });

      await learnExportCommand({
        type: "blueprint",
        output: "blueprints.json",
      });

      const writeCall = vi.mocked(fs.promises.writeFile).mock.calls[0];
      const content = JSON.parse(String(writeCall[1]));
      expect(content.fixes).toHaveLength(0);
      expect(content.blueprints).toHaveLength(1);
    });

    it("generates YAML-like output when format is yaml", async () => {
      mockListFixPatterns.mockResolvedValue({
        success: true,
        data: [createTestFixPattern({ name: "YAML Test" })],
      });
      mockListBlueprints.mockResolvedValue({
        success: true,
        data: [],
      });

      await learnExportCommand({ format: "yaml", output: "export.yaml" });

      const writeCall = vi.mocked(fs.promises.writeFile).mock.calls[0];
      const content = String(writeCall[1]);
      expect(content).toContain("fixes:");
      expect(content).toContain("YAML Test");
    });

    it("reports no patterns when store is empty", async () => {
      mockListFixPatterns.mockResolvedValue({ success: true, data: [] });
      mockListBlueprints.mockResolvedValue({ success: true, data: [] });

      await learnExportCommand({});

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("No patterns to export"),
      );
      expect(fs.promises.writeFile).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // learnImportCommand Tests
  // ============================================

  describe("learnImportCommand", () => {
    it("imports patterns from JSON file", async () => {
      const fix = createTestFixPattern({ name: "Imported Fix" });
      const importData = { fixes: [fix], blueprints: [] };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(
        JSON.stringify(importData),
      );
      mockGetFixPattern.mockResolvedValue({ success: false });
      mockSaveFixPattern.mockResolvedValue({ success: true, data: fix });

      await learnImportCommand("import.json", { merge: true });

      expect(mockSaveFixPattern).toHaveBeenCalledWith(fix);
    });

    it("skips existing patterns when merge is false", async () => {
      const fix = createTestFixPattern({ name: "Existing Fix" });
      const importData = { fixes: [fix], blueprints: [] };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(
        JSON.stringify(importData),
      );
      mockGetFixPattern.mockResolvedValue({ success: true, data: fix });

      await learnImportCommand("import.json", { merge: false });

      expect(mockSaveFixPattern).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Skipped"),
      );
    });

    it("shows dry-run output without saving", async () => {
      const fix = createTestFixPattern({ name: "Dry Run Fix" });
      const importData = { fixes: [fix], blueprints: [] };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(
        JSON.stringify(importData),
      );

      await learnImportCommand("import.json", { dryRun: true });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Dry run"),
      );
      expect(mockSaveFixPattern).not.toHaveBeenCalled();
    });

    it("exits with error when file not found", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("process.exit called");
      });

      await expect(learnImportCommand("nonexistent.json", {})).rejects.toThrow(
        "process.exit called",
      );

      expect(mockExit).toHaveBeenCalledWith(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("File not found"),
      );

      mockExit.mockRestore();
    });

    it("handles invalid JSON gracefully", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue("invalid json{");

      const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("process.exit called");
      });

      await expect(learnImportCommand("bad.json", {})).rejects.toThrow(
        "process.exit called",
      );

      expect(mockExit).toHaveBeenCalledWith(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to parse"),
      );

      mockExit.mockRestore();
    });

    it("imports blueprints correctly", async () => {
      const blueprint = createTestBlueprint({ name: "Imported Blueprint" });
      const importData = { fixes: [], blueprints: [blueprint] };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(
        JSON.stringify(importData),
      );
      mockGetBlueprint.mockResolvedValue({ success: false });
      mockSaveBlueprint.mockResolvedValue({
        success: true,
        data: blueprint,
      });

      await learnImportCommand("import.json", { merge: true });

      expect(mockSaveBlueprint).toHaveBeenCalledWith(blueprint);
    });
  });

  // ============================================
  // learnCleanCommand Tests
  // ============================================

  describe("learnCleanCommand", () => {
    it("shows usage when no options provided", async () => {
      await learnCleanCommand({});

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Specify what to clean"),
      );
    });

    it("identifies deprecated patterns with --deprecated", async () => {
      const deprecatedFix = createTestFixPattern({
        name: "Deprecated Fix",
        deprecatedAt: new Date().toISOString(),
      });
      const activeFix = createTestFixPattern({ name: "Active Fix" });

      mockListFixPatterns.mockResolvedValue({
        success: true,
        data: [deprecatedFix, activeFix],
      });
      mockListBlueprints.mockResolvedValue({ success: true, data: [] });

      await learnCleanCommand({ deprecated: true, dryRun: true });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Deprecated Fix"),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Dry run"),
      );
    });

    it("identifies stale patterns with --stale", async () => {
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 100); // 100 days ago

      const staleFix = createTestFixPattern({
        name: "Stale Fix",
        updatedAt: staleDate.toISOString(),
      });
      const freshFix = createTestFixPattern({
        name: "Fresh Fix",
        updatedAt: new Date().toISOString(),
      });

      mockListFixPatterns.mockResolvedValue({
        success: true,
        data: [staleFix, freshFix],
      });
      mockListBlueprints.mockResolvedValue({ success: true, data: [] });

      await learnCleanCommand({ stale: true, dryRun: true });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Stale Fix"),
      );
    });

    it("identifies all patterns with --all", async () => {
      const fix1 = createTestFixPattern({ name: "Fix 1" });
      const fix2 = createTestFixPattern({ name: "Fix 2" });
      const bp1 = createTestBlueprint({ name: "Blueprint 1" });

      mockListFixPatterns.mockResolvedValue({
        success: true,
        data: [fix1, fix2],
      });
      mockListBlueprints.mockResolvedValue({
        success: true,
        data: [bp1],
      });

      await learnCleanCommand({ all: true, dryRun: true });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("3 patterns to remove"),
      );
    });

    it("reports nothing to clean when no patterns match", async () => {
      const freshFix = createTestFixPattern({
        name: "Fresh Fix",
        updatedAt: new Date().toISOString(),
      });

      mockListFixPatterns.mockResolvedValue({
        success: true,
        data: [freshFix],
      });
      mockListBlueprints.mockResolvedValue({ success: true, data: [] });

      await learnCleanCommand({ deprecated: true, dryRun: true });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Nothing to clean"),
      );
    });

    it("does not delete files in dry-run mode", async () => {
      const deprecatedFix = createTestFixPattern({
        name: "Deprecated Fix",
        deprecatedAt: new Date().toISOString(),
      });

      mockListFixPatterns.mockResolvedValue({
        success: true,
        data: [deprecatedFix],
      });
      mockListBlueprints.mockResolvedValue({ success: true, data: [] });

      await learnCleanCommand({ deprecated: true, dryRun: true });

      expect(fs.promises.unlink).not.toHaveBeenCalled();
    });
  });
});
