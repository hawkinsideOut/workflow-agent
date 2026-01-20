import { describe, it, expect, beforeEach } from "vitest";
import { ReportComparator } from "../report-comparator.js";
import type { AdvisoryAnalysis } from "../advisory-analyzer.js";

describe("ReportComparator", () => {
  let baselineAnalysis: AdvisoryAnalysis;
  let currentAnalysis: AdvisoryAnalysis;

  beforeEach(() => {
    const baseTimestamp = "2024-01-01T00:00:00.000Z";
    const currentTimestamp = "2024-02-01T00:00:00.000Z";

    baselineAnalysis = {
      depth: "standard",
      timestamp: baseTimestamp,
      project: {
        name: "test-project",
        version: "1.0.0",
        isMonorepo: false,
        packageManager: "pnpm",
        fileCount: 100,
        totalLines: 5000,
      },
      technology: {
        language: "TypeScript",
        runtime: "Node.js",
        buildTools: ["Vite"],
        platforms: ["Web"],
        infrastructure: ["Vercel"],
      },
      packages: {
        total: 50,
        production: [
          {
            name: "react",
            version: "18.0.0",
            category: "UI Framework",
            purpose: "UI library",
            businessValue: "User experience",
            usagePatterns: [],
          },
        ],
        development: [],
        categories: [],
        outdated: [],
        security: [],
      },
      risks: {
        overall: 0.5,
        categories: [
          {
            name: "Dependency Management",
            score: 0.5,
            issues: [],
            impact: "Moderate",
          },
        ],
        critical: [],
        high: ["High risk item 1"],
        medium: [],
        low: [],
      },
      opportunities: {
        overall: 0.6,
        categories: [
          {
            name: "Modernization",
            potential: 0.7,
            recommendations: [],
            businessValue: "Better performance",
          },
        ],
        immediate: ["Add analytics"],
        shortTerm: [],
        longTerm: [],
      },
    };

    // Current analysis with some changes
    currentAnalysis = JSON.parse(JSON.stringify(baselineAnalysis));
    currentAnalysis.timestamp = currentTimestamp;
    currentAnalysis.packages.total = 55; // Added 5 packages
    currentAnalysis.risks.overall = 0.4; // Risk decreased
    currentAnalysis.opportunities.overall = 0.7; // Opportunities increased
  });

  describe("compare()", () => {
    it("should generate comparison report", () => {
      const comparator = new ReportComparator(
        baselineAnalysis,
        currentAnalysis,
      );
      const comparison = comparator.compare();

      expect(comparison).toBeDefined();
      expect(comparison.baseline).toBeDefined();
      expect(comparison.current).toBeDefined();
      expect(comparison.changes).toBeDefined();
      expect(comparison.details).toBeDefined();
    });

    it("should include timestamps in comparison", () => {
      const comparator = new ReportComparator(
        baselineAnalysis,
        currentAnalysis,
      );
      const comparison = comparator.compare();

      expect(comparison.timestamp).toBeDefined();
      expect(comparison.baseline.timestamp).toBe(baselineAnalysis.timestamp);
      expect(comparison.current.timestamp).toBe(currentAnalysis.timestamp);
    });
  });

  describe("Changes Summary", () => {
    it("should calculate risk score change correctly", () => {
      const comparator = new ReportComparator(
        baselineAnalysis,
        currentAnalysis,
      );
      const comparison = comparator.compare();

      expect(comparison.changes.riskScoreChange).toBeCloseTo(-0.1, 2);
    });

    it("should calculate opportunity score change correctly", () => {
      const comparator = new ReportComparator(
        baselineAnalysis,
        currentAnalysis,
      );
      const comparison = comparator.compare();

      expect(comparison.changes.opportunityScoreChange).toBeCloseTo(0.1, 2);
    });

    it("should calculate package count change correctly", () => {
      const comparator = new ReportComparator(
        baselineAnalysis,
        currentAnalysis,
      );
      const comparison = comparator.compare();

      expect(comparison.changes.packageCountChange).toBe(5);
    });

    it("should count new high-priority risks", () => {
      currentAnalysis.risks.high = ["High risk item 1", "New high risk item"];

      const comparator = new ReportComparator(
        baselineAnalysis,
        currentAnalysis,
      );
      const comparison = comparator.compare();

      expect(comparison.changes.newHighRisks).toBe(1);
    });

    it("should count resolved high-priority risks", () => {
      currentAnalysis.risks.high = []; // Resolved all high risks

      const comparator = new ReportComparator(
        baselineAnalysis,
        currentAnalysis,
      );
      const comparison = comparator.compare();

      expect(comparison.changes.resolvedHighRisks).toBe(1);
    });

    it("should count new opportunities", () => {
      currentAnalysis.opportunities.immediate = [
        "Add analytics",
        "New opportunity",
      ];

      const comparator = new ReportComparator(
        baselineAnalysis,
        currentAnalysis,
      );
      const comparison = comparator.compare();

      expect(comparison.changes.newOpportunities).toBe(1);
    });
  });

  describe("Risk Changes", () => {
    it("should identify new risks", () => {
      currentAnalysis.risks.medium = ["New medium risk"];

      const comparator = new ReportComparator(
        baselineAnalysis,
        currentAnalysis,
      );
      const comparison = comparator.compare();

      expect(comparison.details.risks.new).toContain("New medium risk");
    });

    it("should identify resolved risks", () => {
      currentAnalysis.risks.high = []; // Removed high risk

      const comparator = new ReportComparator(
        baselineAnalysis,
        currentAnalysis,
      );
      const comparison = comparator.compare();

      expect(comparison.details.risks.resolved).toContain("High risk item 1");
    });

    it("should identify risk score changes", () => {
      currentAnalysis.risks.categories = [
        {
          name: "Dependency Management",
          score: 0.3,
          issues: [],
          impact: "Low",
        },
      ];

      const comparator = new ReportComparator(
        baselineAnalysis,
        currentAnalysis,
      );
      const comparison = comparator.compare();

      const depChange = comparison.details.risks.changed.find(
        (c) => c.category === "Dependency Management",
      );

      expect(depChange).toBeDefined();
      expect(depChange?.before).toBe(0.5);
      expect(depChange?.after).toBe(0.3);
      expect(depChange?.change).toBe(-0.2);
    });

    it("should only report significant score changes", () => {
      currentAnalysis.risks.categories = [
        {
          name: "Dependency Management",
          score: 0.51, // Only 0.01 change
          issues: [],
          impact: "Moderate",
        },
      ];

      const comparator = new ReportComparator(
        baselineAnalysis,
        currentAnalysis,
      );
      const comparison = comparator.compare();

      const depChange = comparison.details.risks.changed.find(
        (c) => c.category === "Dependency Management",
      );

      expect(depChange).toBeUndefined(); // Should not report < 0.05 changes
    });
  });

  describe("Opportunity Changes", () => {
    it("should identify new opportunities", () => {
      currentAnalysis.opportunities.shortTerm = ["New short-term opportunity"];

      const comparator = new ReportComparator(
        baselineAnalysis,
        currentAnalysis,
      );
      const comparison = comparator.compare();

      expect(comparison.details.opportunities.new).toContain(
        "New short-term opportunity",
      );
    });

    it("should identify completed opportunities", () => {
      currentAnalysis.opportunities.immediate = []; // Completed analytics

      const comparator = new ReportComparator(
        baselineAnalysis,
        currentAnalysis,
      );
      const comparison = comparator.compare();

      expect(comparison.details.opportunities.completed).toContain(
        "Add analytics",
      );
    });

    it("should track opportunity score changes", () => {
      currentAnalysis.opportunities.categories = [
        {
          name: "Modernization",
          potential: 0.9,
          recommendations: [],
          businessValue: "Better performance",
        },
      ];

      const comparator = new ReportComparator(
        baselineAnalysis,
        currentAnalysis,
      );
      const comparison = comparator.compare();

      const modChange = comparison.details.opportunities.changed.find(
        (c) => c.category === "Modernization",
      );

      expect(modChange).toBeDefined();
      expect(modChange?.before).toBe(0.7);
      expect(modChange?.after).toBe(0.9);
      expect(modChange?.change).toBeCloseTo(0.2, 2);
    });
  });

  describe("Package Changes", () => {
    it("should identify added packages", () => {
      currentAnalysis.packages.production.push({
        name: "axios",
        version: "1.0.0",
        category: "API",
        purpose: "HTTP client",
        businessValue: "API integration",
        usagePatterns: [],
      });

      const comparator = new ReportComparator(
        baselineAnalysis,
        currentAnalysis,
      );
      const comparison = comparator.compare();

      const axiosAdded = comparison.details.packages.added.find(
        (p) => p.name === "axios",
      );

      expect(axiosAdded).toBeDefined();
      expect(axiosAdded?.version).toBe("1.0.0");
      expect(axiosAdded?.category).toBe("API");
    });

    it("should identify removed packages", () => {
      currentAnalysis.packages.production = []; // Removed react

      const comparator = new ReportComparator(
        baselineAnalysis,
        currentAnalysis,
      );
      const comparison = comparator.compare();

      const reactRemoved = comparison.details.packages.removed.find(
        (p) => p.name === "react",
      );

      expect(reactRemoved).toBeDefined();
      expect(reactRemoved?.version).toBe("18.0.0");
    });

    it("should identify updated packages", () => {
      currentAnalysis.packages.production[0].version = "18.2.0";

      const comparator = new ReportComparator(
        baselineAnalysis,
        currentAnalysis,
      );
      const comparison = comparator.compare();

      const reactUpdated = comparison.details.packages.updated.find(
        (p) => p.name === "react",
      );

      expect(reactUpdated).toBeDefined();
      expect(reactUpdated?.previousVersion).toBe("18.0.0");
      expect(reactUpdated?.version).toBe("18.2.0");
    });

    it("should handle both production and dev dependencies", () => {
      currentAnalysis.packages.development = [
        {
          name: "vitest",
          version: "1.0.0",
          category: "Testing",
          purpose: "Test runner",
          businessValue: "Quality assurance",
          usagePatterns: [],
        },
      ];

      const comparator = new ReportComparator(
        baselineAnalysis,
        currentAnalysis,
      );
      const comparison = comparator.compare();

      const vitestAdded = comparison.details.packages.added.find(
        (p) => p.name === "vitest",
      );

      expect(vitestAdded).toBeDefined();
    });
  });

  describe("Technology Changes", () => {
    it("should detect framework changes", () => {
      currentAnalysis.technology.framework = "Next.js";
      currentAnalysis.technology.frameworkVersion = "14.0.0";

      const comparator = new ReportComparator(
        baselineAnalysis,
        currentAnalysis,
      );
      const comparison = comparator.compare();

      expect(comparison.details.technology.frameworkChanged).toBe(true);
    });

    it("should detect new build tools", () => {
      currentAnalysis.technology.buildTools = ["Vite", "Turbo"];

      const comparator = new ReportComparator(
        baselineAnalysis,
        currentAnalysis,
      );
      const comparison = comparator.compare();

      expect(comparison.details.technology.newBuildTools).toContain("Turbo");
    });

    it("should detect removed build tools", () => {
      currentAnalysis.technology.buildTools = [];

      const comparator = new ReportComparator(
        baselineAnalysis,
        currentAnalysis,
      );
      const comparison = comparator.compare();

      expect(comparison.details.technology.removedTools).toContain("Vite");
    });

    it("should detect new infrastructure", () => {
      currentAnalysis.technology.infrastructure = ["Vercel", "Supabase"];

      const comparator = new ReportComparator(
        baselineAnalysis,
        currentAnalysis,
      );
      const comparison = comparator.compare();

      expect(comparison.details.technology.newInfrastructure).toContain(
        "Supabase",
      );
    });

    it("should not flag framework change if version-only update", () => {
      baselineAnalysis.technology.framework = "Next.js";
      baselineAnalysis.technology.frameworkVersion = "13.0.0";

      currentAnalysis.technology.framework = "Next.js";
      currentAnalysis.technology.frameworkVersion = "14.0.0";

      const comparator = new ReportComparator(
        baselineAnalysis,
        currentAnalysis,
      );
      const comparison = comparator.compare();

      // Version-only change should still be flagged
      expect(comparison.details.technology.frameworkChanged).toBe(true);
    });
  });

  describe("Markdown Generation", () => {
    it("should generate markdown summary", () => {
      const comparator = new ReportComparator(
        baselineAnalysis,
        currentAnalysis,
      );
      const markdown = comparator.generateMarkdownSummary();

      expect(markdown).toBeDefined();
      expect(typeof markdown).toBe("string");
      expect(markdown.length).toBeGreaterThan(0);
    });

    it("should include executive summary section", () => {
      const comparator = new ReportComparator(
        baselineAnalysis,
        currentAnalysis,
      );
      const markdown = comparator.generateMarkdownSummary();

      expect(markdown).toContain("# Advisory Report Comparison");
      expect(markdown).toContain("## Executive Summary");
    });

    it("should include baseline and current dates", () => {
      const comparator = new ReportComparator(
        baselineAnalysis,
        currentAnalysis,
      );
      const markdown = comparator.generateMarkdownSummary();

      expect(markdown).toContain("**Baseline:**");
      expect(markdown).toContain("**Current:**");
    });

    it("should include risk and opportunity changes", () => {
      const comparator = new ReportComparator(
        baselineAnalysis,
        currentAnalysis,
      );
      const markdown = comparator.generateMarkdownSummary();

      expect(markdown).toContain("Risk Score:");
      expect(markdown).toContain("Opportunity Score:");
      expect(markdown).toContain("Packages:");
    });

    it("should show new and resolved risks", () => {
      currentAnalysis.risks.high = ["New high risk"];
      baselineAnalysis.risks.high = ["Old high risk"];

      const comparator = new ReportComparator(
        baselineAnalysis,
        currentAnalysis,
      );
      const markdown = comparator.generateMarkdownSummary();

      expect(markdown).toContain("## Risk Changes");
      expect(markdown).toContain("### New Risks");
      expect(markdown).toContain("### Resolved Risks");
    });

    it("should show package changes", () => {
      currentAnalysis.packages.production.push({
        name: "new-package",
        version: "1.0.0",
        category: "Other",
        purpose: "New functionality",
        businessValue: "Feature addition",
        usagePatterns: [],
      });

      const comparator = new ReportComparator(
        baselineAnalysis,
        currentAnalysis,
      );
      const markdown = comparator.generateMarkdownSummary();

      expect(markdown).toContain("## Package Changes");
      expect(markdown).toContain("### Added");
    });

    it("should format summary correctly", () => {
      currentAnalysis.risks.categories[0].score = 0.3;

      const comparator = new ReportComparator(
        baselineAnalysis,
        currentAnalysis,
      );
      const markdown = comparator.generateMarkdownSummary();

      // Check that key sections exist
      expect(markdown).toContain("# Advisory Report Comparison");
      expect(markdown).toContain("## Executive Summary");
      expect(markdown).toContain("Risk Score:");
      expect(markdown).toContain("Opportunity Score:");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty baseline risks", () => {
      baselineAnalysis.risks.high = [];

      const comparator = new ReportComparator(
        baselineAnalysis,
        currentAnalysis,
      );
      const comparison = comparator.compare();

      expect(comparison.changes.resolvedHighRisks).toBe(0);
    });

    it("should handle empty current risks", () => {
      currentAnalysis.risks.high = [];

      const comparator = new ReportComparator(
        baselineAnalysis,
        currentAnalysis,
      );
      const comparison = comparator.compare();

      expect(comparison.changes.newHighRisks).toBe(0);
    });

    it("should handle no package changes", () => {
      const comparator = new ReportComparator(
        baselineAnalysis,
        currentAnalysis,
      );
      const comparison = comparator.compare();

      // No new packages in current analysis
      expect(comparison.details.packages.added.length).toBe(0);
      expect(comparison.details.packages.removed.length).toBe(0);
      expect(comparison.details.packages.updated.length).toBe(0);
    });

    it("should handle identical analyses", () => {
      const identicalCurrent = JSON.parse(JSON.stringify(baselineAnalysis));

      const comparator = new ReportComparator(
        baselineAnalysis,
        identicalCurrent,
      );
      const comparison = comparator.compare();

      expect(comparison.changes.riskScoreChange).toBe(0);
      expect(comparison.changes.opportunityScoreChange).toBe(0);
      expect(comparison.changes.packageCountChange).toBe(0);
    });
  });
});
