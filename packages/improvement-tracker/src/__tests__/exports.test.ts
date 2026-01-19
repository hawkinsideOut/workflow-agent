import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Package Exports Validation", () => {
  it("should export all symbols declared in index.ts", async () => {
    // Read the index.ts source file
    const indexPath = path.join(__dirname, "../index.ts");
    const indexContent = fs.readFileSync(indexPath, "utf-8");

    // Extract all export names using regex
    const exportMatches = [
      ...indexContent.matchAll(/export\s+{\s*([^}]+)\s*}/g),
      ...indexContent.matchAll(/export\s+\*\s+from/g),
    ];

    const exportedNames = new Set<string>();

    for (const match of exportMatches) {
      if (match[1]) {
        // Parse the export list
        const names = match[1]
          .split(",")
          .map((n) => n.trim())
          .filter((n) => {
            // Filter out comments, empty lines, and type-only exports
            if (!n) return false;
            if (n.startsWith("//")) return false;
            if (n.startsWith("type ")) return false;
            return true;
          })
          .map((n) => n.replace(/\s+as\s+.+$/, "").trim());
        names.forEach((n) => exportedNames.add(n));
      }
    }

    // Import the built package
    const builtPackage = await import("../index.js");

    // Validate 100% of exports are available
    const missing: string[] = [];
    const found: string[] = [];

    for (const name of exportedNames) {
      if (name in builtPackage) {
        found.push(name);
      } else {
        missing.push(name);
      }
    }

    // Report results
    if (missing.length > 0) {
      console.error("\n❌ Missing exports in built package:");
      missing.forEach((name) => console.error(`  - ${name}`));
      console.error(
        `\n📊 Coverage: ${found.length}/${exportedNames.size} (${Math.round((found.length / exportedNames.size) * 100)}%)`,
      );
    }

    expect(missing).toEqual([]);
    expect(found.length).toBe(exportedNames.size);
  });

  it("should have all critical exports available", async () => {
    const pkg = await import("../index.js");

    const criticalExports = [
      "CodeAnalyzer",
      "PatternStore",
      "ContributorManager",
      "TelemetryCollector",
      "PatternAnonymizer",
      "ImprovementTracker",
      "Moderator",
      "FixPatternSchema",
      "BlueprintSchema",
      "SolutionPatternSchema",
    ];

    for (const exportName of criticalExports) {
      expect(pkg[exportName]).toBeDefined();
      expect(typeof pkg[exportName]).not.toBe("undefined");
    }
  });
});
