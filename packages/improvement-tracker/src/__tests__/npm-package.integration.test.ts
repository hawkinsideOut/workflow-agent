import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { tmpdir } from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.join(__dirname, "../..");

describe("NPM Package Integration", () => {
  let tempDir: string;
  let tarballPath: string;

  beforeAll(() => {
    // Create temp directory
    tempDir = fs.mkdtempSync(path.join(tmpdir(), "workflow-test-"));

    // Pack the package
    console.log("📦 Packing package...");
    const packOutput = execSync("npm pack", {
      cwd: packageRoot,
      encoding: "utf-8",
    });

    // Extract the tarball filename (last line that ends with .tgz)
    const lines = packOutput.trim().split("\n");
    const tgzFile = lines.find((line) => line.endsWith(".tgz")) || lines.pop()!;
    tarballPath = path.join(packageRoot, tgzFile.trim());

    // Extract tarball
    console.log("📂 Extracting to temp dir...");
    execSync(`tar -xzf "${tarballPath}" -C "${tempDir}"`, {
      encoding: "utf-8",
    });
  });

  afterAll(() => {
    // Cleanup
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    if (tarballPath && fs.existsSync(tarballPath)) {
      fs.unlinkSync(tarballPath);
    }
  });

  it("should have all exports available in packed tarball", async () => {
    const packagePath = path.join(tempDir, "package");
    const distIndexPath = path.join(packagePath, "dist", "index.js");

    expect(fs.existsSync(distIndexPath)).toBe(true);

    // Dynamic import from the packed tarball
    const packageUrl = `file://${distIndexPath}`;
    const pkg = await import(packageUrl);

    // List of ALL exports that must be present
    const requiredExports = [
      // Core tracking system
      "ImprovementTracker",
      "createTracker",
      "Moderator",
      "FileSystemStore", // SuggestionStore is an interface, not exported at runtime
      "TrustScoreManager",

      // Schemas
      "SuggestionSchema",
      "TrustScoreSchema",
      "ModerationRuleSchema",
      "FixPatternSchema",
      "BlueprintSchema",
      "SolutionPatternSchema",

      // Agent Learning - Pattern Store
      "PatternStore",
      "createPatternStore",

      // Agent Learning - Contributor
      "ContributorManager",
      "createContributorManager",

      // Agent Learning - Anonymizer
      "PatternAnonymizer",
      "createAnonymizer",
      "anonymizeFixPattern",
      "anonymizeBlueprint",
      "DEFAULT_ANONYMIZATION_OPTIONS",

      // Agent Learning - Telemetry
      "TelemetryCollector",
      "createTelemetryCollector",
      "createMockSender",

      // Agent Learning - Code Analyzer
      "CodeAnalyzer",
      "createCodeAnalyzer",
      "DEFAULT_ANALYZER_OPTIONS",

      // Constants
      "DEPRECATION_THRESHOLD_DAYS",
      "PATTERNS_DIR",
      "CONTRIBUTOR_ID_FILE",
      "TELEMETRY_BATCH_SIZE",

      // Utility functions
      "isPatternDeprecated",
      "generatePatternHash",
      "createDefaultMetrics",
      "updateMetrics",

      // Enums
      "FixCategoryEnum",
      "SolutionTypeEnum",
      "StepActionEnum",
      "PatternSourceEnum",
      "LanguageEnum",
      "PackageManagerEnum",
      "TelemetryEventTypeEnum",
      "PatternTypeEnum",
      "SolutionCategoryEnum",
      "FileRoleEnum",
    ];

    const missing: string[] = [];
    const found: string[] = [];

    for (const exportName of requiredExports) {
      if (exportName in pkg && pkg[exportName] !== undefined) {
        found.push(exportName);
      } else {
        missing.push(exportName);
      }
    }

    if (missing.length > 0) {
      console.error("\n❌ Missing exports in packed tarball:");
      missing.forEach((name) => console.error(`  - ${name}`));
      console.error(
        `\n📊 Coverage: ${found.length}/${requiredExports.length} (${Math.round((found.length / requiredExports.length) * 100)}%)`,
      );
    }

    // Require 100% coverage
    expect(missing).toEqual([]);
    expect(found.length).toBe(requiredExports.length);
  });

  it("should have valid package.json in tarball", () => {
    const packagePath = path.join(tempDir, "package");
    const packageJsonPath = path.join(packagePath, "package.json");

    expect(fs.existsSync(packageJsonPath)).toBe(true);

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

    expect(packageJson.name).toBe(
      "@hawkinside_out/workflow-improvement-tracker",
    );
    expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(packageJson.main).toBe("./dist/index.js");
    expect(packageJson.types).toBe("./dist/index.d.ts");
  });
});
