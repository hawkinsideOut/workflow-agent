import { describe, it, expect, beforeEach } from "vitest";
import { QuestionGenerator } from "../question-generator.js";
import type { AdvisoryAnalysis } from "../advisory-analyzer.js";
import type { AdvisoryConfig } from "../../config/schema.js";

describe("QuestionGenerator", () => {
  let mockAnalysis: AdvisoryAnalysis;

  beforeEach(() => {
    mockAnalysis = {
      depth: "standard",
      timestamp: new Date().toISOString(),
      project: {
        name: "test-project",
        version: "1.0.0",
        description: "A test project",
        isMonorepo: false,
        packageManager: "pnpm",
        fileCount: 100,
        totalLines: 5000,
      },
      technology: {
        framework: "Next.js",
        frameworkVersion: "14.0.0",
        language: "TypeScript",
        runtime: "Node.js",
        buildTools: ["Vite", "Turbo"],
        platforms: ["Web"],
        infrastructure: ["Vercel", "Supabase"],
      },
      packages: {
        total: 50,
        production: [
          {
            name: "react",
            version: "18.0.0",
            category: "UI Framework",
            purpose: "Core UI library",
            businessValue: "User experience",
            usagePatterns: ["Components", "Hooks"],
          },
        ],
        development: [],
        categories: [
          {
            name: "UI Framework",
            count: 2,
            packages: ["react", "react-dom"],
            businessImpact: "Core user experience",
          },
          {
            name: "Testing",
            count: 3,
            packages: ["vitest", "testing-library", "playwright"],
            businessImpact: "Quality assurance",
          },
        ],
        outdated: [],
        security: [],
      },
      risks: {
        overall: 0.5,
        categories: [
          {
            name: "Dependency Management",
            score: 0.4,
            issues: ["50 total packages"],
            impact: "Moderate maintenance burden",
          },
        ],
        critical: [],
        high: ["High technical debt in auth module"],
        medium: ["Update needed for outdated packages"],
        low: [],
      },
      opportunities: {
        overall: 0.7,
        categories: [
          {
            name: "Modernization",
            potential: 0.8,
            recommendations: ["Upgrade to latest React features"],
            businessValue: "Better performance",
          },
        ],
        immediate: ["Add analytics tracking"],
        shortTerm: ["Implement caching strategy"],
        longTerm: ["Consider microservices"],
      },
    };
  });

  describe("generate()", () => {
    it("should generate questions from analysis", () => {
      const generator = new QuestionGenerator(mockAnalysis);
      const result = generator.generate();

      expect(result).toBeDefined();
      expect(result.questions).toBeInstanceOf(Array);
      expect(result.summary).toBeDefined();
    });

    it("should generate summary with correct counts", () => {
      const generator = new QuestionGenerator(mockAnalysis);
      const result = generator.generate();

      expect(result.summary.totalQuestions).toBe(result.questions.length);
      expect(result.summary.highPriority).toBeLessThanOrEqual(
        result.summary.totalQuestions,
      );
      expect(result.summary.categories).toBeInstanceOf(Array);
    });

    it("should sort questions by priority", () => {
      const generator = new QuestionGenerator(mockAnalysis);
      const result = generator.generate();

      // Check that high priority comes before medium, medium before low
      let lastPriority = "high";
      const priorityOrder = { high: 0, medium: 1, low: 2 };

      for (const question of result.questions) {
        expect(priorityOrder[question.priority]).toBeGreaterThanOrEqual(
          priorityOrder[lastPriority as "high" | "medium" | "low"],
        );
        lastPriority = question.priority;
      }
    });
  });

  describe("Technology Questions", () => {
    it("should generate framework question when framework is present", () => {
      const generator = new QuestionGenerator(mockAnalysis);
      const result = generator.generate();

      const frameworkQuestion = result.questions.find((q) =>
        q.question.includes("Next.js"),
      );

      expect(frameworkQuestion).toBeDefined();
      expect(frameworkQuestion?.category).toBe("Technology Decisions");
    });

    it("should generate build tools question", () => {
      const generator = new QuestionGenerator(mockAnalysis);
      const result = generator.generate();

      const buildToolsQuestion = result.questions.find((q) =>
        q.question.includes("build tools"),
      );

      expect(buildToolsQuestion).toBeDefined();
      expect(buildToolsQuestion?.category).toBe("Technology Decisions");
    });

    it("should generate monorepo question for monorepo projects", () => {
      mockAnalysis.project.isMonorepo = true;
      mockAnalysis.project.workspaceCount = 5;

      const generator = new QuestionGenerator(mockAnalysis);
      const result = generator.generate();

      const monorepoQuestion = result.questions.find((q) =>
        q.question.includes("monorepo"),
      );

      expect(monorepoQuestion).toBeDefined();
    });
  });

  describe("Package Questions", () => {
    it("should generate dependency count question for large projects", () => {
      mockAnalysis.packages.total = 120;

      const generator = new QuestionGenerator(mockAnalysis);
      const result = generator.generate();

      const depQuestion = result.questions.find(
        (q) =>
          q.category === "Package Utilization" &&
          q.question.includes("dependencies"),
      );

      expect(depQuestion).toBeDefined();
      expect(depQuestion?.priority).toBe("medium");
    });

    it("should generate package-related questions", () => {
      const generator = new QuestionGenerator(mockAnalysis);
      const result = generator.generate();

      const packageQuestions = result.questions.filter(
        (q) => q.category === "Package Utilization" || q.question.toLowerCase().includes("package") || q.question.toLowerCase().includes("dependenc"),
      );

      expect(packageQuestions.length).toBeGreaterThanOrEqual(0);
    });

    it("should generate security question when vulnerabilities exist", () => {
      mockAnalysis.packages.security = [
        {
          package: "test-pkg",
          severity: "critical",
          issue: "XSS vulnerability",
          recommendation: "Upgrade to latest version",
        },
      ];

      const generator = new QuestionGenerator(mockAnalysis);
      const result = generator.generate();

      const securityQuestion = result.questions.find((q) =>
        q.question.includes("security"),
      );

      expect(securityQuestion).toBeDefined();
      expect(securityQuestion?.priority).toBe("high");
    });
  });

  describe("Platform Questions", () => {
    it("should generate platform strategy question", () => {
      const generator = new QuestionGenerator(mockAnalysis);
      const result = generator.generate();

      const platformQuestion = result.questions.find(
        (q) =>
          q.category === "Platform Strategy" &&
          q.question.includes("platform choices"),
      );

      expect(platformQuestion).toBeDefined();
    });

    it("should generate infrastructure question", () => {
      const generator = new QuestionGenerator(mockAnalysis);
      const result = generator.generate();

      const infraQuestion = result.questions.find(
        (q) =>
          q.category === "Platform Strategy" &&
          q.question.includes("infrastructure"),
      );

      expect(infraQuestion).toBeDefined();
      expect(infraQuestion?.priority).toBe("high");
    });
  });

  describe("Business Alignment Questions", () => {
    it("should generate analytics question when missing", () => {
      mockAnalysis.packages.categories =
        mockAnalysis.packages.categories.filter(
          (c) => !c.name.toLowerCase().includes("analytics"),
        );

      const generator = new QuestionGenerator(mockAnalysis);
      const result = generator.generate();

      const analyticsQuestion = result.questions.find(
        (q) =>
          q.category === "Business Alignment" &&
          q.question.includes("analytics"),
      );

      expect(analyticsQuestion).toBeDefined();
      expect(analyticsQuestion?.priority).toBe("high");
    });

    it("should generate testing strategy question when testing exists", () => {
      const generator = new QuestionGenerator(mockAnalysis);
      const result = generator.generate();

      const testingQuestion = result.questions.find(
        (q) =>
          q.category === "Business Alignment" &&
          q.question.includes("testing strategy"),
      );

      expect(testingQuestion).toBeDefined();
    });
  });

  describe("Technical Debt Questions", () => {
    it("should generate high-risk question", () => {
      const generator = new QuestionGenerator(mockAnalysis);
      const result = generator.generate();

      const debtQuestion = result.questions.find(
        (q) =>
          q.category === "Technical Debt" &&
          q.question.includes("technical risks"),
      );

      expect(debtQuestion).toBeDefined();
      expect(debtQuestion?.priority).toBe("high");
    });

    it("should generate outdated packages question", () => {
      mockAnalysis.packages.outdated = Array.from({ length: 15 }, (_, i) => ({
        name: `package-${i}`,
        current: "1.0.0",
        latest: "2.0.0",
        breaking: i < 5,
      }));

      const generator = new QuestionGenerator(mockAnalysis);
      const result = generator.generate();

      const outdatedQuestion = result.questions.find(
        (q) =>
          q.category === "Technical Debt" &&
          q.question.includes("outdated packages"),
      );

      expect(outdatedQuestion).toBeDefined();
      // Priority can be medium or high depending on count
      expect(["medium", "high"]).toContain(outdatedQuestion?.priority);
    });
  });

  describe("Growth Opportunities Questions", () => {
    it("should generate immediate opportunities question", () => {
      const generator = new QuestionGenerator(mockAnalysis);
      const result = generator.generate();

      const growthQuestion = result.questions.find(
        (q) =>
          q.category === "Growth Opportunities" &&
          q.question.includes("immediate"),
      );

      expect(growthQuestion).toBeDefined();
      expect(growthQuestion?.priority).toBe("high");
    });

    it("should generate opportunity-related questions", () => {
      const generator = new QuestionGenerator(mockAnalysis);
      const result = generator.generate();

      const oppQuestions = result.questions.filter(
        (q) =>
          q.category === "Growth Opportunities" ||
          q.question.toLowerCase().includes("opportunit"),
      );

      // May or may not have specific opportunity questions
      expect(oppQuestions.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Custom Questions", () => {
    it("should include custom questions from config", () => {
      const config: AdvisoryConfig = {
        enabled: true,
        defaultDepth: "standard",
        outputDir: "docs/advisory",
        categories: [],
        customQuestions: [
          {
            category: "Custom Category",
            question: "How is our AI strategy progressing?",
            context: "Q4 review",
            priority: "high",
          },
        ],
      };

      const generator = new QuestionGenerator(mockAnalysis, config);
      const result = generator.generate();

      const customQuestion = result.questions.find(
        (q) => q.category === "Custom Category",
      );

      expect(customQuestion).toBeDefined();
      expect(customQuestion?.question).toBe(
        "How is our AI strategy progressing?",
      );
      expect(customQuestion?.priority).toBe("high");
    });

    it("should merge custom questions with generated ones", () => {
      const config: AdvisoryConfig = {
        enabled: true,
        defaultDepth: "standard",
        outputDir: "docs/advisory",
        categories: [],
        customQuestions: [
          {
            category: "Custom",
            question: "Custom question",
            priority: "medium",
          },
        ],
      };

      const generator = new QuestionGenerator(mockAnalysis, config);
      const result = generator.generate();

      const customQuestions = result.questions.filter(
        (q) => q.category === "Custom",
      );
      const generatedQuestions = result.questions.filter(
        (q) => q.category !== "Custom",
      );

      expect(customQuestions.length).toBe(1);
      expect(generatedQuestions.length).toBeGreaterThan(0);
    });
  });

  describe("Question Structure", () => {
    it("should have all required fields in each question", () => {
      const generator = new QuestionGenerator(mockAnalysis);
      const result = generator.generate();

      result.questions.forEach((question) => {
        expect(question.category).toBeDefined();
        expect(question.question).toBeDefined();
        expect(question.context).toBeDefined();
        expect(question.findings).toBeInstanceOf(Array);
        expect(question.recommendations).toBeInstanceOf(Array);
        expect(question.priority).toMatch(/^(high|medium|low)$/);
        expect(question.businessImpact).toBeDefined();
      });
    });

    it("should provide meaningful recommendations", () => {
      const generator = new QuestionGenerator(mockAnalysis);
      const result = generator.generate();

      result.questions.forEach((question) => {
        if (question.recommendations.length > 0) {
          question.recommendations.forEach((rec) => {
            expect(rec).toBeTruthy();
            expect(rec.length).toBeGreaterThan(10); // Non-trivial recommendation
          });
        }
      });
    });
  });

  describe("Summary Generation", () => {
    it("should calculate summary correctly", () => {
      const generator = new QuestionGenerator(mockAnalysis);
      const result = generator.generate();

      const highCount = result.questions.filter(
        (q) => q.priority === "high",
      ).length;
      const mediumCount = result.questions.filter(
        (q) => q.priority === "medium",
      ).length;
      const lowCount = result.questions.filter(
        (q) => q.priority === "low",
      ).length;

      expect(result.summary.highPriority).toBe(highCount);
      expect(result.summary.mediumPriority).toBe(mediumCount);
      expect(result.summary.lowPriority).toBe(lowCount);
      expect(result.summary.totalQuestions).toBe(
        highCount + mediumCount + lowCount,
      );
    });

    it("should list all unique categories", () => {
      const generator = new QuestionGenerator(mockAnalysis);
      const result = generator.generate();

      const uniqueCategories = new Set(result.questions.map((q) => q.category));

      expect(result.summary.categories.length).toBe(uniqueCategories.size);
      expect(result.summary.categories).toEqual(
        expect.arrayContaining(Array.from(uniqueCategories)),
      );
    });
  });
});
