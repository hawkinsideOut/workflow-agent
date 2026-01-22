/**
 * Unit Tests for learn commands
 * Tests isolated logic with mocked dependencies using vi.mock()
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTestFixPattern, createTestBlueprint } from "./test-utils.js";

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
    listFixPatterns: vi.fn(),
    listBlueprints: vi.fn(),
    getFixPattern: vi.fn(),
    getBlueprint: vi.fn(),
    saveFixPattern: vi.fn(),
    saveBlueprint: vi.fn(),
  })),
  ContributorManager: vi.fn(),
  PatternAnonymizer: vi.fn(),
  TelemetryCollector: vi.fn(),
  FixPatternSchema: {},
  BlueprintSchema: {},
  SolutionPatternSchema: {},
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
  confirm: vi.fn().mockResolvedValue(true),
  isCancel: vi.fn().mockReturnValue(false),
  cancel: vi.fn(),
}));

// Import modules after mocks are set up
import * as fs from "fs";
import { PatternStore } from "@hawkinside_out/workflow-improvement-tracker";
import {
  learnAnalyzeCommand,
  learnExportCommand,
  learnImportCommand,
  learnCleanCommand,
} from "./learn.js";

describe("learn commands - Unit Tests", () => {
  let mockStore: ReturnType<typeof vi.mocked<InstanceType<typeof PatternStore>>>;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Capture console output
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // Get mocked store instance
    mockStore = vi.mocked(new PatternStore(""));
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

      mockStore.listFixPatterns.mockResolvedValue({ success: true, data: [] });
      mockStore.listBlueprints.mockResolvedValue({ success: true, data: [] });

      await learnAnalyzeCommand({ verbose: false });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Analyzing Codebase"),
      );
    });

    it("does not suggest patterns that already exist", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      mockStore.listFixPatterns.mockResolvedValue({
        success: true,
        data: [createTestFixPattern({ name: "Auth Pattern" })],
      });
      mockStore.listBlueprints.mockResolvedValue({ success: true, data: [] });

      await learnAnalyzeCommand({ verbose: false });

      // Should still run but not suggest auth pattern since one exists
      expect(consoleSpy).toHaveBeenCalled();
    });

    it("shows path information in verbose mode", async () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        return String(p).includes("src/api");
      });

      mockStore.listFixPatterns.mockResolvedValue({ success: true, data: [] });
      mockStore.listBlueprints.mockResolvedValue({ success: true, data: [] });

      await learnAnalyzeCommand({ verbose: true });

      expect(consoleSpy).toHaveBeenCalled();
    });

    it("reports nothing when no opportunities found", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      mockStore.listFixPatterns.mockResolvedValue({ success: true, data: [] });
      mockStore.listBlueprints.mockResolvedValue({ success: true, data: [] });

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

      mockStore.listFixPatterns.mockResolvedValue({
        success: true,
        data: [fix],
      });
      mockStore.listBlueprints.mockResolvedValue({
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

      mockStore.listFixPatterns.mockResolvedValue({
        success: true,
        data: [fix],
      });
      mockStore.listBlueprints.mockResolvedValue({
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

      mockStore.listFixPatterns.mockResolvedValue({
        success: true,
        data: [fix],
      });
      mockStore.listBlueprints.mockResolvedValue({
        success: true,
        data: [blueprint],
      });

      await learnExportCommand({ type: "blueprint", output: "blueprints.json" });

      const writeCall = vi.mocked(fs.promises.writeFile).mock.calls[0];
      const content = JSON.parse(String(writeCall[1]));
      expect(content.fixes).toHaveLength(0);
      expect(content.blueprints).toHaveLength(1);
    });

    it("generates YAML-like output when format is yaml", async () => {
      mockStore.listFixPatterns.mockResolvedValue({
        success: true,
        data: [createTestFixPattern({ name: "YAML Test" })],
      });
      mockStore.listBlueprints.mockResolvedValue({
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
      mockStore.listFixPatterns.mockResolvedValue({ success: true, data: [] });
      mockStore.listBlueprints.mockResolvedValue({ success: true, data: [] });

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
      mockStore.getFixPattern.mockResolvedValue({ success: false });
      mockStore.saveFixPattern.mockResolvedValue({ success: true, data: fix });

      await learnImportCommand("import.json", { merge: true });

      expect(mockStore.saveFixPattern).toHaveBeenCalledWith(fix);
    });

    it("skips existing patterns when merge is false", async () => {
      const fix = createTestFixPattern({ name: "Existing Fix" });
      const importData = { fixes: [fix], blueprints: [] };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue(
        JSON.stringify(importData),
      );
      mockStore.getFixPattern.mockResolvedValue({ success: true, data: fix });

      await learnImportCommand("import.json", { merge: false });

      expect(mockStore.saveFixPattern).not.toHaveBeenCalled();
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
      expect(mockStore.saveFixPattern).not.toHaveBeenCalled();
    });

    it("exits with error when file not found", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const mockExit = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      await learnImportCommand("nonexistent.json", {});

      expect(mockExit).toHaveBeenCalledWith(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("File not found"),
      );

      mockExit.mockRestore();
    });

    it("handles invalid JSON gracefully", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.promises.readFile).mockResolvedValue("invalid json{");

      const mockExit = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      await learnImportCommand("bad.json", {});

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
      mockStore.getBlueprint.mockResolvedValue({ success: false });
      mockStore.saveBlueprint.mockResolvedValue({
        success: true,
        data: blueprint,
      });

      await learnImportCommand("import.json", { merge: true });

      expect(mockStore.saveBlueprint).toHaveBeenCalledWith(blueprint);
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

      mockStore.listFixPatterns.mockResolvedValue({
        success: true,
        data: [deprecatedFix, activeFix],
      });
      mockStore.listBlueprints.mockResolvedValue({ success: true, data: [] });

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

      mockStore.listFixPatterns.mockResolvedValue({
        success: true,
        data: [staleFix, freshFix],
      });
      mockStore.listBlueprints.mockResolvedValue({ success: true, data: [] });

      await learnCleanCommand({ stale: true, dryRun: true });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Stale Fix"),
      );
    });

    it("identifies all patterns with --all", async () => {
      const fix1 = createTestFixPattern({ name: "Fix 1" });
      const fix2 = createTestFixPattern({ name: "Fix 2" });
      const bp1 = createTestBlueprint({ name: "Blueprint 1" });

      mockStore.listFixPatterns.mockResolvedValue({
        success: true,
        data: [fix1, fix2],
      });
      mockStore.listBlueprints.mockResolvedValue({
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

      mockStore.listFixPatterns.mockResolvedValue({
        success: true,
        data: [freshFix],
      });
      mockStore.listBlueprints.mockResolvedValue({ success: true, data: [] });

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

      mockStore.listFixPatterns.mockResolvedValue({
        success: true,
        data: [deprecatedFix],
      });
      mockStore.listBlueprints.mockResolvedValue({ success: true, data: [] });

      await learnCleanCommand({ deprecated: true, dryRun: true });

      expect(fs.promises.unlink).not.toHaveBeenCalled();
    });
  });
});
