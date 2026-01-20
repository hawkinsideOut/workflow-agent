import { describe, it, expect, beforeEach, vi } from "vitest";
import { AdvisoryAnalyzer } from "../advisory-analyzer.js";
import type { AdvisoryOptions } from "../advisory-analyzer.js";
import { vol } from "memfs";

vi.mock("fs");
vi.mock("fs/promises");

// TODO: Fix memfs mocking - these tests need proper setup for memfs to work with vitest
describe.skip("AdvisoryAnalyzer", () => {
  beforeEach(() => {
    vol.reset();
  });

  describe("Constructor", () => {
    it("should create analyzer with valid options", () => {
      const options: AdvisoryOptions = {
        depth: "quick",
        cwd: "/test/project",
      };

      const analyzer = new AdvisoryAnalyzer(options);
      expect(analyzer).toBeDefined();
    });
  });

  describe("analyze()", () => {
    it("should run executive analysis successfully", async () => {
      // Setup mock package.json
      vol.fromJSON({
        "/test/project/package.json": JSON.stringify({
          name: "test-project",
          version: "1.0.0",
          description: "Test project",
          dependencies: {
            react: "^18.0.0",
            next: "^14.0.0",
          },
          devDependencies: {
            typescript: "^5.0.0",
            vitest: "^1.0.0",
          },
        }),
      });

      const options: AdvisoryOptions = {
        depth: "executive",
        cwd: "/test/project",
      };

      const analyzer = new AdvisoryAnalyzer(options);
      const result = await analyzer.analyze();

      expect(result).toBeDefined();
      expect(result.depth).toBe("executive");
      expect(result.project).toBeDefined();
      expect(result.project.name).toBe("test-project");
      expect(result.technology).toBeDefined();
      expect(result.packages).toBeDefined();
      expect(result.risks).toBeDefined();
      expect(result.opportunities).toBeDefined();
    });

    it("should include architecture in standard depth", async () => {
      vol.fromJSON({
        "/test/project/package.json": JSON.stringify({
          name: "test-project",
          version: "1.0.0",
          dependencies: { react: "^18.0.0" },
        }),
        "/test/project/src/components/Button.tsx":
          "export const Button = () => {}",
        "/test/project/src/pages/index.tsx":
          "export default function Home() {}",
      });

      const options: AdvisoryOptions = {
        depth: "standard",
        cwd: "/test/project",
      };

      const analyzer = new AdvisoryAnalyzer(options);
      const result = await analyzer.analyze();

      expect(result.architecture).toBeDefined();
      expect(result.architecture?.pattern).toBeDefined();
      expect(result.architecture?.layers).toBeInstanceOf(Array);
    });

    it("should include code patterns in comprehensive depth", async () => {
      vol.fromJSON({
        "/test/project/package.json": JSON.stringify({
          name: "test-project",
          version: "1.0.0",
          dependencies: { react: "^18.0.0" },
        }),
        "/test/project/src/components/Button.tsx":
          "export const Button = () => {}",
        "/test/project/src/components/Input.tsx":
          "export const Input = () => {}",
      });

      const options: AdvisoryOptions = {
        depth: "comprehensive",
        cwd: "/test/project",
      };

      const analyzer = new AdvisoryAnalyzer(options);
      const result = await analyzer.analyze();

      expect(result.codePatterns).toBeDefined();
      expect(result.codePatterns?.components).toBeDefined();
      expect(result.codePatterns?.tests).toBeDefined();
    });
  });

  describe("Risk Assessment", () => {
    it("should identify high risk for large dependency count", async () => {
      const largeDeps: Record<string, string> = {};
      for (let i = 0; i < 150; i++) {
        largeDeps[`package-${i}`] = "^1.0.0";
      }

      vol.fromJSON({
        "/test/project/package.json": JSON.stringify({
          name: "test-project",
          version: "1.0.0",
          dependencies: largeDeps,
        }),
      });

      const options: AdvisoryOptions = {
        depth: "quick",
        cwd: "/test/project",
      };

      const analyzer = new AdvisoryAnalyzer(options);
      const result = await analyzer.analyze();

      expect(result.risks.overall).toBeGreaterThan(0);
      expect(result.packages.total).toBe(150);
    });

    it("should categorize risks correctly", async () => {
      vol.fromJSON({
        "/test/project/package.json": JSON.stringify({
          name: "large-project",
          version: "1.0.0",
          dependencies: {},
        }),
      });

      const options: AdvisoryOptions = {
        depth: "quick",
        cwd: "/test/project",
      };

      const analyzer = new AdvisoryAnalyzer(options);
      const result = await analyzer.analyze();

      expect(result.risks.categories).toBeInstanceOf(Array);
      expect(result.risks.critical).toBeInstanceOf(Array);
      expect(result.risks.high).toBeInstanceOf(Array);
      expect(result.risks.medium).toBeInstanceOf(Array);
      expect(result.risks.low).toBeInstanceOf(Array);
    });
  });

  describe("Opportunity Assessment", () => {
    it("should identify opportunities for modernization", async () => {
      vol.fromJSON({
        "/test/project/package.json": JSON.stringify({
          name: "test-project",
          version: "1.0.0",
          dependencies: {
            react: "^18.0.0",
            next: "^14.0.0",
          },
        }),
      });

      const options: AdvisoryOptions = {
        depth: "quick",
        cwd: "/test/project",
      };

      const analyzer = new AdvisoryAnalyzer(options);
      const result = await analyzer.analyze();

      expect(result.opportunities.overall).toBeGreaterThan(0);
      expect(result.opportunities.categories).toBeInstanceOf(Array);
    });

    it("should categorize opportunities by timeline", async () => {
      vol.fromJSON({
        "/test/project/package.json": JSON.stringify({
          name: "test-project",
          version: "1.0.0",
          dependencies: { react: "^18.0.0" },
        }),
      });

      const options: AdvisoryOptions = {
        depth: "quick",
        cwd: "/test/project",
      };

      const analyzer = new AdvisoryAnalyzer(options);
      const result = await analyzer.analyze();

      expect(result.opportunities.immediate).toBeInstanceOf(Array);
      expect(result.opportunities.shortTerm).toBeInstanceOf(Array);
      expect(result.opportunities.longTerm).toBeInstanceOf(Array);
    });
  });

  describe("Package Analysis", () => {
    it("should categorize dependencies correctly", async () => {
      vol.fromJSON({
        "/test/project/package.json": JSON.stringify({
          name: "test-project",
          version: "1.0.0",
          dependencies: {
            react: "^18.0.0",
            "react-router": "^6.0.0",
            axios: "^1.0.0",
            prisma: "^5.0.0",
          },
          devDependencies: {
            typescript: "^5.0.0",
            vitest: "^1.0.0",
            eslint: "^8.0.0",
          },
        }),
      });

      const options: AdvisoryOptions = {
        depth: "quick",
        cwd: "/test/project",
      };

      const analyzer = new AdvisoryAnalyzer(options);
      const result = await analyzer.analyze();

      expect(result.packages.categories).toBeInstanceOf(Array);
      expect(result.packages.categories.length).toBeGreaterThan(0);

      // Should have UI Framework category
      const uiCategory = result.packages.categories.find((c) =>
        c.name.includes("UI"),
      );
      expect(uiCategory).toBeDefined();

      // Should have Testing category
      const testCategory = result.packages.categories.find((c) =>
        c.name.includes("Testing"),
      );
      expect(testCategory).toBeDefined();
    });

    it("should provide business value for each dependency", async () => {
      vol.fromJSON({
        "/test/project/package.json": JSON.stringify({
          name: "test-project",
          version: "1.0.0",
          dependencies: {
            react: "^18.0.0",
            next: "^14.0.0",
          },
        }),
      });

      const options: AdvisoryOptions = {
        depth: "quick",
        cwd: "/test/project",
      };

      const analyzer = new AdvisoryAnalyzer(options);
      const result = await analyzer.analyze();

      expect(result.packages.production.length).toBeGreaterThan(0);

      result.packages.production.forEach((pkg) => {
        expect(pkg.name).toBeDefined();
        expect(pkg.version).toBeDefined();
        expect(pkg.category).toBeDefined();
        expect(pkg.purpose).toBeDefined();
        expect(pkg.businessValue).toBeDefined();
        expect(pkg.usagePatterns).toBeInstanceOf(Array);
      });
    });
  });

  describe("Technology Stack Detection", () => {
    it("should detect Next.js framework", async () => {
      vol.fromJSON({
        "/test/project/package.json": JSON.stringify({
          name: "test-project",
          version: "1.0.0",
          dependencies: {
            next: "^14.0.0",
            react: "^18.0.0",
          },
        }),
      });

      const options: AdvisoryOptions = {
        depth: "quick",
        cwd: "/test/project",
      };

      const analyzer = new AdvisoryAnalyzer(options);
      const result = await analyzer.analyze();

      expect(result.technology.framework).toBeDefined();
      // Framework detection may require actual file system checks
    });

    it("should detect TypeScript", async () => {
      vol.fromJSON({
        "/test/project/package.json": JSON.stringify({
          name: "test-project",
          version: "1.0.0",
          devDependencies: {
            typescript: "^5.0.0",
          },
        }),
      });

      const options: AdvisoryOptions = {
        depth: "quick",
        cwd: "/test/project",
      };

      const analyzer = new AdvisoryAnalyzer(options);
      const result = await analyzer.analyze();

      expect(result.technology.language).toBe("TypeScript");
    });

    it("should detect build tools", async () => {
      vol.fromJSON({
        "/test/project/package.json": JSON.stringify({
          name: "test-project",
          version: "1.0.0",
          devDependencies: {
            vite: "^5.0.0",
            turbo: "^1.0.0",
          },
        }),
      });

      const options: AdvisoryOptions = {
        depth: "quick",
        cwd: "/test/project",
      };

      const analyzer = new AdvisoryAnalyzer(options);
      const result = await analyzer.analyze();

      expect(result.technology.buildTools).toContain("Vite");
      expect(result.technology.buildTools).toContain("Turborepo");
    });
  });

  describe("Error Handling", () => {
    it("should throw error when package.json is missing", async () => {
      vol.fromJSON({});

      const options: AdvisoryOptions = {
        depth: "quick",
        cwd: "/test/project",
      };

      const analyzer = new AdvisoryAnalyzer(options);

      await expect(analyzer.analyze()).rejects.toThrow(
        "package.json not found",
      );
    });

    it("should handle malformed package.json", async () => {
      vol.fromJSON({
        "/test/project/package.json": "{ invalid json }",
      });

      const options: AdvisoryOptions = {
        depth: "quick",
        cwd: "/test/project",
      };

      const analyzer = new AdvisoryAnalyzer(options);

      await expect(analyzer.analyze()).rejects.toThrow();
    });
  });

  describe("Monorepo Detection", () => {
    it("should detect monorepo structure", async () => {
      vol.fromJSON({
        "/test/project/package.json": JSON.stringify({
          name: "test-monorepo",
          version: "1.0.0",
          workspaces: ["packages/*"],
        }),
        "/test/project/packages/app/package.json": JSON.stringify({
          name: "@test/app",
          version: "1.0.0",
        }),
        "/test/project/packages/utils/package.json": JSON.stringify({
          name: "@test/utils",
          version: "1.0.0",
        }),
      });

      const options: AdvisoryOptions = {
        depth: "quick",
        cwd: "/test/project",
      };

      const analyzer = new AdvisoryAnalyzer(options);
      const result = await analyzer.analyze();

      expect(result.project.isMonorepo).toBe(true);
      expect(result.project.workspaceCount).toBeDefined();
    });
  });
});
